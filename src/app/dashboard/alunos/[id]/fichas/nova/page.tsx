import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getExercicios } from "@/app/actions/exercicios";
import { WorkoutBuilder } from "@/components/fichas/workout-builder";
import { createClient } from "@/lib/supabase/server";

export default async function NovaFichaPage({
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

  if (alunoError && alunoError.code !== "22P02") {
    throw new Error(`Não foi possível carregar o aluno: ${alunoError.message}`);
  }

  if (!aluno) {
    notFound();
  }

  // Catálogo (globais + do profissional) para a barra arrastável do builder.
  const catalogoExercicios = await getExercicios();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/alunos/${aluno.id}/fichas`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Voltar às fichas
        </Link>

        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Nova Ficha</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Aluno: <span className="font-medium text-foreground">{aluno.nome}</span> —
          arraste exercícios do catálogo para os dias e guarde a ficha.
        </p>
      </div>

      <WorkoutBuilder alunoId={aluno.id} catalogoExercicios={catalogoExercicios} />
    </div>
  );
}
