"use client";

import { Suspense, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dumbbell, LayoutDashboard, Menu, Settings, Users, X } from "lucide-react";

import { SidebarSkeleton } from "@/components/dashboard/skeletons";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Início", icon: LayoutDashboard },
  { href: "/dashboard/alunos", label: "Alunos", icon: Users },
  { href: "/dashboard/exercicios", label: "Biblioteca de Exercícios", icon: Dumbbell },
  { href: "/dashboard/definicoes", label: "Definições", icon: Settings },
];

function isActiveLink(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  // `usePathname` lê URL data, só conhecida em runtime em rotas dinâmicas.
  // Chamado aqui (dentro de um <Suspense> nos call sites) o prerender usa o
  // fallback e o link ativo real entra em streaming no request.
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-3 border-b border-border px-5">
        <Logo dimensao="sm" />
      </div>

      <nav className="flex-1 space-y-1 p-3" aria-label="Navegação do painel">
        {NAV_ITEMS.map((item) => {
          const active = isActiveLink(pathname, item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 active:scale-[0.98]",
                active
                  ? "bg-gradient-to-r from-primary/15 to-primary/5 text-primary ring-1 ring-inset ring-primary/20"
                  : "text-muted-foreground hover:bg-accent/70 hover:text-accent-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <p className="border-t border-border px-5 py-4 text-xs text-muted-foreground">
        Painel do Personal Trainer
      </p>
    </div>
  );
}

/**
 * Chrome do painel: barra lateral fixa (desktop), drawer com hambúrguer
 * (mobile) e cabeçalho com o slot do utilizador.
 *
 * Recebe `userMenu` e `children` já renderizados no servidor — este
 * componente só cuida do estado da UI (menu aberto/fechado).
 */
export function DashboardShell({
  children,
  userMenu,
}: {
  children: ReactNode;
  userMenu: ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Esc fecha o drawer (mobile) — subscrição a um evento externo,
  // com setState apenas dentro do callback.
  useEffect(() => {
    if (!sidebarOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSidebarOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sidebarOpen]);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Barra lateral — desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border bg-card md:block">
        <Suspense fallback={<SidebarSkeleton />}>
          <SidebarContent />
        </Suspense>
      </aside>

      {/* Fundo escurecido — mobile */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          tabIndex={-1}
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
        />
      )}

      {/* Drawer — mobile */}
      <aside
        inert={!sidebarOpen}
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-card transition-transform duration-300 ease-out md:hidden",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setSidebarOpen(false)}
          className="absolute right-3 top-4 rounded-md p-1.5 text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
        >
          <X className="size-5" />
        </button>
        <Suspense fallback={<SidebarSkeleton />}>
          <SidebarContent onNavigate={() => setSidebarOpen(false)} />
        </Suspense>
      </aside>

      <div className="md:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl md:px-6">
          <button
            type="button"
            aria-label="Abrir menu"
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-2 text-foreground transition hover:bg-accent md:hidden"
          >
            <Menu className="size-5" />
          </button>

          <Logo dimensao="sm" className="md:hidden" />

          <div className="ml-auto">{userMenu}</div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
