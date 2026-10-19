"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { fichaPayloadSchema, type DiaFichaInput } from "@/lib/validators/ficha";

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
    .eq("id", alunoId)
    .eq("professional_id", user.id)
    .maybeSingle();

  if (!aluno) {
    throw new Error("Aluno não encontrado.");
  }

  // 1. Ficha
  const { data: ficha, error: erroFicha } = await supabase
    .from("fichas_treino")
    .insert({
      aluno_id: alunoId,
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
