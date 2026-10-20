"use server";

import { revalidatePath } from "next/cache";

import { ehAdminEmail } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  updatePlanoManualSchema,
  type UpdatePlanoManualInput,
} from "@/lib/validators/admin";

/** Resultado esperado da ação (falhas voltam como mensagem, sem throw). */
export type ResultadoAdmin = { sucesso: boolean; erro?: string };

/**
 * Atualiza manualmente o `plano_status` de um perfil (`starter` ↔ `pro`).
 *
 * Segurança em três camadas:
 *   1. payload validado com Zod (`profileId` uuid + enum do plano);
 *   2. sessão obrigatória + e-mail na lista de admin — a página `/admin`
 *      já filtra, mas uma Server Action é um endpoint público: qualquer
 *      sessão autenticada pode invocá-la diretamente;
 *   3. escrita com service role (bypass do RLS) restrita ao `.eq("id", …)`
 *      do perfil validado — nunca a outros campos ou tabelas.
 *
 * @param profileId  uuid do perfil a atualizar.
 * @param novoPlano  `'starter'` ou `'pro'`.
 */
export async function updatePlanoManual(
  profileId: string,
  novoPlano: UpdatePlanoManualInput["novoPlano"]
): Promise<ResultadoAdmin> {
  const parsed = updatePlanoManualSchema.safeParse({ profileId, novoPlano });

  if (!parsed.success) {
    return {
      sucesso: false,
      erro: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { sucesso: false, erro: "Sessão inválida. Termine e entre de novo." };
  }

  if (!ehAdminEmail(user.email)) {
    return { sucesso: false, erro: "Sem permissão (403): área restrita." };
  }

  const servico = createServiceClient();

  if (!servico) {
    return {
      sucesso: false,
      erro: "SUPABASE_SERVICE_ROLE_KEY não configurada no servidor.",
    };
  }

  const { data, error } = await servico
    .from("profiles")
    .update({ plano_status: parsed.data.novoPlano })
    .eq("id", parsed.data.profileId)
    .select("id")
    .maybeSingle();

  if (error) {
    return { sucesso: false, erro: `Falha ao atualizar o plano: ${error.message}` };
  }

  if (!data) {
    return { sucesso: false, erro: "Perfil não encontrado." };
  }

  revalidatePath("/admin");

  return { sucesso: true };
}
