import { LogOut } from "lucide-react";

import { signOut } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { getIniciais } from "@/lib/utils";

/**
 * Cabeçalho do utilizador (Server Component): nome, avatar e botão
 * "Terminar Sessão". É renderizado no servidor dentro de um `<Suspense>`
 * no layout (lê cookies — API de request-time no modelo Cache Components).
 */
export async function UserMenu() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let nome = "Personal Trainer";
  let email: string | null = null;
  let avatarUrl: string | null = null;

  if (user) {
    email = user.email ?? null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("nome, logo_url")
      .eq("id", user.id)
      .maybeSingle();

    const metaNome: unknown = user.user_metadata?.nome;

    nome =
      profile?.nome ??
      (typeof metaNome === "string" && metaNome.length > 0 ? metaNome : null) ??
      email ??
      "Personal Trainer";

    avatarUrl = profile?.logo_url ?? null;
  }

  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <p className="max-w-[12rem] truncate text-sm font-medium leading-tight">{nome}</p>
        {email ? (
          <p className="max-w-[12rem] truncate text-xs leading-tight text-muted-foreground">
            {email}
          </p>
        ) : null}
      </div>

      {avatarUrl ? (
        // URL dinâmica do Supabase Storage — não é conhecida no build,
        // por isso não passa pelo next/image (remotePatterns).
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt=""
          className="size-9 shrink-0 rounded-full border border-border object-cover"
        />
      ) : (
        <span
          className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
          aria-hidden="true"
        >
          {getIniciais(nome)}
        </span>
      )}

      <form action={signOut}>
        <button
          type="submit"
          aria-label="Terminar Sessão"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium transition hover:bg-accent hover:text-accent-foreground"
        >
          <LogOut className="size-4" />
          <span className="hidden sm:inline">Terminar Sessão</span>
        </button>
      </form>
    </div>
  );
}
