"use client";

import { useState, useTransition } from "react";
import { Loader2, Power } from "lucide-react";

import { toggleFichaAtiva } from "@/app/actions/fichas";
import { cn } from "@/lib/utils";

/**
 * Distintivo "Ativa" (verde) / "Inativa" (cinzento) + botão para alternar
 * o estado da ficha.
 *
 * O estado deriva DAS PROPS (Server Component revalidado pela action via
 * `revalidatePath`) e não de estado local: assim, ao ativar uma ficha, as
 * outras fichas do aluno também atualizam no mesmo render. O spinner do
 * `useTransition` cobre a espera até as props chegarem.
 */
export function FichaToggleAtiva({
  fichaId,
  ativa,
}: {
  fichaId: string;
  ativa: boolean;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, startTransition] = useTransition();

  function alternar() {
    setErro(null);
    startTransition(async () => {
      const resultado = await toggleFichaAtiva(fichaId);
      if (!resultado.sucesso) {
        setErro(resultado.erro);
      }
      // Sucesso: o `revalidatePath` da action re-renderiza a página com os
      // novos estados de TODAS as fichas (spinner ativo até lá).
    });
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
            ativa
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              : "bg-muted text-muted-foreground"
          )}
        >
          <span
            className="size-1.5 rounded-full bg-current"
            aria-hidden="true"
          />
          {ativa ? "Ativa" : "Inativa"}
        </span>

        <button
          type="button"
          onClick={alternar}
          disabled={pendente}
          aria-label={
            ativa ? "Desativar esta ficha" : "Ativar esta ficha"
          }
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
            ativa
              ? "border-border text-muted-foreground hover:border-destructive/40 hover:text-destructive"
              : "border-primary/30 bg-primary/10 text-primary hover:opacity-90"
          )}
        >
          {pendente ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Power className="size-3.5" aria-hidden="true" />
          )}
          {ativa ? "Desativar" : "Ativar"}
        </button>
      </div>

      {erro ? (
        <p role="alert" className="max-w-[16rem] text-right text-[11px] text-destructive">
          {erro}
        </p>
      ) : null}
    </div>
  );
}
