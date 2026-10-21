"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check, Dumbbell, Weight } from "lucide-react";

import { registrarLog } from "@/app/actions/execucao";
import { RestTimer } from "@/components/aluno/rest-timer";
import { cn } from "@/lib/utils";
import type { DiaTreinoAluno, ItemTreinoAluno } from "@/types/treino-aluno";

type DescansoAtivo = { chave: string; segundos: number };

/**
 * Extrai o primeiro número de um texto livre de carga/repetições
 * ("20 kg" → 20, "8-12" → 8, "AMRAP" → null).
 */
function extrairNumero(texto: string | null | undefined): number | null {
  if (!texto) return null;
  const correspondencia = texto.replace(",", ".").match(/\d+(?:\.\d+)?/);
  if (!correspondencia) return null;
  const valor = Number(correspondencia[0]);
  return Number.isFinite(valor) ? valor : null;
}

/**
 * Repetições como número — numa faixa ("8-12", "8 x 12") usa o limite
 * superior (melhor cenário de execução); texto não numérico → null.
 */
function repeticoesEmNumero(texto: string | null): number | null {
  if (!texto) return null;
  const faixa = texto.match(
    /(\d+(?:[.,]\d+)?)\s*[-–x×]\s*(\d+(?:[.,]\d+)?)/i
  );
  if (faixa) {
    return Math.max(
      Number(faixa[1].replace(",", ".")),
      Number(faixa[2].replace(",", "."))
    );
  }
  return extrairNumero(texto);
}

/**
 * Tonelagem de UMA série (repetições × carga), ou null quando o item
 * não é quantificável (sem carga numérica ou "AMRAP").
 */
function tonelagemPorSerie(item: ItemTreinoAluno): number | null {
  const carga = extrairNumero(item.cargaSugerida);
  const repeticoes = repeticoesEmNumero(item.repeticoes);
  if (carga == null || repeticoes == null) return null;
  return repeticoes * carga;
}

/** Tonelagem total prevista de um dia: Σ (séries × repetições × carga). */
function calcularTonelagemDia(itens: ItemTreinoAluno[]): number {
  return itens.reduce((soma, item) => {
    const porSerie = tonelagemPorSerie(item);
    return porSerie == null ? soma : soma + item.series * porSerie;
  }, 0);
}

function formatarKg(valor: number): string {
  return new Intl.NumberFormat("pt-PT", {
    maximumFractionDigits: 0,
  }).format(Math.round(valor));
}

