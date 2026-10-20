"use client";

import { useSearchParams } from "next/navigation";
import { ShieldX } from "lucide-react";

/**
 * Banner de erro exibido no painel quando o redirecionamento chega com
 * `?erro=403` (ex.: tentativa de aceder à área administrativa sem ser o
 * e-mail admin).
 *
 * `useSearchParams` exige fronteira `<Suspense>` no prerender
 * (`cacheComponents: true`) — o chamador (`dashboard/page.tsx`) envolve.
 */
export function AvisoErroAcesso() {
  const params = useSearchParams();
  const codigo = params.get("erro");

  if (codigo !== "403") return null;

  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3.5 text-sm text-destructive motion-safe:animate-scale-in"
    >
      <ShieldX className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div>
        <p className="font-semibold">Acesso negado (erro 403)</p>
        <p className="text-destructive/80">
          A área administrativa é restrita ao administrador do sistema — não tem
          permissão para aceder a esta rota.
        </p>
      </div>
    </div>
  );
}
