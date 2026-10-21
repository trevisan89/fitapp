import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";

import { getExercicios } from "@/app/actions/exercicios";
import {
  WorkoutBuilder,
  type DiaPreCarregado,
} from "@/components/fichas/workout-builder";
import { createClient } from "@/lib/supabase/server";
import { fichaIdSchema } from "@/lib/validators/ficha";

export default async function NovaFichaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ editar?: string }>;
}) {
  const { id } = await params;
  const { editar } = await searchParams;

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

  // Pré-preenchimento (fluxo "Editar" na listagem de fichas): carrega a
  // ficha original DO MESMO aluno (a RLS restringe ao profissional em
  // sessão) e converte dias/itens para o estado do montador. Ao guardar,
  // o builder cria uma NOVA ficha — a original fica intacta.
  let tituloInicial: string | undefined;
  let diasIniciais: DiaPreCarregado[] | undefined;

  if (editar) {
    const editarParseado = fichaIdSchema.safeParse(editar);
    if (!editarParseado.success) {
      notFound();
    }

    const { data: fichaOriginal } = await supabase
      .from("fichas_treino")
      .select("id, titulo")
      .eq("id", editarParseado.data)
      .eq("aluno_id", id)
      .maybeSingle();

    if (!fichaOriginal) {
      notFound();
    }

    const { data: dias, error: erroDias } = await supabase
      .from("treino_dias")
      .select("id, letra, nome_dia, ordem")
      .eq("ficha_id", fichaOriginal.id)
      .order("ordem");

    if (erroDias) {
      throw new Error(
        `Não foi possível carregar os dias da ficha: ${erroDias.message}`
      );
    }

    const idsDias = (dias ?? []).map((dia) => dia.id);

    let itens: Array<{
      treino_dia_id: string;
      exercicio_id: string;
      series: number;
      repeticoes: string | null;
      carga_sugerida: string | null;
      descanso_segundos: number | null;
    }> = [];

    if (idsDias.length > 0) {
      const { data: itensLidos, error: erroItens } = await supabase
        .from("treino_itens")
        .select(
          "treino_dia_id, exercicio_id, series, repeticoes, carga_sugerida, descanso_segundos"
        )
        .in("treino_dia_id", idsDias)
        .order("ordem");

      if (erroItens) {
        throw new Error(
          `Não foi possível carregar os exercícios da ficha: ${erroItens.message}`
        );
      }
      itens = itensLidos ?? [];
    }

    const itensPorDia = new Map<string, typeof itens>();
    for (const item of itens) {
      const atuais = itensPorDia.get(item.treino_dia_id) ?? [];
      atuais.push(item);
      itensPorDia.set(item.treino_dia_id, atuais);
    }

    tituloInicial = fichaOriginal.titulo;
    diasIniciais = (dias ?? []).map((dia) => ({
      letra: dia.letra,
      nome: dia.nome_dia,
      itens: (itensPorDia.get(dia.id) ?? []).map((item) => ({
        exercicioId: item.exercicio_id,
        series: item.series,
        repeticoes: item.repeticoes,
        cargaSugerida: item.carga_sugerida,
        descansoSegundos: item.descanso_segundos,
      })),
    }));
  }

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

        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          {editar ? "Editar Ficha" : "Nova Ficha"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Aluno: <span className="font-medium text-foreground">{aluno.nome}</span> —
          arraste exercícios do catálogo para os dias e guarde a ficha.
        </p>

        {tituloInicial ? (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs text-muted-foreground">
            <Sparkles className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
            Montador pré-preenchido com{" "}
            <span className="font-medium text-foreground">“{tituloInicial}”</span> —
            ao guardar, criamos uma nova ficha com estas bases.
          </p>
        ) : null}
      </div>

      <WorkoutBuilder
        alunoId={aluno.id}
        catalogoExercicios={catalogoExercicios}
        tituloInicial={tituloInicial}
        diasIniciais={diasIniciais}
      />
    </div>
  );
}
