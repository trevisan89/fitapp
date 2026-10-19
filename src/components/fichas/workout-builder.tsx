"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertCircle,
  CheckCircle2,
  GripVertical,
  Info,
  Loader2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import { createFicha } from "@/app/actions/fichas";
import { cn } from "@/lib/utils";
import { fichaPayloadSchema } from "@/lib/validators/ficha";
import type { Tables } from "@/types/database.types";

/**
 * Montador de fichas de treino ligado ao catálogo real.
 *
 * - Barra de catálogo arrastável (exercícios globais + do profissional);
 * - Colunas de dias com `SortableContext` (reordenação intra/inter dias);
 * - Cada exercício solto num dia cria um item com estado próprio
 *   (séries, repetições, carga sugerida, descanso, ordem);
 * - "Guardar Ficha" persiste via Server Action `createFicha`
 *   (`fichas_treino` → `treino_dias` → `treino_itens`).
 */

/* --------------------------------- Modelo -------------------------------- */

/** Estado de um exercício colocado num dia (vira `treino_itens`). */
type ExercicioItemEstado = {
  /** Id único da instância na ficha. */
  id: string;
  exercicioId: string;
  nome: string;
  grupoMuscular: string;
  series: number | null;
  /** Texto livre: "8-12", "30 s", "AMRAP"... */
  repeticoes: string;
  cargaSugerida: string;
  descansoSegundos: number | null;
  ordem: number;
};

type DiaTreino = {
  id: string;
  letra: string;
  nome: string;
  itens: ExercicioItemEstado[];
};

type AlvoArrasto =
  | { tipo: "dia"; diaId: string }
  | { tipo: "instancia"; diaId: string; indice: number }
  | { tipo: "fora" };

type ItemArrasto =
  | { tipo: "catalogo"; exercicio: Tables<"exercicios_catalogo"> }
  | { tipo: "instancia"; item: ExercicioItemEstado };

type Feedback = { type: "success" | "error"; message: string };

const PREFIXO_CATALOGO = "cat:";
const PREFIXO_INSTANCIA = "inst:";

const DIAS_INICIAIS: DiaTreino[] = [
  { id: "dia-a", letra: "A", nome: "Treino A", itens: [] },
  { id: "dia-b", letra: "B", nome: "Treino B", itens: [] },
];

const INPUT_CLASSES =
  "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40";

/* -------------------------------- Helpers -------------------------------- */

type LocalInstancia = {
  diaId: string;
  indice: number;
  item: ExercicioItemEstado;
};

function localizarInstancia(
  dias: DiaTreino[],
  itemId: string
): LocalInstancia | null {
  for (const dia of dias) {
    const indice = dia.itens.findIndex((item) => item.id === itemId);
    if (indice !== -1) {
      return { diaId: dia.id, indice, item: dia.itens[indice] };
    }
  }
  return null;
}

function resolverAlvo(overId: string, dias: DiaTreino[]): AlvoArrasto {
  const dia = dias.find((d) => d.id === overId);
  if (dia) return { tipo: "dia", diaId: dia.id };

  const local = localizarInstancia(dias, overId);
  if (local) {
    return { tipo: "instancia", diaId: local.diaId, indice: local.indice };
  }

  return { tipo: "fora" };
}

/** Insere um item numa coluna e recalcula a `ordem` dessa coluna. */
function inserirInstancia(
  dias: DiaTreino[],
  diaId: string,
  indice: number,
  item: ExercicioItemEstado
): DiaTreino[] {
  return dias.map((dia) => {
    if (dia.id !== diaId) return dia;

    const itens = [...dia.itens];
    const posicao = Math.max(0, Math.min(indice, itens.length));
    itens.splice(posicao, 0, item);

    return { ...dia, itens: itens.map((i, ordem) => ({ ...i, ordem })) };
  });
}

/** Remove um item de qualquer coluna e recalcula as ordens. */
function removerInstancia(dias: DiaTreino[], itemId: string): DiaTreino[] {
  return dias.map((dia) => ({
    ...dia,
    itens: dia.itens
      .filter((item) => item.id !== itemId)
      .map((item, ordem) => ({ ...item, ordem })),
  }));
}

