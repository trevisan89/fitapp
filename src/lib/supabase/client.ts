"use client";

import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database.types";

/**
 * Cliente Supabase para componentes Client-Side ("use client").
 *
 * Uso:
 * ```tsx
 * "use client";
 * import { createClient } from "@/lib/supabase/client";
 *
 * const supabase = createClient();
 * const { data } = await supabase.from("alunos").select();
 * ```
 *
 * As variáveis `NEXT_PUBLIC_*` são embutidas no bundle no build.
 * `createBrowserClient` é um singleton: pode ser chamado em vários
 * componentes sem criar conexões duplicadas.
 *
 * O genérico `<Database>` (src/types/database.types.ts) torna queries,
 * inserts e updates tipados em tempo de compilação.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Variáveis de ambiente do Supabase ausentes. Copie `.env.local.example` para `.env.local` e preencha NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
