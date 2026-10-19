"use server";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  registrarLogSchema,
  tokenAlunoSchema,
  type RegistrarLogInput,
} from "@/lib/validators/execucao";
import type { Database } from "@/types/database.types";
import type { DiaTreinoAluno, TreinoAluno } from "@/types/treino-aluno";

/**
 * Cliente para os dados do WebApp do aluno: service role (bypass RLS — a
 * rota não tem sessão e as políticas são `to authenticated`). Sem a chave
 * configurada, cai no cliente anônimo (só devolve dados se existirem
 * políticas `anon` por token — migração futura).
 */
async function clienteDadosAluno(): Promise<SupabaseClient<Database>> {
  const servico = createServiceClient();
  if (servico) return servico;

  return await createClient();
}

/**
 * Resolve o aluno pelo `token_acesso` (uuid) — só se estiver ativo
 * (`ativo = false` = acesso revogado).
 */
async function alunoPorToken(supabase: SupabaseClient<Database>, token: string) {
  const { data } = await supabase
    .from("alunos")
    .select("id, nome, ativo")
    .eq("token_acesso", token)
    .eq("ativo", true)
    .maybeSingle();

  return data;
}

/**
 * Busca o treino do aluno pelo token de acesso:
 *
 *   1. `alunos` por `token_acesso` (ativo);
 *   2. ficha ativa (`fichas_treino.ativa = true`, a mais recente);
 *   3. dias → itens → catálogo, via embeds aninhados do PostgREST.
 *
 * @returns `null` para token inválido/revogado; `ficha: null` quando o
 * token é válido mas não há ficha ativa ainda.
 */
export async function getTreinoAluno(token: string): Promise<TreinoAluno | null> {
  if (!tokenAlunoSchema.safeParse(token).success) {
    return null;
  }

  const supabase = await clienteDadosAluno();

  const aluno = await alunoPorToken(supabase, token);
  if (!aluno) return null;

  const { data: ficha } = await supabase
    .from("fichas_treino")
    .select("id, titulo")
    .eq("aluno_id", aluno.id)
    .eq("ativa", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!ficha) {
    return {
      aluno: { id: aluno.id, nome: aluno.nome },
      ficha: null,
      dias: [],
    };
  }

  const { data: dias, error: erroDias } = await supabase
    .from("treino_dias")
    .select(
      `
      id, letra, nome_dia, ordem,
      treino_itens (
        id, series, repeticoes, carga_sugerida, descanso_segundos, ordem,
        exercicios_catalogo ( id, nome, grupo_muscular, video_gif_url, instrucoes )
      )
      `
    )
    .eq("ficha_id", ficha.id)
    .order("ordem", { ascending: true });

  if (erroDias) {
    throw new Error(`Não foi possível carregar o treino: ${erroDias.message}`);
  }

  const diasMapeados: DiaTreinoAluno[] = (dias ?? []).map((dia) => ({
    id: dia.id,
    letra: dia.letra,
    nome: dia.nome_dia,
    ordem: dia.ordem,
    itens: [...(dia.treino_itens ?? [])]
      .sort((a, b) => a.ordem - b.ordem)
      .flatMap((item) => {
        const catalogo = item.exercicios_catalogo;
        if (!catalogo) return [];

        return [
          {
            id: item.id,
            nome: catalogo.nome,
            grupoMuscular: catalogo.grupo_muscular,
            videoGifUrl: catalogo.video_gif_url,
            instrucoes: catalogo.instrucoes,
            series: item.series,
            repeticoes: item.repeticoes,
            cargaSugerida: item.carga_sugerida,
            descansoSegundos: item.descanso_segundos,
            ordem: item.ordem,
          },
        ];
      }),
  }));

  return {
    aluno: { id: aluno.id, nome: aluno.nome },
    ficha: { id: ficha.id, titulo: ficha.titulo },
    dias: diasMapeados.sort((a, b) => a.ordem - b.ordem),
  };
}

/**
 * Regista a execução de um item no `treino_logs` (WebApp do aluno).
 *
 * Modelagem: um registo por (aluno, item, dia) — atualiza o do dia
 * corrente (`data = current_date` em UTC) e, se ainda não existe, insere.
 * O `aluno_id` é resolvido no servidor a partir do token (nunca vem do
 * cliente) e verifica-se que o item pertence à ficha ativa desse aluno —
 * a service role ignora o RLS, por isso a validação é explícita.
 *
 * Devolve `{ sucesso }` em vez de lançar: a UI chama isto em background
 * (otimista) e só reverte se falhar.
 */
export async function registrarLog(
  log: RegistrarLogInput
): Promise<{ sucesso: boolean; erro?: string }> {
  const parsed = registrarLogSchema.safeParse(log);

  if (!parsed.success) {
    return {
      sucesso: false,
      erro: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const { token, treinoItemId, seriesFeitas, concluido } = parsed.data;
  const supabase = await clienteDadosAluno();

  const aluno = await alunoPorToken(supabase, token);
  if (!aluno) {
    return { sucesso: false, erro: "Acesso revogado." };
  }

  // Cadeia item → dia → ficha (m2o embeds) para provar que o item
  // pertence ao aluno e que a ficha continua ativa.
  const { data: item } = await supabase
    .from("treino_itens")
    .select(
      `
      id,
      treino_dias ( id, ficha_id, fichas_treino ( id, aluno_id, ativa ) )
      `
    )
    .eq("id", treinoItemId)
    .maybeSingle();

  const caminho = item?.treino_dias?.fichas_treino;

  if (!caminho || caminho.aluno_id !== aluno.id || !caminho.ativa) {
    return { sucesso: false, erro: "Exercício fora da ficha ativa." };
  }

  const hojeUtc = new Date().toISOString().slice(0, 10);

  const { data: existente } = await supabase
    .from("treino_logs")
    .select("id")
    .eq("aluno_id", aluno.id)
    .eq("treino_item_id", treinoItemId)
    .eq("data", hojeUtc)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existente) {
    const { error } = await supabase
      .from("treino_logs")
      .update({ series_feitas: seriesFeitas, concluido })
      .eq("id", existente.id);

    return error
      ? { sucesso: false, erro: error.message }
      : { sucesso: true };
  }

  const { error } = await supabase.from("treino_logs").insert({
    aluno_id: aluno.id,
    treino_item_id: treinoItemId,
    series_feitas: seriesFeitas,
    concluido,
  });

  return error
    ? { sucesso: false, erro: error.message }
    : { sucesso: true };
}
