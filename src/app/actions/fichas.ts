"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  alunoIdSchema,
  fichaIdSchema,
  fichaPayloadSchema,
  type DiaFichaInput,
} from "@/lib/validators/ficha";

/** Resultado das Server Actions de estado — nunca lançam exceção. */
export type ResultadoToggleFicha =
  | { sucesso: true; ativa: boolean }
  | { sucesso: false; erro: string };

/** Resultado da eliminação de uma ficha — nunca lança exceção. */
export type ResultadoDelecao =
  | { sucesso: true }
  | { sucesso: false; erro: string };

/** Resultado da duplicação — devolve o id da cópia criada. */
export type ResultadoDuplicacao =
  | { sucesso: true; fichaId: string }
  | { sucesso: false; erro: string };

/**
 * Cria uma ficha completa de forma relacional (sem transações simples via
 * RPC por agora, as inserções correm sequencialmente no servidor):
 *
 *   1. `fichas_treino` → devolve o `ficha_id`;
 *   2. `treino_dias` por cada dia → devolve o `dia_id`;
 *   3. `treino_itens` por cada exercício do dia.
 *
 * Se algo falhar a meio, a ficha é apagada em compensação — os dias e
 * itens já criados caem em cascata pelas FKs `on delete cascade`.
 *
 * @param alunoId  Aluno dono da ficha (verificado contra o profissional em sessão).
 * @param titulo   Título exibido na lista de fichas do aluno.
 * @param dias     Dias com os itens (séries, repetições, carga, descanso, ordem).
 * @returns `{ fichaId }` da ficha criada.
 */
export async function createFicha(
  alunoId: string,
  titulo: string,
  dias: DiaFichaInput[]
): Promise<{ fichaId: string }> {
  // O `alunoId` vem do cliente (URL da página) — validado como uuid antes
  // de qualquer consulta, para nunca lançar um filtro malformado.
  const alunoParseado = alunoIdSchema.safeParse(alunoId);

  if (!alunoParseado.success) {
    throw new Error("Aluno não encontrado.");
  }

  const parsed = fichaPayloadSchema.safeParse({ titulo, dias });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados da ficha inválidos.");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Sessão inválida. Termine a sessão e volte a entrar.");
  }

  // O RLS já restringe aos próprios alunos — verificação explícita para não
  // ligar uma ficha a um aluno de outro profissional.
  const { data: aluno } = await supabase
    .from("alunos")
    .select("id")
    .eq("id", alunoParseado.data)
    .eq("professional_id", user.id)
    .maybeSingle();

  if (!aluno) {
    throw new Error("Aluno não encontrado.");
  }

  // Os `exercicioId` vêm do cliente: só podem referenciar exercícios do
  // próprio profissional ou do catálogo global. A FK não valida a posse
  // (o RLS de treino_itens protege a escrita, mas não impede apontar para
  // o catálogo alheio), por isso a verificação é explícita aqui.
  const idsExercicios = [
    ...new Set(
      parsed.data.dias.flatMap((dia) => dia.itens.map((item) => item.exercicioId))
    ),
  ];

  const { data: exerciciosPermitidos } = await supabase
    .from("exercicios_catalogo")
    .select("id")
    .in("id", idsExercicios)
    .or(`professional_id.eq.${user.id},professional_id.is.null`);

  const conjuntoPermitidos = new Set(
    (exerciciosPermitidos ?? []).map((exercicio) => exercicio.id)
  );

  if (idsExercicios.some((id) => !conjuntoPermitidos.has(id))) {
    throw new Error(
      "Um dos exercícios não existe na sua biblioteca. Atualize a página e tente novamente."
    );
  }

  // 1. Ficha
  const { data: ficha, error: erroFicha } = await supabase
    .from("fichas_treino")
    .insert({
      aluno_id: alunoParseado.data,
      professional_id: user.id,
      titulo: parsed.data.titulo,
      ativa: false,
    })
    .select("id")
    .single();

  if (erroFicha || !ficha) {
    throw new Error(`Não foi possível criar a ficha: ${erroFicha?.message ?? "erro desconhecido."}`);
  }

  try {
    // 2. Dias e 3. Itens, sequencialmente
    for (const [indiceDia, dia] of parsed.data.dias.entries()) {
      const { data: diaCriado, error: erroDia } = await supabase
        .from("treino_dias")
        .insert({
          ficha_id: ficha.id,
          letra: dia.letra,
          nome_dia: dia.nome.length > 0 ? dia.nome : null,
          ordem: indiceDia,
        })
        .select("id")
        .single();

      if (erroDia || !diaCriado) {
        throw new Error(
          `Não foi possível criar o dia ${dia.letra}: ${erroDia?.message ?? "erro desconhecido."}`
        );
      }

      for (const item of dia.itens) {
        const { error: erroItem } = await supabase.from("treino_itens").insert({
          treino_dia_id: diaCriado.id,
          exercicio_id: item.exercicioId,
          series: item.series,
          repeticoes: item.repeticoes.length > 0 ? item.repeticoes : null,
          carga_sugerida: item.cargaSugerida.length > 0 ? item.cargaSugerida : null,
          descanso_segundos: item.descansoSegundos,
          ordem: item.ordem,
        });

        if (erroItem) {
          throw new Error(`Não foi possível guardar um dos exercícios: ${erroItem.message}`);
        }
      }
    }
  } catch (erro) {
    // Compensação: apaga a ficha; dias e itens caem em cascata.
    await supabase.from("fichas_treino").delete().eq("id", ficha.id);
    throw erro;
  }

  // Rota dinâmica: invalida as fichas de qualquer aluno (padrão [id]).
  revalidatePath("/dashboard/alunos/[id]/fichas", "page");

  return { fichaId: ficha.id };
}

