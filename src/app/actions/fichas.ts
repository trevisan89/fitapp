"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  alunoIdSchema,
  fichaPayloadSchema,
  type DiaFichaInput,
} from "@/lib/validators/ficha";

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
  revalidatePath("/dashboard/alunos/[id]/fichas");

  return { fichaId: ficha.id };
}
