"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAlunoSchema, type CreateAlunoInput } from "@/lib/validators/aluno";
import type { Tables } from "@/types/database.types";

/**
 * Lista os alunos do profissional autenticado.
 *
 * A política RLS (`professional_id = auth.uid()`) já isola os registos por
 * tenant; o filtro é explícito por legibilidade e defesa em profundidade.
 */
export async function getAlunos(): Promise<Tables<"alunos">[]> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (!user) {
    // Sem sessão, o Supabase devolve `AuthSessionMissingError` (sem chamada
    // à rede). O RLS não devolveria registos de qualquer forma, por isso
    // mostramos o estado vazio do painel. Outros erros de auth (rede,
    // endpoint inacessível...) continuam a falhar com mensagem clara.
    if (authError && authError.name !== "AuthSessionMissingError") {
      throw new Error(`Não foi possível validar a sessão: ${authError.message}`);
    }

    return [];
  }

  const { data, error } = await supabase
    .from("alunos")
    .select("*")
    .eq("professional_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Não foi possível carregar os alunos: ${error.message}`);
  }

  return data;
}

/**
 * Cria um aluno para o profissional autenticado.
 *
 * `token_acesso` **não** é enviado: fica o `DEFAULT uuid_generate_v4()`
 * do PostgreSQL definido em `01_initial_schema.sql`.
 *
 * @throws Error com mensagem amigável se a sessão for inválida, os dados
 * não passarem na validação ou o insert falhar.
 */
export async function createAluno(input: CreateAlunoInput): Promise<Tables<"alunos">> {
  const parsed = createAlunoSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Sessão inválida. Termine a sessão e volte a entrar.");
  }

  const { data, error } = await supabase
    .from("alunos")
    .insert({
      professional_id: user.id,
      nome: parsed.data.nome,
      whatsapp: parsed.data.whatsapp,
      // token_acesso: DEFAULT do PostgreSQL (uuid_generate_v4())
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Não foi possível adicionar o aluno: ${error.message}`);
  }

  if (!data) {
    throw new Error("Não foi possível adicionar o aluno.");
  }

  revalidatePath("/dashboard");

  return data;
}