/**
 * Alterna o estado `ativa` de uma ficha (ativar/desativar).
 *
 * Regra de negócio: **no máximo UMA ficha ativa por aluno** — ao ativar,
 * as outras fichas do mesmo aluno são desativadas primeiro, para que a
 * ficha que o aluno vê em `/aluno/{token}` seja sempre a esperada.
 *
 * A posse é verificada em duas etapas (ficha → aluno do profissional em
 * sessão), em defesa além da RLS `fichas_treino_acesso_profissional`.
 *
 * @param fichaId Id da ficha (uuid validado com `fichaIdSchema`).
 * @returns `{ sucesso: true, ativa }` ou `{ sucesso: false, erro }`.
 */
export async function toggleFichaAtiva(
  fichaId: string
): Promise<ResultadoToggleFicha> {
  const idParseado = fichaIdSchema.safeParse(fichaId);
  if (!idParseado.success) {
    return { sucesso: false, erro: "Ficha não encontrada." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      sucesso: false,
      erro: "Sessão inválida. Termine a sessão e volte a entrar.",
    };
  }

  const { data: ficha, error: erroFicha } = await supabase
    .from("fichas_treino")
    .select("id, ativa, aluno_id")
    .eq("id", idParseado.data)
    .maybeSingle();

  if (erroFicha) {
    return {
      sucesso: false,
      erro: `Não foi possível ler a ficha: ${erroFicha.message}`,
    };
  }
  // Mensagem genérica: não revelamos existência de fichas fora de posse.
  if (!ficha) {
    return { sucesso: false, erro: "Ficha não encontrada." };
  }

  const { data: aluno, error: erroAluno } = await supabase
    .from("alunos")
    .select("id")
    .eq("id", ficha.aluno_id)
    .eq("professional_id", user.id)
    .maybeSingle();

  if (erroAluno) {
    return {
      sucesso: false,
      erro: `Não foi possível verificar a posse da ficha: ${erroAluno.message}`,
    };
  }
  if (!aluno) {
    return { sucesso: false, erro: "Ficha não encontrada." };
  }

  const novoEstado = !ficha.ativa;

  // Ao ativar, desativa primeiro as outras fichas do mesmo aluno
  // (garante uma única ficha ativa por aluno).
  if (novoEstado) {
    const { error: erroDesativar } = await supabase
      .from("fichas_treino")
      .update({ ativa: false })
      .eq("aluno_id", ficha.aluno_id)
      .neq("id", ficha.id);

    if (erroDesativar) {
      return {
        sucesso: false,
        erro: `Não foi possível desativar as outras fichas: ${erroDesativar.message}`,
      };
    }
  }

  const { error: erroUpdate } = await supabase
    .from("fichas_treino")
    .update({ ativa: novoEstado })
    .eq("id", ficha.id);

  if (erroUpdate) {
    return {
      sucesso: false,
      erro: `Não foi possível atualizar a ficha: ${erroUpdate.message}`,
    };
  }

  // Rota dinâmica: passar o tipo "page" é obrigatório para paths com
  // segmentos dinâmicos (sem ele, o Next ignora a invalidação).
  revalidatePath("/dashboard/alunos/[id]/fichas", "page");
  return { sucesso: true, ativa: novoEstado };
}

