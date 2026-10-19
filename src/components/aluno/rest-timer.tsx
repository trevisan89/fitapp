"use client";

import { useEffect, useState } from "react";
import { AlarmClock, Forward, Plus } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Cronômetro de descanso do aluno — barra fixa no fundo do ecrã,
 * não intrusiva (aparece quando uma série é concluída) com `+15s` e
 * `Pular`. Ao chegar a zero, mostra "Descanso concluído" e espera o
 * fecho do próprio aluno (não desaparece debaixo dos olhos dele).
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
  const progresso = concluido
    ? 0
    : Math.min(100, Math.max(0, (restantes / Math.max(total, 1)) * 100));

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 shadow-[0_-8px_24px_rgba(0,0,0,0.12)] backdrop-blur">
      <div className="mx-auto w-full max-w-lg px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <AlarmClock className="size-3.5" aria-hidden="true" />
              {concluido ? "Descanso concluído" : "Descanso"}
            </p>
            <p className="text-2xl font-bold tabular-nums leading-tight">
              {String(minutos).padStart(2, "0")}:
              {String(segundos).padStart(2, "0")}
            </p>
            <div
              className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={restantes}
              aria-label="Tempo de descanso restante"
            >
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-1000 ease-linear",
                  concluido ? "bg-primary" : "bg-primary/70"
                )}
                style={{ width: `${progresso}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={adicionar15s}
            className="inline-flex min-h-12 shrink-0 items-center gap-1.5 rounded-xl border border-border bg-background px-4 text-sm font-semibold transition hover:border-primary/50 active:scale-95"
          >
            <Plus className="size-4" aria-hidden="true" />
            +15s
          </button>

          <button
            type="button"
            onClick={onFechar}
            className="inline-flex min-h-12 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 active:scale-95"
          >
            <Forward className="size-4" aria-hidden="true" />
            Pular
          </button>
        </div>
      </div>
    </div>
  );
}
