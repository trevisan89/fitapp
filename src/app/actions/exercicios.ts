"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  createExercicioSchema,
  type CreateExercicioInput,
} from "@/lib/validators/exercicio";
import type { Tables } from "@/types/database.types";

/**
 * Lista os exercícios visíveis ao profissional autenticado: os seus +
 * os globais (`professional_id IS NULL`), tal como a política RLS
 * `exercicios_catalogo_leitura`.
 */
export async function getExercicios(): Promise<Tables<"exercicios_catalogo">[]> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (!user) {
    // Sem sessão (AuthSessionMissingError): o RLS não devolveria registos.
    // Outros erros de auth (rede, endpoint inacessível...) falham com clareza.
    if (authError && authError.name !== "AuthSessionMissingError") {
      throw new Error(`Não foi possível validar a sessão: ${authError.message}`);
    }

    return [];
  }

  const { data, error } = await supabase
    .from("exercicios_catalogo")
    .select("*")
    .or(`professional_id.eq.${user.id},professional_id.is.null`)
    .order("nome", { ascending: true });

  if (error) {
    throw new Error(`Não foi possível carregar os exercícios: ${error.message}`);
  }

  return data;
}

/**
 * Cria um exercício no catálogo do profissional autenticado.
 *
 * O RLS (`exercicios_catalogo_insert`) exige `professional_id = auth.uid()`,
 * pelo que o id é sempre o do utilizador em sessão — nunca vindo do cliente.
 * `video_gif_url`/`instrucoes` vazios são gravados como `NULL`.
 */
export async function createExercercicio(
  input: CreateExercicioInput
): Promise<Tables<"exercicios_catalogo">> {
  const parsed = createExercicioSchema.safeParse(input);

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
    .from("exercicios_catalogo")
    .insert({
      professional_id: user.id,
      nome: parsed.data.nome,
      grupo_muscular: parsed.data.grupoMuscular,
      video_gif_url: parsed.data.videoGifUrl.length > 0 ? parsed.data.videoGifUrl : null,
      instrucoes: parsed.data.instrucoes.length > 0 ? parsed.data.instrucoes : null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(`Não foi possível adicionar o exercício: ${error.message}`);
  }

  if (!data) {
    throw new Error("Não foi possível adicionar o exercício.");
  }

  revalidatePath("/dashboard/exercicios");

  return data;
}
