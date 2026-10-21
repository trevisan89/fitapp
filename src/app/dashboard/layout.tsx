import { Suspense, type ReactNode } from "react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DashboardSkeleton, UserMenuSkeleton } from "@/components/dashboard/skeletons";
import { UserMenu } from "@/components/dashboard/user-menu";

export const metadata = {
  title: "Painel | AURA Training",
  description: "Gestão de alunos e fichas de treino do Personal Trainer.",
};

/**
 * Layout do painel do profissional.
 *
 * Com `cacheComponents: true` (Next 16), todo o acesso a cookies deve
 * ficar dentro de uma fronteira `<Suspense>`: o prerender envia o shell +
 * skeletons e o conteúdo dinâmico (utilizador e dados) entra em streaming
 * no request.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
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
