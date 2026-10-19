import Link from "next/link";
import { Dumbbell, ExternalLink, Globe, Plus, UserRound } from "lucide-react";

import { getExercicios } from "@/app/actions/exercicios";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/database.types";

export const metadata = {
  title: "Biblioteca de Exercícios | Painel FitApp",
  description:
    "Catálogo de exercícios: os globais e os criados pelo Personal Trainer.",
};

function ExercicioCard({ exercicio }: { exercicio: Tables<"exercicios_catalogo"> }) {
  const ehGlobal = exercicio.professional_id === null;

  return (
    <li className="flex flex-col rounded-xl border border-border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <h2 className="min-w-0 truncate font-medium">{exercicio.nome}</h2>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
            ehGlobal ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
          )}
          title={ehGlobal ? "Exercício global do FitApp" : "Exercício deste profissional"}
        >
          {ehGlobal ? <Globe className="size-3" /> : <UserRound className="size-3" />}
          {ehGlobal ? "Global" : "Meu"}
        </span>
      </div>

      <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {exercicio.grupo_muscular}
      </p>

      {exercicio.instrucoes ? (
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
          {exercicio.instrucoes}
        </p>
      ) : (
        <p className="mt-2 text-sm italic text-muted-foreground/70">
          Sem instruções registadas.
        </p>
      )}

      {exercicio.video_gif_url ? (
        <a
          href={exercicio.video_gif_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 self-start text-sm font-medium text-primary transition hover:underline"
        >
          Ver vídeo / GIF
          <ExternalLink className="size-3.5" />
        </a>
      ) : null}
    </li>
  );
}

function EmptyState() {
  return (
    <section className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center">
      <span
        className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary"
        aria-hidden="true"
      >
        <Dumbbell className="size-7" />
      </span>

      <h2 className="mt-5 text-lg font-semibold">Biblioteca vazia</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Comece por registar os exercícios que usa nos treinos. Eles ficam
        disponíveis para montar as fichas dos seus alunos.
      </p>

      <Link
        href="/dashboard/exercicios/novo"
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90"
      >
        <Plus className="size-4" />
        Adicionar o primeiro exercício
      </Link>
    </section>
  );
}

export default async function ExerciciosPage() {
  const exercicios = await getExercicios();

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Biblioteca de Exercícios
          </h1>
          <p className="text-sm text-muted-foreground">
            {exercicios.length === 0
              ? "Registe exercícios para os usar nas fichas de treino."
              : `${exercicios.length} exercício${exercicios.length === 1 ? "" : "s"} ${exercicios.length === 1 ? "disponível" : "disponíveis"} (globais + seus).`}
          </p>
        </div>

        <Link
          href="/dashboard/exercicios/novo"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90"
        >
          <Plus className="size-4" />
          Adicionar Exercício
        </Link>
      </header>

      {exercicios.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {exercicios.map((exercicio) => (
            <ExercicioCard key={exercicio.id} exercicio={exercicio} />
          ))}
        </ul>
      )}
    </div>
  );
}
