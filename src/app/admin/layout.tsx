import { Suspense, type ReactNode } from "react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DashboardSkeleton, UserMenuSkeleton } from "@/components/dashboard/skeletons";
import { UserMenu } from "@/components/dashboard/user-menu";

export const metadata = {
  title: "Admin | FitApp",
  description: "Área administrativa: gestão manual de planos dos clientes.",
};

/**
 * Layout da área administrativa — reutiliza o shell do painel (sidebar +
 * menu de utilizador) para a tela ficar integrada no produto.
 *
 * A proteção da rota acontece no `proxy.ts` (sessão + e-mail admin) e é
 * repetida no início da página `/admin` (defesa em profundidade).
 *
 * `cacheComponents`: cookies/acesso dinâmico dentro de `<Suspense>` — o
 * prerender envia o shell + skeleton e o conteúdo entra em streaming.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardShell
      userMenu={
        <Suspense fallback={<UserMenuSkeleton />}>
          <UserMenu />
        </Suspense>
      }
    >
      <Suspense fallback={<DashboardSkeleton />}>{children}</Suspense>
    </DashboardShell>
  );
}
