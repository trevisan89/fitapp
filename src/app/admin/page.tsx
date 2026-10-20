import type { SupabaseClient } from "@supabase/supabase-js";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { PlanoToggle } from "@/components/admin/plano-toggle";
import { ehAdminEmail } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getIniciais } from "@/lib/utils";
import type { Database, Tables } from "@/types/database.types";

type LinhaAdmin = { profile: Tables<"profiles">; email: string | null };

/**
 * Área administrativa do FitApp — gestão MANUAL de planos dos clientes
 * (no início, antes de os pagamentos Stripe entrarem em produção; depois,
 * o webhook volta a ser a fonte automática e esta tela serve de override).
 *
 * Guarda de segurança em três camadas (ver `src/lib/admin.ts`):
 *   1. `proxy.ts` — exige sessão em `/admin` e compara o e-mail já na borda;
 *   2. AQUI, no início do Server Component — `redirect("/dashboard?erro=403")`
 *      para quem não é admin (a página pedida pelo briefing);
 *   3. Dentro da Server Action `updatePlanoManual` — as actions são
 *      endpoints invocáveis por qualquer sessão, por isso a checagem
 *      do e-mail repete-se lá antes de tocar na base de dados.
 *
 * A listagem usa a service role (RLS de `profiles` só devolve a própria
 * linha); o e-mail vem do Auth Admin (a tabela profiles não tem e-mail).
 */
export default async function AdminPage() {
  // 1. Verificação de segurança no início da página.
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Sem sessão → o próprio proxy já manda para /login; aqui fica a
    // checagem redundante caso a rota seja servida sem passar pela borda.
    redirect("/login");
  }

  if (!ehAdminEmail(user.email)) {
    redirect("/dashboard?erro=403");
  }

  // 2. Listagem com service role (bypass do RLS) — só após a guarda acima.
  const servico = createServiceClient();

  let linhas: LinhaAdmin[] = [];
  let erroListagem: string | null = null;

  if (!servico) {
    erroListagem =
      "SUPABASE_SERVICE_ROLE_KEY não configurada — a gestão de planos precisa de servidor autenticado com service role.";
  } else {
    const { data, error } = await servico
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      erroListagem = `Não foi possível carregar os perfis: ${error.message}`;
    } else {
      const emails = await carregarEmails(servico);

      linhas = (data ?? []).map((profile) => ({
        profile,
        email: emails.get(profile.id) ?? null,
      }));
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho com glow da marca (mesma linguagem do dashboard) */}
      <header className="relative space-y-2 overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-28 right-0 size-64 rounded-full bg-primary/20 blur-3xl"
        />
        <div className="relative flex items-center justify-between gap-4">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary ring-1 ring-inset ring-primary/20">
              <ShieldCheck className="size-3" aria-hidden="true" />
              Restrito
            </span>
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Área Administrativa
            </h1>
            <p className="text-sm text-muted-foreground">
              {erroListagem
                ? "Gestão manual de planos dos clientes."
                : `${linhas.length} perfil${linhas.length === 1 ? "" : "s"} · gestão manual Starter/Pro.`}
            </p>
          </div>

          <span className="hidden shrink-0 rounded-full bg-gradient-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 sm:block">
            Admin
          </span>
        </div>
      </header>

      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Voltar ao painel
      </Link>

      {erroListagem ? (
        <div
          role="alert"
          className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3.5 text-sm text-amber-600 motion-safe:animate-scale-in dark:text-amber-400"
        >
          <span className="font-semibold">Configuração em falta: </span>
          {erroListagem}
        </div>
      ) : linhas.length === 0 ? (
        <section className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center motion-safe:animate-fade-in-up">
          <span
            className="grid size-14 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-lg shadow-primary/25"
            aria-hidden="true"
          >
            <ShieldCheck className="size-7" />
          </span>

          <h2 className="mt-5 text-lg font-semibold">Nenhum perfil registado</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Assim que um profissional concluir o registo, o perfil aparece aqui para
            gestão manual do plano.
          </p>
        </section>
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <th scope="col" className="px-4 py-3">
                      Nome
                    </th>
                    <th scope="col" className="px-4 py-3">
                      E-mail
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Plano actual
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Stripe Customer
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Stripe Subscription
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {linhas.map(({ profile, email }, indice) => (
                    <tr
                      key={profile.id}
                      className="transition-colors hover:bg-muted/40 motion-safe:animate-fade-in-up"
                      style={{ animationDelay: `${Math.min(indice, 8) * 50}ms` }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-primary text-[11px] font-bold text-primary-foreground shadow-md shadow-primary/20"
                            aria-hidden="true"
                          >
                            {getIniciais(profile.nome)}
                          </span>
                          <span className="font-medium">{profile.nome}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-muted-foreground">
                        {email ?? (
                          <span className="text-muted-foreground/60" title="Sem e-mail associado">
                            —
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <PlanoToggle
                          profileId={profile.id}
                          plano={profile.plano_status}
                          nome={profile.nome}
                        />
                      </td>

                      <td className="px-4 py-3">
                        <IdStripe valor={profile.stripe_customer_id} />
                      </td>

                      <td className="px-4 py-3">
                        <IdStripe valor={profile.stripe_subscription_id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            O plano é aplicado manualmente nesta tabela; quando os pagamentos Stripe
            arrancarem, o webhook do Stripe volta a ser a fonte automática e esta tela
            passa a servir de override.
          </p>
        </>
      )}
    </div>
  );
}

/** Célula de ID Stripe: monoespaçada, truncada, com valor completo no `title`. */
function IdStripe({ valor }: { valor: string | null }) {
  if (!valor) {
    return <span className="text-muted-foreground/60">—</span>;
  }

  return (
    <span
      className="block max-w-44 truncate font-mono text-xs text-muted-foreground"
      title={valor}
    >
      {valor}
    </span>
  );
}

/**
 * E-mails dos utilizadores via Auth Admin (melhor esforço).
 *
 * A tabela `profiles` não tem e-mail (a FK aponta para `auth.users`, fora
 * do schema public) — o mapa id→email é construído em páginas de 100
 * contas; se o serviço falhar, a coluna apenas mostra "—".
 */
async function carregarEmails(
  servico: SupabaseClient<Database>
): Promise<Map<string, string>> {
  const mapa = new Map<string, string>();

  for (let pagina = 1; pagina <= 10; pagina += 1) {
    const { data, error } = await servico.auth.admin.listUsers({
      page: pagina,
      perPage: 100,
    });

    if (error || !data) break;

    for (const conta of data.users) {
      if (conta.email) mapa.set(conta.id, conta.email);
    }

    if (data.users.length < 100) break;
  }

  return mapa;
}
