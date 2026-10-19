/**
 * Fallbacks de `<Suspense>` para as partes dinâmicas do painel
 * (cabeçalho do utilizador e conteúdo da página), que leem cookies —
 * com Cache Components o prerender mostra estes skeletons e o conteúdo
 * real entra em streaming no request.
 */

export function SidebarSkeleton() {
  return (
    <div className="flex h-full flex-col" aria-hidden="true">
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
        <div className="size-8 animate-pulse rounded-lg bg-muted" />
        <div className="h-4 w-20 animate-pulse rounded-md bg-muted" />
      </div>
      <div className="space-y-2 p-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-10 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    </div>
  );
}

export function UserMenuSkeleton() {
  return (
    <div className="flex items-center gap-3" aria-hidden="true">
      <div className="hidden h-9 w-36 animate-pulse rounded-md bg-muted sm:block" />
      <div className="size-9 animate-pulse rounded-full bg-muted" />
      <div className="h-9 w-10 animate-pulse rounded-lg bg-muted" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="space-y-2">
        <div className="h-7 w-44 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-72 animate-pulse rounded-md bg-muted" />
      </div>

      <div className="mx-auto h-10 w-48 animate-pulse rounded-lg bg-muted" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-36 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