/**
 * Elimina uma ficha de treino. As tabelas filhas `treino_dias` e
 * `treino_itens` apagam em cascata pelas FKs `on delete cascade`.
 *
 * A posse é verificada em duas etapas (ficha → aluno do profissional em
 * sessão), em defesa além da RLS `fichas_treino_acesso_profissional`.
 *
 * @param fichaId Id da ficha (uuid validado com `fichaIdSchema`).
 */
export async function deletarFicha(
  fichaId: string
): Promise<ResultadoDelecao> {
  const idParseado = fichaIdSchema.safeParse(fichaId);
  if (!idParseado.success) {
    return { sucesso: false, erro: "Ficha não encontrada." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      sucesso: false,
      erro: "Sessão inválida. Termine a sessão e volte a entrar.",
    };
  }

  const { data: ficha, error: erroFicha } = await supabase
    .from("fichas_treino")
    .select("id, aluno_id")
    .eq("id", idParseado.data)
    .maybeSingle();

  if (erroFicha) {
    return {
      sucesso: false,
      erro: `Não foi possível ler a ficha: ${erroFicha.message}`,
    };
  }
  // Mensagem genérica: não revelamos existência de fichas fora de posse.
  if (!ficha) {
    return { sucesso: false, erro: "Ficha não encontrada." };
  }

  const { data: aluno } = await supabase
    .from("alunos")
    .select("id")
    .eq("id", ficha.aluno_id)
    .eq("professional_id", user.id)
    .maybeSingle();

  if (!aluno) {
    return { sucesso: false, erro: "Ficha não encontrada." };
  }

  const { error: erroDelete } = await supabase
    .from("fichas_treino")
    .delete()
    .eq("id", ficha.id);

  if (erroDelete) {
    return {
      sucesso: false,
      erro: `Não foi possível eliminar a ficha: ${erroDelete.message}`,
    };
  }

  revalidatePath("/dashboard/alunos/[id]/fichas", "page");
  return { sucesso: true };
}

/**
 * Cria uma cópia exata de uma ficha (título, dias e itens) para o MESMO
 * aluno ou — opcionalmente — para `alunoDestinoId` (também do profissional
 * em sessão), com o sufixo "(Cópia)" no título.
 *
 * A cópia nasce sempre `ativa: false`: duplicar nunca troca a ficha que o
 * aluno vê em `/aluno/{token}` (regra de uma ficha ativa por aluno). Em
 * caso de falha a meio, a cópia é apagada em compensação — dias e itens
 * caem em cascata pelas FKs.
 *
 * @param fichaId        Id da ficha origem (uuid validado com `fichaIdSchema`).
 * @param alunoDestinoId Aluno destino opcional (validado com `alunoIdSchema`).
 */
