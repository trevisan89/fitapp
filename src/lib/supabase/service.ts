import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

/**
 * Cliente Supabase autenticado com a SERVICE ROLE KEY (bypass do RLS).
 *
 * Uso restrito às Server Actions do WebApp do aluno
 * (`src/app/actions/execucao.ts`): essa rota corre SEM sessão e as
 * políticas RLS são `to authenticated` — o papel `anon` com leitura por
 * `token_acesso` só chega numa migração futura. Até lá, a service role é
 * a via temporária autorizada.
 *
 * A chave vive apenas em `.env.local` e só é lida em ficheiros de
 * servidor — nunca chega ao browser (não é NEXT_PUBLIC_*).
 *
 * @returns `null` quando `SUPABASE_SERVICE_ROLE_KEY` não está configurada.
 */
export function createServiceClient(): SupabaseClient<Database> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !chave) return null;

  return createClient<Database>(url, chave, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