/**
 * Move/reordena uma instância existente: `arrayMove` na mesma coluna,
 * remoção + inserção entre colunas (índice do item sobrevoado ou fim).
 */
function moverInstancia(
  dias: DiaTreino[],
  itemId: string,
  alvo: AlvoArrasto
): DiaTreino[] {
  if (alvo.tipo === "fora") return dias;

  const origem = localizarInstancia(dias, itemId);
  if (!origem) return dias;

  if (origem.diaId === alvo.diaId) {
    const dia = dias.find((d) => d.id === alvo.diaId);
    if (!dia) return dias;

    // Drop sobre a própria coluna = mover para o fim.
    const destino = alvo.tipo === "instancia" ? alvo.indice : dia.itens.length;
    if (origem.indice === destino) return dias;

    return dias.map((d) =>
      d.id === alvo.diaId
        ? {
            ...d,
            itens: arrayMove(d.itens, origem.indice, destino).map(
              (item, ordem) => ({ ...item, ordem })
            ),
          }
        : d
    );
  }

  const semItem = removerInstancia(dias, itemId);
  const indice = alvo.tipo === "instancia" ? alvo.indice : Number.MAX_SAFE_INTEGER;
  return inserirInstancia(semItem, alvo.diaId, indice, origem.item);
}

function atualizarItem(
  dias: DiaTreino[],
  itemId: string,
  patch: Partial<ExercicioItemEstado>
): DiaTreino[] {
  const local = localizarInstancia(dias, itemId);
  if (!local) return dias;

  return dias.map((dia) =>
    dia.id === local.diaId
      ? {
          ...dia,
          itens: dia.itens.map((item) =>
            item.id === itemId ? { ...item, ...patch } : item
          ),
        }
      : dia
  );
}

/** Cria o estado próprio do exercício quando cai num dia. */
function criarInstancia(
  exercicio: Tables<"exercicios_catalogo">
): ExercicioItemEstado {
  return {
    id: `${PREFIXO_INSTANCIA}${crypto.randomUUID()}`,
    exercicioId: exercicio.id,
    nome: exercicio.nome,
    grupoMuscular: exercicio.grupo_muscular,
    series: null,
    repeticoes: "",
    cargaSugerida: "",
    descansoSegundos: null,
    ordem: 0,
  };
}

function resumoItem(item: ExercicioItemEstado): string {
  const partes: string[] = [];

  if (item.series != null && item.repeticoes.trim().length > 0) {
    partes.push(`${item.series}×${item.repeticoes.trim()}`);
  } else if (item.series != null) {
    partes.push(`${item.series} séries`);
  } else if (item.repeticoes.trim().length > 0) {
    partes.push(item.repeticoes.trim());
  }

  if (item.cargaSugerida.trim().length > 0) {
    partes.push(item.cargaSugerida.trim());
  }

  if (item.descansoSegundos != null) {
    partes.push(`${item.descansoSegundos}s descanso`);
  }

  return partes.length > 0 ? partes.join(" · ") : "Sem parâmetros definidos";
}

/**
 * Estratégia de colisão para o esquema misto catálogo → dias:
 * - com ponteiro: só aceita droppables sob o cursor (soltar fora dos dias
 *   é cancelado), preferindo o item sobre a coluna para inserção precisa;
 * - sem ponteiro (teclado): centro mais próximo, sem considerar o ativo.
 */
const detectarColisao: CollisionDetection = (args) => {
  const { active, pointerCoordinates } = args;

  if (!pointerCoordinates) {
    const candidatos = args.droppableContainers.filter(
      (container) => String(container.id) !== String(active.id)
    );
    return closestCenter({ ...args, droppableContainers: candidatos });
  }

  const dentro = pointerWithin(args).filter(
    (colisao) => String(colisao.id) !== String(active.id)
  );

  if (dentro.length === 0) return [];

  const instancia = dentro.find((colisao) =>
    String(colisao.id).startsWith(PREFIXO_INSTANCIA)
  );

  return instancia ? [instancia] : [dentro[0]];
};

