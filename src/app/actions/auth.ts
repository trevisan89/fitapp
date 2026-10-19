"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { loginSchema, type LoginInput } from "@/lib/validators/auth";

/** Termina a sessão do profissional e envia-o para a página inicial. */
export async function signOut(): Promise<void> {
  const supabase = await createClient();

  await supabase.auth.signOut();

  redirect("/");
}

/** Traduz os erros nativos do Supabase Auth para mensagens em PT. */
function traduzirErroAuth(erro: { message: string; code?: string | null }): string {
  const codigo = erro.code ?? "";
  const mensagem = erro.message.toLowerCase();

  if (
    codigo === "invalid_credentials" ||
    mensagem.includes("invalid login credentials")
  ) {
    return "E-mail ou palavra-passe incorretos.";
  }
  if (codigo === "email_not_confirmed") {
    return "Confirme o e-mail antes de entrar.";
  }
  if (codigo === "user_already_exists" || codigo === "email_exists") {
    return "Já existe uma conta com este e-mail.";
  }
  if (codigo === "weak_password" || mensagem.includes("password")) {
    return "A palavra-passe é demasiado fraca (mínimo de 6 caracteres).";
  }
  if (codigo.includes("rate_limit")) {
    return "Demasiadas tentativas. Aguarde um momento e tente novamente.";
  }

  return "Não foi possível autenticar. Tente novamente.";
}

/**
 * Login nativo do Supabase (`signInWithPassword`).
 *
 * Em sucesso, os cookies da sessão já ficam gravados pelo cliente SSR e o
 * formulário client redireciona para `/dashboard` (o proxy garantiria o
 * mesmo destino). Em erro, devolve a mensagem pronta para o formulário —
 * nada é lançado para não mascarar o texto em produção.
 */
export async function signIn(
  input: LoginInput
): Promise<{ error: string | null }> {
  const parsed = loginSchema.safeParse(input);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: traduzirErroAuth(error) };
  }

  return { error: null };
}

/**
 * Registo nativo do Supabase (`signUp`).
 *
 * `confirmacaoEmail: true` quando o Supabase exige confirmação (devolve
 * sessão `null`) — nesse caso não há redirect automático. Com a
 * confirmação desativada (dev) devolve sessão e o cliente manda para
 * `/dashboard`, como no login.
 */
export async function signUp(
  input: LoginInput
): Promise<{ error: string | null; confirmacaoEmail: boolean }> {
  const parsed = loginSchema.safeParse(input);

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
      confirmacaoEmail: false,
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${
        process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
      }/dashboard`,
    },
  });

  if (error) {
    return { error: traduzirErroAuth(error), confirmacaoEmail: false };
  }

  if (data.session) {
    return { error: null, confirmacaoEmail: false };
  }

  return { error: null, confirmacaoEmail: true };
}
