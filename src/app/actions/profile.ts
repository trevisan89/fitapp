"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  updateProfileSchema,
  type UpdateProfileInput,
} from "@/lib/validators/profile";
import type { Tables } from "@/types/database.types";

/**
 * Atualiza (ou cria, na primeira gravação) o perfil white-label do
 * profissional autenticado na tabela `profiles`.
 *
 * O update leva `.eq("id", user.id)` — o RLS reforça o mesmo isolamento —
 * para nunca alterar o perfil de outro utilizador.
 */
export async function updateProfile(
  input: UpdateProfileInput
): Promise<Tables<"profiles">> {
  const parsed = updateProfileSchema.safeParse(input);

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

  const dados = {
    nome: parsed.data.nome,
    whatsapp: parsed.data.whatsapp.length > 0 ? parsed.data.whatsapp : null,
    slug: parsed.data.slug,
    cor_primaria: parsed.data.corPrimaria,
    logo_url: parsed.data.logoUrl.length > 0 ? parsed.data.logoUrl : null,
  };

  // Enquanto o trigger de signup (auth.users → profiles) ainda não existe,
  // o perfil é criado na primeira gravação feita pelo próprio profissional.
  const { data: existente } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  const { data, error } = existente
    ? await supabase.from("profiles").update(dados).eq("id", user.id).select("*").single()
    : await supabase.from("profiles").insert({ id: user.id, ...dados }).select("*").single();

  if (error) {
    // 23505 = unique_violation (slug duplicado)
    throw new Error(
      error.code === "23505"
        ? "Este slug já está a ser usado por outro perfil."
        : `Não foi possível guardar o perfil: ${error.message}`
    );
  }

  if (!data) {
    throw new Error("Não foi possível guardar o perfil.");
  }

  // O cabeçalho (nome/avatar) vive no layout do dashboard.
  revalidatePath("/dashboard", "layout");

  return data;
}