/* ------------------------------ Catálogo ---------------------------------- */

function ItemCatalogo({
  exercicio,
}: {
  exercicio: Tables<"exercicios_catalogo">;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `${PREFIXO_CATALOGO}${exercicio.id}`,
      data: { tipo: "catalogo" },
    });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-1 rounded-lg border border-border bg-background p-2 shadow-sm transition",
        isDragging ? "opacity-40" : "hover:border-primary/40"
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Arrastar ${exercicio.nome}`}
        className="cursor-grab touch-none rounded p-1 text-muted-foreground transition hover:text-foreground active:cursor-grabbing"
      >
        <GripVertical className="size-4" />
      </button>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">
          {exercicio.nome}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {exercicio.grupo_muscular}
        </span>
      </span>

      <Plus className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
    </li>
  );
}

function CatalogoLateral({
  catalogo,
}: {
  catalogo: Tables<"exercicios_catalogo">[];
}) {
  const [filtro, setFiltro] = useState("");

  const filtrados = useMemo(() => {
    const termo = filtro.trim().toLowerCase();
    if (termo.length === 0) return catalogo;
    return catalogo.filter((exercicio) =>
      exercicio.nome.toLowerCase().includes(termo)
    );
  }, [catalogo, filtro]);

  return (
    <aside className="h-fit rounded-xl border border-border bg-card p-3">
      <h2 className="px-1 text-sm font-semibold">Catálogo de exercícios</h2>
      <p className="px-1 text-xs text-muted-foreground">
        Arraste um exercício para um dia de treino.
      </p>

      <div className="relative my-3">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="search"
          value={filtro}
          onChange={(event) => setFiltro(event.target.value)}
          placeholder="Filtrar por nome…"
          aria-label="Filtrar exercícios por nome"
          className="w-full rounded-lg border border-input bg-background py-2 pl-8 pr-3 text-sm outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      </div>

      <ul className="max-h-[26rem] space-y-2 overflow-y-auto pr-1">
        {filtrados.length === 0 ? (
          <li className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
            {catalogo.length === 0 ? (
              <>
                O catálogo está vazio.{" "}
                <Link
                  href="/dashboard/exercicios/novo"
                  className="font-medium text-primary hover:underline"
                >
                  Adicione exercícios
                </Link>
                .
              </>
            ) : (
              "Nenhum exercício corresponde ao filtro."
            )}
          </li>
        ) : (
          filtrados.map((exercicio) => (
            <ItemCatalogo key={exercicio.id} exercicio={exercicio} />
          ))
        )}
      </ul>
    </aside>
  );
}

/* --------------------------- Dias e itens --------------------------------- */

function ItemExercicio({
  item,
  selecionado,
  onSelecionar,
}: {
  item: ExercicioItemEstado;
  selecionado: boolean;
  onSelecionar: (itemId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition: transition ?? undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-1 rounded-lg border bg-background p-2 shadow-sm transition",
        isDragging ? "opacity-40" : "opacity-100",
        selecionado
          ? "border-primary ring-2 ring-primary/30"
          : "border-border hover:border-primary/40"
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Arrastar ${item.nome}`}
        className="cursor-grab touch-none rounded p-1 text-muted-foreground transition hover:text-foreground active:cursor-grabbing"
      >
        <GripVertical className="size-4" />
      </button>

      <button
        type="button"
        onClick={() => onSelecionar(item.id)}
        aria-pressed={selecionado}
        className="min-w-0 flex-1 text-left"
      >
        <span className="block truncate text-sm font-medium">{item.nome}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {resumoItem(item)}
        </span>
      </button>
    </div>
  );
}

