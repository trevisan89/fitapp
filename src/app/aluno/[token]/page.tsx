import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";
import Link from "next/link";
import { ShieldX, TimerOff } from "lucide-react";

import { getTreinoAluno } from "@/app/actions/execucao";
import { ExecucaoTreino } from "@/components/aluno/execucao-treino";

export const metadata: Metadata = {
  title: "Meu Treino | FitApp",
  description: "Execução do treino prescrito pelo seu Personal Trainer.",
};

/**
 * WebApp do aluno — rota pública por `token_acesso` (mobile-first:
 * coluna única, alvos de toque grandes, cronômetro fixo em baixo).
 *
 * `params`/fetch só correm dentro do `<Suspense>` (cache Components):
 * o shell estático sai rápido com o fallback e o conteúdo do token é
 * streamed na requisição.
 */
export default function AlunoPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  return (
    <Suspense fallback={<TelaCarregamento />}>
      <ConteudoAluno params={params} />
    </Suspense>
  );
}

async function ConteudoAluno({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const treino = await getTreinoAluno(token);

  // Token desconhecido, inativo ou revogado
  if (!treino) {
    return (
      <TelaCentralizada
        critica
        titulo="Token inválido ou acesso revogado"
        descricao="Peça um novo link de acesso ao seu Personal Trainer."
      />
    );
  }

  // Token válido, mas ainda sem ficha ativa
  if (!treino.ficha) {
    return (
      <TelaCentralizada
        titulo="Nenhuma ficha ativa"
        descricao={`Olá, ${treino.aluno.nome}! Ainda não existe uma ficha de treino ativa para si. Aguarde o seu Personal Trainer.`}
      />
    );
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-lg bg-background pb-24">
      <header className="border-b border-border bg-card px-4 py-5 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {treino.ficha.titulo}
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">
          Bora treinar, {treino.aluno.nome}!
        </h1>
      </header>

      <div className="px-4 py-5">
        <ExecucaoTreino token={token} dias={treino.dias} />
      </div>
    </main>
  );
}

function TelaCarregamento() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40">
      <div
        className="h-9 w-44 animate-pulse rounded-lg bg-muted"
        aria-label="A carregar o treino…"
      />
    </main>
  );
}

function TelaCentralizada({
  titulo,
  descricao,
  critica = false,
}: {
  titulo: string;
  descricao: string;
  critica?: boolean;
}) {
  const icone: ReactNode = critica ? (
    <ShieldX className="size-7" />
  ) : (
    <TimerOff className="size-7" />
  );

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-muted/40 px-6 text-center">
      <span
        className={
          critica
            ? "grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive"
            : "grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary"
        }
        aria-hidden="true"
      >
        {icone}
      </span>

      <h1 className="mt-4 text-lg font-semibold">{titulo}</h1>
      <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">{descricao}</p>

      <Link
        href="/"
        className="mt-6 text-sm font-medium text-primary hover:underline"
      >
        Ir para o início
      </Link>
    </main>
  );
}
