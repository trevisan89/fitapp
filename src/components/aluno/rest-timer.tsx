"use client";

import { useEffect, useState } from "react";
import { Check, Forward, Plus } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Cronômetro de descanso do aluno — barra fixa no fundo do ecrã estilo
 * "sheet" nativo, com anel circular de progresso (SVG) e botões grandes.
 *
 * Não intrusiva: aparece quando uma série é concluída, com `+15s` e
 * `Pular`. Ao chegar a zero, vibra (quando suportado), mostra
 * "Descanso concluído" e espera o fecho do próprio aluno.
 *
 * Reinício: o pai troca a `key` a cada série marcada.
 */
export function RestTimer({
  segundosIniciais,
  onFechar,
}: {
  segundosIniciais: number;
  onFechar: () => void;
}) {
  const [restantes, setRestantes] = useState(segundosIniciais);
  const [total, setTotal] = useState(segundosIniciais);

  // Um único intervalo: decremente até zero e para-se aí dentro.
  useEffect(() => {
    const intervalo = window.setInterval(() => {
      setRestantes((valor) => {
        if (valor <= 1) {
          window.clearInterval(intervalo);
          return 0;
        }
        return valor - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalo);
  }, []);

  // Vibração discreta ao terminar (quando o device suporta).
  useEffect(() => {
    if (restantes !== 0) return;
    try {
      window.navigator.vibrate?.(180);
    } catch {
      // Device sem vibração ou permissão negada — segue sem feedback háptico.
    }
  }, [restantes]);

  function adicionar15s() {
    setRestantes((valor) => {
      const novo = valor + 15;
      setTotal((atual) => Math.max(atual, novo));
      return novo;
    });
  }

  const concluido = restantes <= 0;
  const minutos = Math.floor(restantes / 60);
  const segundos = restantes % 60;

  // Anel circular: circunferência × fração restante.
  const raio = 26;
  const circunferencia = 2 * Math.PI * raio;
  const fracao = concluido
    ? 0
    : Math.min(1, Math.max(0, restantes / Math.max(total, 1)));
  const deslocamento = circunferencia * (1 - fracao);

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 shadow-[0_-12px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl motion-safe:animate-slide-up">
      <div className="mx-auto w-full max-w-lg rounded-t-3xl px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-4">
        <div className="flex items-center gap-4">
          {/* Anel de progresso + tempo */}
          <div className="relative grid size-16 shrink-0 place-items-center">
            <svg
              className="absolute inset-0 size-16 -rotate-90"
              viewBox="0 0 64 64"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="grad-descanso" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--primary)" />
                  <stop offset="100%" stopColor="var(--primary-end)" />
                </linearGradient>
              </defs>
              {/* Pista */}
              <circle
                cx="32"
                cy="32"
                r={raio}
                fill="none"
                strokeWidth="5"
                className="stroke-muted"
              />
              {/* Progresso */}
              <circle
                cx="32"
                cy="32"
                r={raio}
                fill="none"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={circunferencia}
                strokeDashoffset={deslocamento}
                className={cn(
                  "transition-[stroke-dashoffset] duration-1000 ease-linear",
                  concluido ? "stroke-primary" : "stroke-[url(#grad-descanso)]"
                )}
              />
            </svg>

            {concluido ? (
              <span
                className="grid size-8 place-items-center rounded-full bg-gradient-primary text-primary-foreground motion-safe:animate-check-pop"
                aria-hidden="true"
              >
                <Check className="size-4" strokeWidth={3} />
              </span>
            ) : (
              <span className="text-base font-bold tabular-nums leading-none">
                {String(minutos).padStart(2, "0")}:
                {String(segundos).padStart(2, "0")}
              </span>
            )}
          </div>

          {/* Rótulo do estado */}
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                "text-xs font-medium uppercase tracking-wider",
                concluido ? "text-primary" : "text-muted-foreground"
              )}
              role="status"
              aria-live="polite"
            >
              {concluido ? "Descanso concluído — bora!" : "Descanso"}
            </p>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {concluido
                ? "Siga para a próxima série quando estiver pronto."
                : `Respire e prepare a próxima série.`}
            </p>
          </div>

          {/* Ações */}
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={adicionar15s}
              className="inline-flex min-h-12 items-center gap-1.5 rounded-2xl border border-border bg-background px-3.5 text-sm font-semibold transition-all hover:border-primary/50 hover:text-primary active:scale-95"
            >
              <Plus className="size-4" aria-hidden="true" />
              15s
            </button>

            <button
              type="button"
              onClick={onFechar}
              className="inline-flex min-h-12 items-center gap-1.5 rounded-2xl bg-gradient-primary px-4 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:opacity-95 active:scale-95"
            >
              <Forward className="size-4" aria-hidden="true" />
              Pular
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