function ColunaDia({
  dia,
  selecionadoId,
  onSelecionar,
}: {
  dia: DiaTreino;
  selecionadoId: string | null;
  onSelecionar: (itemId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: dia.id,
    data: { tipo: "dia" },
  });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex min-h-52 flex-col rounded-xl border p-3 transition-colors",
        isOver
          ? "border-primary bg-primary/5 ring-2 ring-primary/30"
          : "border-border bg-card"
      )}
    >
      <header className="flex items-center gap-2 border-b border-border pb-3">
        <span
          className="grid size-6 shrink-0 place-items-center rounded-md bg-primary/10 text-xs font-bold text-primary"
          aria-hidden="true"
        >
          {dia.letra}
        </span>
        <h3 className="text-sm font-semibold">{dia.nome}</h3>
        <span className="ml-auto text-xs text-muted-foreground">
          {dia.itens.length} ex.
        </span>
      </header>

      <div className="mt-3 flex-1 space-y-2">
        <SortableContext
          items={dia.itens.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          {dia.itens.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
              Arraste exercícios do catálogo para cá
            </p>
          ) : (
            dia.itens.map((item) => (
              <ItemExercicio
                key={item.id}
                item={item}
                selecionado={item.id === selecionadoId}
                onSelecionar={onSelecionar}
              />
            ))
          )}
        </SortableContext>
      </div>
    </section>
  );
}

/* --------------------------- Parâmetros ---------------------------------- */

function PainelParametros({
  item,
  onAlterar,
  onRemover,
}: {
  item: ExercicioItemEstado | null;
  onAlterar: (patch: Partial<ExercicioItemEstado>) => void;
  onRemover: () => void;
}) {
  if (!item) {
    return (
      <aside className="h-fit rounded-xl border border-dashed border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Parâmetros do exercício</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Selecione um exercício num dia para definir séries, repetições, carga
          sugerida e descanso.
        </p>
      </aside>
    );
  }

  return (
    <aside className="h-fit rounded-xl border border-border bg-card p-4">
      <h2 className="text-sm font-semibold">Parâmetros do exercício</h2>
      <p className="mt-1 truncate text-sm text-muted-foreground">
        {item.nome} · {item.grupoMuscular}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor="param-series" className="text-xs font-medium">
            Séries <span className="text-destructive">*</span>
          </label>
          <input
            id="param-series"
            type="number"
            min={1}
            inputMode="numeric"
            value={item.series ?? ""}
            onChange={(event) => {
              const valor = event.target.valueAsNumber;
              onAlterar({ series: Number.isNaN(valor) ? null : valor });
            }}
            className={INPUT_CLASSES}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="param-descanso" className="text-xs font-medium">
            Descanso (seg.)
          </label>
          <input
            id="param-descanso"
            type="number"
            min={0}
            step={5}
            inputMode="numeric"
            value={item.descansoSegundos ?? ""}
            onChange={(event) => {
              const valor = event.target.valueAsNumber;
              onAlterar({ descansoSegundos: Number.isNaN(valor) ? null : valor });
            }}
            className={INPUT_CLASSES}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="param-repeticoes" className="text-xs font-medium">
            Repetições
          </label>
          <input
            id="param-repeticoes"
            type="text"
            placeholder="Ex.: 8-12"
            value={item.repeticoes}
            onChange={(event) => onAlterar({ repeticoes: event.target.value })}
            className={INPUT_CLASSES}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="param-carga" className="text-xs font-medium">
            Carga Sugerida
          </label>
          <input
            id="param-carga"
            type="text"
            placeholder="Ex.: 20 kg"
            value={item.cargaSugerida}
            onChange={(event) => onAlterar({ cargaSugerida: event.target.value })}
            className={INPUT_CLASSES}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onRemover}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-destructive/40 px-3 py-2 text-sm font-medium text-destructive transition hover:bg-destructive/10"
      >
        <Trash2 className="size-4" />
        Remover do dia
      </button>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        Estes campos correspondem a{" "}
        <code className="rounded bg-muted px-1 font-mono">series</code>,{" "}
        <code className="rounded bg-muted px-1 font-mono">repeticoes</code>,{" "}
        <code className="rounded bg-muted px-1 font-mono">carga_sugerida</code>{" "}
        e{" "}
        <code className="rounded bg-muted px-1 font-mono">descanso_segundos</code>{" "}
        de <code className="rounded bg-muted px-1 font-mono">treino_itens</code>{" "}
        — gravados ao guardar a ficha.
      </p>
    </aside>
  );
}

