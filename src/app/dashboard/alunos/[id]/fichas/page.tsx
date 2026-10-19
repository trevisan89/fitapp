import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ClipboardList, MessageCircle, Plus } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { cn, getIniciais } from "@/lib/utils";
import type { Tables } from "@/types/database.types";

function FichaCard({ ficha }: { ficha: Tables<"fichas_treino"> }) {
  const criadaEm = new Date(ficha.created_at).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <li className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
      <span
        className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"
        aria-hidden="true"
      >
        <ClipboardList className="size-5" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate font-medium">{ficha.titulo}</p>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
              ficha.ativa ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            )}
          >
            {ficha.ativa ? "Ativa" : "Inativa"}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Criada em {criadaEm}</p>
      </div>
    </li>
  );
}

function EmptyState({ alunoId }: { alunoId: string }) {
  return (
    <section className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center">
      <span
        className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary"
        aria-hidden="true"
      >
        <ClipboardList className="size-7" />
      </span>

      <h2 className="mt-5 text-lg font-semibold">Sem fichas de treino</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Este aluno ainda não tem fichas. Crie a primeira para montar os dias de
        treino, escolher os exercícios e definir séries, repetições e cargas.
      </p>

      <Link
        href={`/dashboard/alunos/${alunoId}/fichas/nova`}
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90"
      >
        <Plus className="size-4" />
        Criar Nova Ficha
      </Link>
    </section>
  );
}

export default async function FichasAlunoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();

  const { data: aluno, error: alunoError } = await supabase
    .from("alunos")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  // 22P02 = "invalid input syntax for type uuid" (id malformado na URL)
  if (alunoError && alunoError.code !== "22P02") {
    throw new Error(`Não foi possível carregar o aluno: ${alunoError.message}`);
  }

  if (!aluno) {
    notFound();
  }

  const { data: fichas, error: fichasError } = await supabase
    .from("fichas_treino")
    .select("*")
    .eq("aluno_id", aluno.id)
    .order("created_at", { ascending: false });

  if (fichasError) {
    throw new Error(`Não foi possível carregar as fichas: ${fichasError.message}`);
  }

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Voltar ao painel
      </Link>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
            aria-hidden="true"
          >
            {getIniciais(aluno.nome)}
          </span>

          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Fichas de treino
            </p>
            <h1 className="truncate text-2xl font-semibold tracking-tight">
              {aluno.nome}
            </h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              {aluno.whatsapp ? (
                <span className="inline-flex items-center gap-1.5">
                  <MessageCircle className="size-3.5" />
                  {aluno.whatsapp}
                </span>
              ) : (
                <span>Sem WhatsApp</span>
              )}
              {!aluno.ativo ? (
                <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium">
                  Aluno inativo
                </span>
              ) : null}
            </p>
          </div>
        </div>

        <Link
          href={`/dashboard/alunos/${aluno.id}/fichas/nova`}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90"
        >
          <Plus className="size-4" />
          Criar Nova Ficha
        </Link>
      </header>

      {fichas.length === 0 ? (
        <EmptyState alunoId={aluno.id} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {fichas.map((ficha) => (
            <FichaCard key={ficha.id} ficha={ficha} />
          ))}
        </ul>
      )}
    </div>
  );
}