/**
 * Navegação de dias + lista de exercícios do WebApp do aluno
 * (mobile-first: coluna única, alvos de toque ≥ 48px).
 *
 * Marcar uma série é otimista: o estado atualiza na hora e o
 * `registrarLog` corre em background — em falha, o checkbox é revertido e
 * um aviso efémero é mostrado. Cada série concluída dispara o
 * `RestTimer` (barra fixa em baixo) com o `descanso_segundos` do item.
 *
 * O painel de progresso do dia deriva do mesmo estado (`feitas`) — não há
 * segunda fonte de verdade a sincronizar.
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

  // Progresso do dia — derivado do estado `feitas` (fonte única).
  const seriesTotais = dia.itens.reduce((soma, item) => soma + item.series, 0);
  const seriesFeitasDia = dia.itens.reduce(
    (soma, item) => soma + seriesDoItem(item).filter(Boolean).length,
    0
  );
  const exerciciosConcluidos = dia.itens.filter((item) =>
    seriesDoItem(item).every(Boolean)
  ).length;
  const percentual = seriesTotais > 0 ? (seriesFeitasDia / seriesTotais) * 100 : 0;
  const diaConcluido = seriesTotais > 0 && seriesFeitasDia >= seriesTotais;

  // Tonelagem estimada do dia (séries × reps × carga) e quanto já foi
  // "conquistado" — feedback imediato de esforço estilo Hevy/Strong.
  const tonelagemTotal = calcularTonelagemDia(dia.itens);
  const tonelagemFeita = dia.itens.reduce((soma, item) => {
    const porSerie = tonelagemPorSerie(item);
    if (porSerie == null) return soma;
    return soma + seriesDoItem(item).filter(Boolean).length * porSerie;
  }, 0);

  return (
    <>
      {/* Tabs horizontais dos dias — segmented control */}
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
                    "flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-all duration-200 active:scale-[0.97]",
                    ativo
                      ? "border-transparent bg-gradient-primary text-primary-foreground shadow-md shadow-primary/30"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
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

      {/* Tonelagem estimada do dia — esforço total em kg */}
      {dia.itens.length > 0 ? (
        <section
          aria-label="Tonelagem do dia"
          className="relative mt-4 overflow-hidden rounded-2xl bg-gradient-primary p-4 text-primary-foreground shadow-lg shadow-primary/30 motion-safe:animate-fade-in-up"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-8 -top-10 size-32 rounded-full bg-primary-foreground/15 blur-2xl"
          />
          <div className="relative flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-primary-foreground/80">
                Tonelagem do dia
              </p>
              <p className="mt-0.5 text-3xl font-extrabold tabular-nums tracking-tight">
                {tonelagemTotal > 0 ? formatarKg(tonelagemTotal) : "—"}
                <span className="ml-1 text-base font-semibold text-primary-foreground/80">
                  kg
                </span>
              </p>
              <p className="mt-1 text-[11px] leading-snug text-primary-foreground/75">
                {tonelagemFeita > 0
                  ? `${formatarKg(tonelagemFeita)} kg já conquistados · estimado com séries × repetições × carga`
                  : "Estimada com séries × repetições × carga sugerida"}
              </p>
            </div>
            <span
              className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary-foreground/15 ring-1 ring-inset ring-primary-foreground/25"
              aria-hidden="true"
            >
              <Weight className="size-6" />
            </span>
          </div>
        </section>
      ) : null}

      {/* Resumo de progresso do dia */}
      {dia.itens.length > 0 ? (
        <section
          aria-label="Progresso do dia"
          className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Progresso do dia
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                <span className="font-bold text-foreground">{seriesFeitasDia}</span>
                /{seriesTotais} séries ·{" "}
                <span className="font-bold text-foreground">
                  {exerciciosConcluidos}
                </span>
                /{dia.itens.length} exercícios
              </p>
            </div>

            <span
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-sm font-bold tabular-nums",
                diaConcluido
                  ? "bg-gradient-primary text-primary-foreground shadow-md shadow-primary/30 motion-safe:animate-scale-in"
                  : "bg-primary/10 text-primary"
              )}
            >
              {Math.round(percentual)}%
            </span>
          </div>

          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(percentual)}
            aria-label="Progresso das séries do dia"
          >
            <div
              className="h-full rounded-full bg-gradient-primary transition-[width] duration-500 ease-out"
              style={{ width: `${percentual}%` }}
            />
          </div>
        </section>
      ) : null}

      {erroSync ? (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs text-destructive motion-safe:animate-scale-in"
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
          dia.itens.map((item, indice) => (
            <CartaoExercicio
              key={item.id}
              item={item}
              indice={indice}
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
  indice,
  marcadas,
  onAlternar,
}: {
  item: ItemTreinoAluno;
  indice: number;
  marcadas: boolean[];
  onAlternar: (item: ItemTreinoAluno, indice: number) => void;
}) {
  const totalFeitas = marcadas.filter(Boolean).length;
  const concluido = totalFeitas >= item.series;
  const progresso = item.series > 0 ? (totalFeitas / item.series) * 100 : 0;

  return (
    <article
      className={cn(
        "rounded-2xl border bg-card p-4 shadow-sm transition-all duration-300 motion-safe:animate-fade-in-up",
        concluido
          ? "border-primary/40 ring-1 ring-inset ring-primary/20"
          : "border-border hover:border-primary/30 hover:shadow-md"
      )}
      style={{ animationDelay: `${Math.min(indice, 8) * 60}ms` }}
    >
      <div className="flex items-start gap-3">
        {/* Badge de posição no dia */}
        <span
          className={cn(
            "mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl text-xs font-bold",
            concluido
              ? "bg-gradient-primary text-primary-foreground shadow-md shadow-primary/30"
              : "bg-primary/10 text-primary"
          )}
          aria-hidden="true"
        >
          {concluido ? <Check className="size-4" strokeWidth={3} /> : indice + 1}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-base font-semibold leading-tight">{item.nome}</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {item.grupoMuscular}
              </p>
            </div>

            <div className="shrink-0 text-right">
              <p className="rounded-lg bg-muted px-2.5 py-1 text-sm font-bold tabular-nums leading-tight">
                {item.series} × {item.repeticoes ?? "—"}
              </p>
              {item.cargaSugerida ? (
                <p className="mt-1 text-xs font-medium text-primary">
                  {item.cargaSugerida}
                </p>
              ) : null}
            </div>
          </div>

          {concluido ? (
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-gradient-primary px-2.5 py-0.5 text-[11px] font-semibold text-primary-foreground shadow-md shadow-primary/25 motion-safe:animate-scale-in">
              <Check className="size-3" strokeWidth={3} aria-hidden="true" />
              Concluído
            </span>
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
          className="mt-3.5 aspect-video w-full rounded-2xl border border-border object-cover ring-1 ring-inset ring-black/5"
        />
      ) : null}

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Séries
        </p>
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{totalFeitas}</span>/
          {item.series} feitas
        </p>
      </div>

      {/* Barra de progresso por exercício */}
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            concluido ? "bg-gradient-primary" : "bg-primary/70"
          )}
          style={{ width: `${progresso}%` }}
        />
      </div>

      <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {marcadas.map((marcada, indiceSerie) => (
          <li key={indiceSerie}>
            <button
              type="button"
              role="checkbox"
              aria-checked={marcada}
              aria-label={`Série ${indiceSerie + 1} de ${item.nome}`}
              onClick={() => onAlternar(item, indiceSerie)}
              className={cn(
                "flex min-h-14 w-full items-center gap-2.5 rounded-2xl border px-3 py-2.5 text-sm font-semibold shadow-sm transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-card active:translate-y-0 active:scale-[0.94]",
                marcada
                  ? "border-transparent bg-gradient-primary text-primary-foreground shadow-lg shadow-primary/40"
                  : "border-border bg-background hover:border-primary/50 hover:bg-primary/5 hover:shadow-md hover:shadow-primary/10"
              )}
            >
              <span
                className={cn(
                  "grid size-6 shrink-0 place-items-center rounded-xl border transition-colors duration-200",
                  marcada
                    ? "border-primary-foreground/40 bg-primary-foreground/25 motion-safe:animate-check-pop"
                    : "border-input bg-card"
                )}
                aria-hidden="true"
              >
                {marcada ? <Check className="size-4" strokeWidth={3} /> : null}
              </span>
              <span className="tabular-nums">Série {indiceSerie + 1}</span>
            </button>
          </li>
        ))}
      </ul>

      {item.instrucoes ? (
        <details className="mt-3 group rounded-xl bg-muted/60 px-3.5 py-2.5 text-xs text-muted-foreground">
          <summary className="flex cursor-pointer items-center justify-between gap-2 font-medium text-foreground">
            <span className="flex items-center gap-1.5">
              <Dumbbell className="size-3.5" aria-hidden="true" />
              Como executar
            </span>
            <span
              className="text-muted-foreground transition-transform group-open:rotate-180"
              aria-hidden="true"
            >
              ▾
            </span>
          </summary>
          <p className="mt-1.5 whitespace-pre-line leading-relaxed">
            {item.instrucoes}
          </p>
        </details>
      ) : null}
    </article>
  );
}