/* ------------------------------ Montador ---------------------------------- */

export function WorkoutBuilder({
  alunoId,
  catalogoExercicios,
}: {
  alunoId: string;
  catalogoExercicios: Tables<"exercicios_catalogo">[];
}) {
  const router = useRouter();

  const [dias, setDias] = useState<DiaTreino[]>(DIAS_INICIAIS);
  const [titulo, setTitulo] = useState("Ficha de treino");
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  const [arrasto, setArrasto] = useState<ItemArrasto | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [guardando, setGuardando] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const itemSelecionado = selecionadoId
    ? (localizarInstancia(dias, selecionadoId)?.item ?? null)
    : null;

  function aoIniciarArrasto(event: DragStartEvent) {
    const id = String(event.active.id);

    if (id.startsWith(PREFIXO_CATALOGO)) {
      const exercicio = catalogoExercicios.find(
        (e) => e.id === id.slice(PREFIXO_CATALOGO.length)
      );
      setArrasto(exercicio ? { tipo: "catalogo", exercicio } : null);
      return;
    }

    const local = localizarInstancia(dias, id);
    setArrasto(local ? { tipo: "instancia", item: local.item } : null);
  }

  function aoSobreArrasto(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const ativoId = String(active.id);
    // Catálogo: o item só nasce ao soltar (onDragEnd).
    if (!ativoId.startsWith(PREFIXO_INSTANCIA)) return;

    const alvo = resolverAlvo(String(over.id), dias);
    if (alvo.tipo === "fora") return;

    const origem = localizarInstancia(dias, ativoId);
    // Movimento entre colunas em tempo real; o mesmo dia reordena no fim.
    if (!origem || origem.diaId === alvo.diaId) return;

    setDias((estadoAtual) => moverInstancia(estadoAtual, ativoId, alvo));
  }

  function aoTerminarArrasto(event: DragEndEvent) {
    setArrasto(null);

    const { active, over } = event;
    if (!over) return;

    const ativoId = String(active.id);
    const alvo = resolverAlvo(String(over.id), dias);
    if (alvo.tipo === "fora") return;

    if (ativoId.startsWith(PREFIXO_CATALOGO)) {
      const exercicio = catalogoExercicios.find(
        (e) => e.id === ativoId.slice(PREFIXO_CATALOGO.length)
      );
      if (!exercicio) return;

      const novaInstancia = criarInstancia(exercicio);
      const indice =
        alvo.tipo === "instancia" ? alvo.indice : Number.MAX_SAFE_INTEGER;

      setDias((estadoAtual) =>
        inserirInstancia(estadoAtual, alvo.diaId, indice, novaInstancia)
      );
      setSelecionadoId(novaInstancia.id);
      return;
    }

    setDias((estadoAtual) => moverInstancia(estadoAtual, ativoId, alvo));
  }

  function aoCancelarArrasto() {
    setArrasto(null);
  }

  function alterarSelecionado(patch: Partial<ExercicioItemEstado>) {
    if (!selecionadoId) return;
    setDias((estadoAtual) => atualizarItem(estadoAtual, selecionadoId, patch));
  }

  function removerSelecionado() {
    if (!selecionadoId) return;
    setDias((estadoAtual) => removerInstancia(estadoAtual, selecionadoId));
    setSelecionadoId(null);
  }

  async function guardarFicha(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    const tituloLimpo = titulo.trim();
    if (tituloLimpo.length < 3) {
      setFeedback({
        type: "error",
        message: "Informe um título para a ficha (mínimo de 3 caracteres).",
      });
      return;
    }

    const diasComItens = dias.filter((dia) => dia.itens.length > 0);
    if (diasComItens.length === 0) {
      setFeedback({
        type: "error",
        message: "Adicione exercícios a pelo menos um dia de treino.",
      });
      return;
    }

    const semSeries = diasComItens
      .flatMap((dia) => dia.itens)
      .find((item) => item.series == null);
    if (semSeries) {
      setFeedback({
        type: "error",
        message: `Defina as séries de «${semSeries.nome}» no painel de parâmetros.`,
      });
      return;
    }

    const payload = {
      titulo: tituloLimpo,
      dias: diasComItens.map((dia) => ({
        letra: dia.letra,
        nome: dia.nome,
        itens: dia.itens.map((item, indice) => ({
          exercicioId: item.exercicioId,
          series: item.series,
          repeticoes: item.repeticoes,
          cargaSugerida: item.cargaSugerida,
          descansoSegundos: item.descansoSegundos,
          ordem: indice,
        })),
      })),
    };

    const parsed = fichaPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      setFeedback({
        type: "error",
        message: parsed.error.issues[0]?.message ?? "Dados da ficha inválidos.",
      });
      return;
    }

    setGuardando(true);

    try {
      await createFicha(alunoId, parsed.data.titulo, parsed.data.dias);
      setFeedback({ type: "success", message: "Ficha guardada! A redirecionar…" });
      window.setTimeout(
        () => router.push(`/dashboard/alunos/${alunoId}/fichas`),
        1000
      );
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error ? error.message : "Não foi possível guardar a ficha.",
      });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" />
        <p>
          Arraste do <span className="font-medium text-foreground">catálogo</span>{" "}
          para um dia, reordene dentro ou entre dias, e defina séries,
          repetições, carga e descanso de cada exercício.
        </p>
      </div>

      {feedback ? (
        <div
          role={feedback.type === "error" ? "alert" : "status"}
          className={cn(
            "flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm",
            feedback.type === "success"
              ? "border-primary/30 bg-primary/10 text-primary"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          )}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      ) : null}

      <DndContext
        sensors={sensors}
        collisionDetection={detectarColisao}
        onDragStart={aoIniciarArrasto}
        onDragOver={aoSobreArrasto}
        onDragEnd={aoTerminarArrasto}
        onDragCancel={aoCancelarArrasto}
      >
        <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)_300px]">
          <CatalogoLateral catalogo={catalogoExercicios} />

          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Dias de treino
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {dias.map((dia) => (
                <ColunaDia
                  key={dia.id}
                  dia={dia}
                  selecionadoId={selecionadoId}
                  onSelecionar={setSelecionadoId}
                />
              ))}
            </div>
          </div>

          <PainelParametros
            item={itemSelecionado}
            onAlterar={alterarSelecionado}
            onRemover={removerSelecionado}
          />
        </div>

        <DragOverlay dropAnimation={null}>
          {arrasto?.tipo === "catalogo" ? (
            <div className="w-56 rounded-lg border border-primary bg-card p-2 shadow-lg">
              <p className="truncate text-sm font-medium">
                {arrasto.exercicio.nome}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {arrasto.exercicio.grupo_muscular}
              </p>
            </div>
          ) : arrasto?.tipo === "instancia" ? (
            <div className="w-56 rounded-lg border border-primary bg-card p-2 shadow-lg">
              <p className="truncate text-sm font-medium">{arrasto.item.nome}</p>
              <p className="truncate text-xs text-muted-foreground">
                {resumoItem(arrasto.item)}
              </p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <form
        onSubmit={guardarFicha}
        className="flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div className="w-full space-y-1.5 sm:max-w-md">
          <label htmlFor="titulo-ficha" className="text-sm font-medium">
            Título da ficha <span className="text-destructive">*</span>
          </label>
          <input
            id="titulo-ficha"
            type="text"
            value={titulo}
            onChange={(event) => setTitulo(event.target.value)}
            placeholder="Ex.: Hipertrofia A/B"
            className={INPUT_CLASSES}
          />
        </div>

        <button
          type="submit"
          disabled={guardando || feedback?.type === "success"}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-60"
        >
          {guardando ? <Loader2 className="size-4 animate-spin" /> : null}
          {guardando ? "A guardar…" : "Guardar Ficha"}
        </button>
      </form>
    </div>
  );
}
