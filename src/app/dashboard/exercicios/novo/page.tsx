import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { NovoExercicioForm } from "./novo-exercicio-form";

export const metadata = {
  title: "Adicionar Exercício | Painel FitApp",
  description: "Registar um novo exercício na biblioteca do Personal Trainer.",
};

export default function NovoExercicioPage() {
  return (
    <div className="mx-auto w-full max-w-xl space-y-6">
      <div>
        <Link
          href="/dashboard/exercicios"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Voltar à biblioteca
        </Link>

        <h1 className="mt-3 text-2xl font-semibold tracking-tight">
          Adicionar Exercício
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          O exercício fica disponível nas suas fichas. O vídeo/GIF e as
          instruções são opcionais.
        </p>
      </div>

      <NovoExercicioForm />
    </div>
  );
}
