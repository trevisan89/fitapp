"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { updatePlanoManual } from "@/app/actions/admin";
import { cn } from "@/lib/utils";

type Plano = "starter" | "pro";

/**
 * Seletor segmentado Starter ↔ Pro numa linha da tabela admin.
 *
 * UX de troca instantânea: o clique dispara a Server Action dentro de um
 * `useTransition` (a linha fica em pending sem bloquear a página) e o
 * `revalidatePath('/admin')` da action devolve a árvore RSC já com o
 * novo valor — sem refresh manual. Falhas aparecem inline sem perder o
 * plano atual.
 */
export function PlanoToggle({
  profileId,
  plano,
  nome,
}: {
  profileId: string;
  plano: string;
  nome: string;
}) {
  const [pendente, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  // `plano_status` tem constraint CHECK ('starter','pro'); defensivamente
  // qualquer outro valor é tratado como starter.
  const atual: Plano = plano === "pro" ? "pro" : "starter";

  function selecionar(novo: Plano) {
    if (novo === atual || pendente) return;

    setErro(null);

    startTransition(async () => {
      try {
        const resultado = await updatePlanoManual(profileId, novo);

        if (!resultado.sucesso) {
          setErro(resultado.erro ?? "Não foi possível atualizar o plano.");
        }
      } catch {
        setErro("Falha de rede — tente novamente.");
      }
    });
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <span
        role="group"
        aria-label={`Plano de ${nome}: ${atual}`}
        className="inline-flex rounded-full border border-border bg-muted p-0.5"
      >
        {(["starter", "pro"] as const).map((opcao) => {
          const ativo = opcao === atual;

          return (
            <button
              key={opcao}
              type="button"
              disabled={pendente || ativo}
              aria-pressed={ativo}
              title={ativo ? `Plano atual: ${opcao}` : `Mudar para ${opcao}`}
              onClick={() => selecionar(opcao)}
              className={cn(
                "inline-flex min-h-7 items-center gap-1 rounded-full px-3 text-xs font-semibold transition-all duration-200 active:scale-95 disabled:cursor-default",
                ativo &&
                  opcao === "pro" &&
                  "bg-gradient-primary text-primary-foreground shadow-md shadow-primary/30",
                ativo &&
                  opcao === "starter" &&
                  "bg-card text-foreground shadow-sm ring-1 ring-inset ring-border",
                !ativo && "text-muted-foreground hover:text-foreground"
              )}
            >
              {pendente && !ativo ? (
                <Loader2 className="size-3 animate-spin" aria-hidden="true" />
              ) : null}
              {opcao === "pro" ? "Pro" : "Starter"}
            </button>
          );
        })}
      </span>

      {erro ? (
        <span role="alert" className="text-[11px] leading-tight text-destructive">
          {erro}
        </span>
      ) : null}
    </div>
  );
}
