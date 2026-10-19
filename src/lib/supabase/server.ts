import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/types/database.types";

/**
 * Cliente Supabase para Server Components, Server Actions e Route Handlers.
 *
 * Sempre crie um novo cliente por request — nunca compartile um cliente
 * entre requests.
 *
 * Uso em Server Component (somente leitura):
 * ```tsx
 * const supabase = await createClient();
 * const { data } = await supabase.from("fichas_treino").select();
 * ```
 *
 * Uso em Server Action (leitura e escrita de cookies):
 * ```ts
 * "use server";
 * const supabase = await createClient();
 * await supabase.auth.signInWithPassword({ email, password });
 * ```
 *
 * O genérico `<Database>` (src/types/database.types.ts) torna queries,
 * inserts e updates tipados em tempo de compilação.
 *
 * Nota (Next.js): `cookies()` é assíncrona e gravar cookies só é permitido
 * em Server Functions/Route Handlers. Em Server Components o `setAll`
 * vira no-op — o refresh de sessão é tratado no proxy/middleware.
 */
export async function createClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Variáveis de ambiente do Supabase ausentes. Copie `.env.local.example` para `.env.local` e preencha NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Ignorado: chamado durante o render de Server Components,
          // onde gravar cookies não é permitido.
        }
      },
    },
  });
}
