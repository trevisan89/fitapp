import Link from "next/link";
import { ArrowRight, MessageCircle, UserPlus, Users } from "lucide-react";

import { getAlunos } from "@/app/actions/alunos";
import { cn, getIniciais } from "@/lib/utils";
import type { Tables } from "@/types/database.types";

export const metadata = {
  title: "Início | Painel FitApp",
  description: "Visão geral da carteira de alunos do Personal Trainer.",
};

function AlunoCard({ aluno, indice }: { aluno: Tables<"alunos">; indice: number }) {
  return (
    <li
      className="group flex flex-col rounded-2xl border border-border bg-card p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 motion-safe:animate-fade-in-up"
      style={{ animationDelay: `${Math.min(indice, 8) * 60}ms` }}
    >
      <div className="flex items-start gap-3">
        <span
          className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-primary text-sm font-semibold text-primary-foreground shadow-md shadow-primary/25"
          aria-hidden="true"
        >
          {getIniciais(aluno.nome)}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-medium">{aluno.nome}</p>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                aluno.ativo
                  ? "bg-primary/10 text-primary ring-1 ring-inset ring-primary/20"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {aluno.ativo ? "Ativo" : "Inativo"}
            </span>
          </div>

          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MessageCircle className="size-3.5 shrink-0" />
            <span className="truncate">{aluno.whatsapp ?? "Sem WhatsApp"}</span>
          </p>
        </div>
      </div>

      <Link
        href={`/dashboard/alunos/${aluno.id}/fichas`}
        className="mt-4 inline-flex items-center justify-between gap-2 rounded-xl bg-muted px-3 py-2 text-sm font-medium transition hover:bg-accent hover:text-accent-foreground active:scale-[0.98]"
      >
        Ver Fichas
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </li>
  );
}

function EmptyState() {
  return (
    <section className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center motion-safe:animate-fade-in-up">
      <span
        className="grid size-14 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-lg shadow-primary/25"
        aria-hidden="true"
      >
        <Users className="size-7" />
      </span>

      <h2 className="mt-5 text-lg font-semibold">Ainda não tem alunos</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Adicione o primeiro aluno para começar a criar fichas de treino, acompanhar a
        evolução e manter o contacto próximo pelo WhatsApp.
      </p>

      <Link
        href="/dashboard/alunos/novo"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-primary/40 hover:opacity-95 active:scale-[0.98]"
      >
        <UserPlus className="size-4" />
        Adicionar o primeiro aluno
      </Link>
    </section>
  );
}

export default async function DashboardPage() {
  const alunos = await getAlunos();

  return (
    <div className="space-y-6">
      {/* Cabeçalho com glow da marca ao fundo */}
      <header className="relative space-y-2 overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-28 right-0 size-64 rounded-full bg-primary/20 blur-3xl"
        />
        <div className="relative flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Início
            </h1>
            <p className="text-sm text-muted-foreground">
              {alunos.length === 0
                ? "Comece por registar o seu primeiro aluno."
                : `${alunos.length} aluno${alunos.length === 1 ? "" : "s"} na sua carteira.`}
            </p>
          </div>

          {alunos.length > 0 ? (
            <span className="hidden shrink-0 rounded-full bg-gradient-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 sm:block">
              {alunos.length} aluno{alunos.length === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>
      </header>

      {alunos.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Botão principal "Adicionar Aluno" */}
          <div className="flex justify-end">
            <Link
              href="/dashboard/alunos/novo"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-primary/40 hover:opacity-95 active:scale-[0.98]"
            >
              <UserPlus className="size-4" />
              Adicionar Aluno
            </Link>
          </div>

          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {alunos.map((aluno, indice) => (
              <AlunoCard key={aluno.id} aluno={aluno} indice={indice} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
