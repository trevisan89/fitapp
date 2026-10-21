import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { NovoAlunoForm } from "./novo-aluno-form";

export const metadata = {
  title: "Adicionar Aluno | AURA Training",
  description: "Registar um novo aluno no Painel do Personal Trainer.",
};

export default function NovoAlunoPage() {
  return (
    <div className="mx-auto w-full max-w-xl space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Voltar ao início
        </Link>

        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Adicionar Aluno</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          O token de acesso ao PWA é gerado automaticamente pelo banco de dados.
        </p>
      </div>

      <NovoAlunoForm />
    </div>
  );
}
