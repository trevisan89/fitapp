"use client";

import { useState, useSyncExternalStore } from "react";
import { Check, ClipboardCopy, Link2 } from "lucide-react";

/**
 * Assinatura vazia: `window.location.origin` não emite eventos, mas o
 * `useSyncExternalStore` exige um `subscribe` (que devolve a limpeza).
 */
const semSubscricao = () => () => {};

/**
 * `window.location.origin` com suporte a SSR: o snapshot do servidor é ""
 * (mostra só o caminho relativo) e o cliente re-renderiza com a origem
 * real após a hidratação, sem divergência — é a API recomendada pelo
 * React para ler estado externo (em vez de setState dentro de useEffect).
 */
function useOrigem(): string {
  return useSyncExternalStore(
    semSubscricao,
    () => window.location.origin,
    () => ""
  );
}

/**
 * Bloco destacado com o link de acesso direto do aluno
 * (`{origin}/aluno/{token_acesso}`) e botão "Copiar Link" com feedback
 * visual "Copiado!" — o personal copia num clique e cola no WhatsApp.
 */
export function LinkAcessoAluno({ token }: { token: string }) {
  const origem = useOrigem();
  const [copiado, setCopiado] = useState(false);

  const caminho = `/aluno/${token}`;
  const url = origem ? `${origem}${caminho}` : caminho;

  async function copiarLink() {
    let ok = false;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        ok = true;
      }
    } catch {
      ok = false;
    }

    // Fallback para contextos sem Clipboard API (ex.: http fora de localhost).
    if (!ok) {
      const area = document.createElement("textarea");
      area.value = url;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      try {
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      }
      document.body.removeChild(area);
    }

    if (ok) {
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    }
  }

  return (
    <section className="rounded-xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <span
          className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"
          aria-hidden="true"
        >
          <Link2 className="size-5" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Link de acesso do aluno</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Partilhe no WhatsApp: o aluno abre o treino direto no browser,
            sem app nem password.
          </p>
          <code className="mt-2 block truncate rounded-lg border border-border bg-background/70 px-2.5 py-1.5 text-xs">
            {url}
          </code>
        </div>

        <button
          type="button"
          onClick={copiarLink}
          className={
            copiado
              ? "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/15 px-4 py-2.5 text-sm font-medium text-emerald-600 shadow-sm transition dark:text-emerald-400"
              : "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90"
          }
        >
          {copiado ? (
            <Check className="size-4" aria-hidden="true" />
          ) : (
            <ClipboardCopy className="size-4" aria-hidden="true" />
          )}
          {copiado ? "Copiado!" : "Copiar Link"}
        </button>
      </div>

      <span role="status" aria-live="polite" className="sr-only">
        {copiado ? "Link copiado para a área de transferência." : ""}
      </span>
    </section>
  );
}