export async function duplicarFicha(
  fichaId: string,
  alunoDestinoId?: string
): Promise<ResultadoDuplicacao> {
  const idParseado = fichaIdSchema.safeParse(fichaId);
  if (!idParseado.success) {
    return { sucesso: false, erro: "Ficha não encontrada." };
  }

  let destinoDesejado: string | null = null;
  if (alunoDestinoId !== undefined) {
    const destino = alunoIdSchema.safeParse(alunoDestinoId);
    if (!destino.success) {
      return { sucesso: false, erro: "Aluno destino inválido." };
    }
    destinoDesejado = destino.data;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      sucesso: false,
      erro: "Sessão inválida. Termine a sessão e volte a entrar.",
    };
  }

  const { data: ficha, error: erroFicha } = await supabase
    .from("fichas_treino")
    .select("id, titulo, aluno_id")
    .eq("id", idParseado.data)
    .maybeSingle();

  if (erroFicha) {
    return {
      sucesso: false,
      erro: `Não foi possível ler a ficha: ${erroFicha.message}`,
    };
  }
  if (!ficha) {
    return { sucesso: false, erro: "Ficha não encontrada." };
  }

  // Posse da ficha origem (ficha → aluno do profissional em sessão).
  const { data: alunoOrigem } = await supabase
    .from("alunos")
    .select("id")
    .eq("id", ficha.aluno_id)
    .eq("professional_id", user.id)
    .maybeSingle();

  if (!alunoOrigem) {
    return { sucesso: false, erro: "Ficha não encontrada." };
  }

  // Aluno destino: por omissão, o próprio aluno da ficha origem.
  const alunoFinal = destinoDesejado ?? ficha.aluno_id;
  if (alunoFinal !== ficha.aluno_id) {
    const { data: alunoDestino } = await supabase
      .from("alunos")
      .select("id")
      .eq("id", alunoFinal)
      .eq("professional_id", user.id)
      .maybeSingle();

    if (!alunoDestino) {
      return { sucesso: false, erro: "Aluno destino não encontrado." };
    }
  }

  // Estrutura origem: dias ordenados e itens agrupados por dia.
  const { data: dias, error: erroDias } = await supabase
    .from("treino_dias")
    .select("id, letra, nome_dia, ordem")
    .eq("ficha_id", ficha.id)
    .order("ordem");

  if (erroDias) {
    return {
      sucesso: false,
      erro: `Não foi possível ler os dias da ficha: ${erroDias.message}`,
    };
  }

  const diasOrdenados = [...(dias ?? [])].sort((a, b) => a.ordem - b.ordem);

  let itens: Array<{
    treino_dia_id: string;
    exercicio_id: string;
    series: number;
    repeticoes: string | null;
    carga_sugerida: string | null;
    descanso_segundos: number | null;
    ordem: number;
  }> = [];

  if (diasOrdenados.length > 0) {
    const { data: itensLidos, error: erroItens } = await supabase
      .from("treino_itens")
      .select(
        "treino_dia_id, exercicio_id, series, repeticoes, carga_sugerida, descanso_segundos, ordem"
      )
      .in("treino_dia_id", diasOrdenados.map((dia) => dia.id))
      .order("ordem");

    if (erroItens) {
      return {
        sucesso: false,
        erro: `Não foi possível ler os exercícios da ficha: ${erroItens.message}`,
      };
    }
    itens = itensLidos ?? [];
  }

  const itensPorDia = new Map<string, typeof itens>();
  for (const item of itens) {
    const atuais = itensPorDia.get(item.treino_dia_id) ?? [];
    atuais.push(item);
    itensPorDia.set(item.treino_dia_id, atuais);
  }

  // Evita títulos encavalitados: "X (Cópia) (Cópia)" → "X (Cópia)".
  const tituloBase = ficha.titulo.replace(/\s*\(Cópia\)\s*$/, "");
  const novoTitulo = `${tituloBase} (Cópia)`;

  const { data: novaFicha, error: erroNovaFicha } = await supabase
    .from("fichas_treino")
    .insert({
      aluno_id: alunoFinal,
      professional_id: user.id,
      titulo: novoTitulo,
      // A cópia é um rascunho: nunca substitui a ficha ativa do aluno.
      ativa: false,
    })
    .select("id")
    .single();

  if (erroNovaFicha || !novaFicha) {
    return {
      sucesso: false,
      erro: `Não foi possível criar a cópia: ${erroNovaFicha?.message ?? "erro desconhecido."}`,
    };
  }

  try {
    for (const [indiceDia, dia] of diasOrdenados.entries()) {
      const { data: novoDia, error: erroNovoDia } = await supabase
        .from("treino_dias")
        .insert({
          ficha_id: novaFicha.id,
          letra: dia.letra,
          nome_dia: dia.nome_dia,
          ordem: indiceDia,
        })
        .select("id")
        .single();

      if (erroNovoDia || !novoDia) {
        throw new Error(
          `Não foi possível copiar o dia ${dia.letra}: ${erroNovoDia?.message ?? "erro desconhecido."}`
        );
      }

      const itensDoDia = itensPorDia.get(dia.id) ?? [];
      if (itensDoDia.length > 0) {
        const { error: erroCopiarItens } = await supabase
          .from("treino_itens")
          .insert(
            itensDoDia.map((item, indiceItem) => ({
              treino_dia_id: novoDia.id,
              exercicio_id: item.exercicio_id,
              series: item.series,
              repeticoes: item.repeticoes,
              carga_sugerida: item.carga_sugerida,
              descanso_segundos: item.descanso_segundos,
              ordem: indiceItem,
            }))
          );

        if (erroCopiarItens) {
          throw new Error(
            `Não foi possível copiar os exercícios: ${erroCopiarItens.message}`
          );
        }
      }
    }
  } catch (erro) {
    // Compensação: apaga a cópia; dias e itens caem em cascata.
    await supabase.from("fichas_treino").delete().eq("id", novaFicha.id);
    return {
      sucesso: false,
      erro: erro instanceof Error ? erro.message : "Não foi possível duplicar a ficha.",
    };
  }

  revalidatePath("/dashboard/alunos/[id]/fichas", "page");
  return { sucesso: true, fichaId: novaFicha.id };
}
