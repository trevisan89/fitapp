"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check } from "lucide-react";

import { registrarLog } from "@/app/actions/execucao";
import { RestTimer } from "@/components/aluno/rest-timer";
import { cn } from "@/lib/utils";
import type { DiaTreinoAluno, ItemTreinoAluno } from "@/types/treino-aluno";

type DescansoAtivo = { chave: string; segundos: number };

/**
 * Navegação de dias + lista de exercícios do WebApp do aluno
 * (mobile-first: coluna única, alvos de toque ≥ 48px).
 *
 * Marcar uma série é otimista: o estado atualiza na hora e o
 * `registrarLog` corre em background — em falha, o checkbox é revertido e
 * um aviso efémero é mostrado. Cada série concluída dispara o
 * `RestTimer` (barra fixa em baixo) com o `descanso_segundos` do item.
 */
export function ExecucaoTreino({
  token,
  dias,
}: {
  token: string;
  dias: DiaTreinoAluno[];
}) {
  const [diaAtivoId, setDiaAtivoId] = useState(dias[0]?.id ?? "");
  const [feitas, setFeitas] = useState<Record<string, boolean[]>>({});
  const [descanso, setDescanso] = useState<DescansoAtivo | null>(null);
  const [erroSync, setErroSync] = useState<string | null>(null);

  const dia = dias.find((d) => d.id === diaAtivoId) ?? dias[0];

  // Some com o aviso de falha de sincronização sozinho.
  useEffect(() => {
    if (!erroSync) return;
    const tempo = window.setTimeout(() => setErroSync(null), 5000);
    return () => window.clearTimeout(tempo);
  }, [erroSync]);

  function seriesDoItem(item: ItemTreinoAluno): boolean[] {
    return feitas[item.id] ?? Array.from({ length: item.series }, () => false);
  }

  function alternarSerie(item: ItemTreinoAluno, indice: number) {
    const anterior = seriesDoItem(item);
    const proximo = anterior.map((marcada, i) =>
      i === indice ? !marcada : marcada
    );
    const marcou = proximo[indice];
    const totalFeitas = proximo.filter(Boolean).length;

    // 1. UI otimista
    setFeitas((estado) => ({ ...estado, [item.id]: proximo }));

    // 2. Cronômetro de descanso ao concluir uma série
    if (marcou && item.descansoSegundos != null && item.descansoSegundos > 0) {
      setDescanso({
        chave: `${item.id}-${indice}-${totalFeitas}-${Date.now()}`,
        segundos: item.descansoSegundos,
      });
    }

    // 3. Gravação em background — falha ⇒ revert + aviso
    void registrarLog({
      token,
      treinoItemId: item.id,
      seriesFeitas: totalFeitas,
      concluido: totalFeitas >= item.series,
    })
      .then((resultado) => {
        if (!resultado.sucesso) {
          setFeitas((estado) => ({ ...estado, [item.id]: anterior }));
          setErroSync(resultado.erro ?? "Não foi possível registar a execução.");
        }
      })
      .catch(() => {
        setFeitas((estado) => ({ ...estado, [item.id]: anterior }));
        setErroSync("Sem ligação — alteração não guardada.");
      });
  }

  if (dias.length === 0 || !dia) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
        Esta ficha ainda não tem dias de treino.
      </p>
    );
  }

  return (
    <>
      {/* Tabs horizontais dos dias */}
      <nav aria-label="Dias do treino" className="-mx-4 overflow-x-auto px-4">
        <ul className="flex min-w-max gap-2 pb-1">
          {dias.map((itemDia) => {
            const ativo = itemDia.id === dia.id;
            const rotulo = itemDia.nome?.trim()
              ? itemDia.nome
              : `Treino ${itemDia.letra}`;

            return (
              <li key={itemDia.id}>
                <button
                  type="button"
                  onClick={() => setDiaAtivoId(itemDia.id)}
                  aria-current={ativo ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition",
                    ativo
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-bold",
                      ativo
                        ? "bg-primary-foreground/25 text-primary-foreground"
                        : "bg-primary/10 text-primary"
                    )}
                    aria-hidden="true"
                  >
                    {itemDia.letra}
                  </span>
                  {rotulo}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {erroSync ? (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs text-destructive"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          {erroSync}
        </div>
      ) : null}

      <section className="mt-4 space-y-4">
        {dia.itens.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
            Este dia ainda não tem exercícios.
          </p>
        ) : (
          dia.itens.map((item) => (
            <CartaoExercicio
              key={item.id}
              item={item}
              marcadas={seriesDoItem(item)}
              onAlternar={alternarSerie}
            />
          ))
        )}
      </section>

      {descanso ? (
        <RestTimer
          key={descanso.chave}
          segundosIniciais={descanso.segundos}
          onFechar={() => setDescanso(null)}
        />
      ) : null}
    </>
  );
}

function CartaoExercicio({
  item,
  marcadas,
  onAlternar,
}: {
  item: ItemTreinoAluno;
  marcadas: boolean[];
  onAlternar: (item: ItemTreinoAluno, indice: number) => void;
}) {
  const totalFeitas = marcadas.filter(Boolean).length;

  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold leading-tight">{item.nome}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {item.grupoMuscular}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-base font-bold leading-tight text-primary">
            {item.series} × {item.repeticoes ?? "—"}
          </p>
          {item.cargaSugerida ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {item.cargaSugerida}
            </p>
          ) : null}
        </div>
      </div>

      {item.videoGifUrl ? (
        // URL externa arbitrária (conteúdo do profissional) — o componente
        // de imagem do Next exige domínios configurados em next.config.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.videoGifUrl}
          alt={`Demonstração de ${item.nome}`}
          loading="lazy"
          className="mt-3 aspect-video w-full rounded-xl border border-border object-cover"
        />
      ) : null}

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Séries
        </p>
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{totalFeitas}</span>/
          {item.series} feitas
        </p>
      </div>

      <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {marcadas.map((marcada, indice) => (
          <li key={indice}>
            <button
              type="button"
              role="checkbox"
              aria-checked={marcada}
              aria-label={`Série ${indice + 1} de ${item.nome}`}
              onClick={() => onAlternar(item, indice)}
              className={cn(
                "flex min-h-12 w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition active:scale-[0.98]",
                marcada
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:border-primary/50"
              )}
            >
              <span
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded-md border",
                  marcada
                    ? "border-primary-foreground/40 bg-primary-foreground/25"
                    : "border-input"
                )}
                aria-hidden="true"
              >
                {marcada ? <Check className="size-3.5" strokeWidth={3} /> : null}
              </span>
              Série {indice + 1}
            </button>
          </li>
        ))}
      </ul>

      {item.instrucoes ? (
        <details className="mt-3 rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          <summary className="cursor-pointer font-medium text-foreground">
            Como executar
          </summary>
          <p className="mt-1.5 whitespace-pre-line leading-relaxed">
            {item.instrucoes}
          </p>
        </details>
      ) : null}
    </article>
  );
}
