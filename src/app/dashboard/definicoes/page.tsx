import { DefinicoesForm } from "./definicoes-form";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

export const metadata = {
  title: "Definições | AURA Training",
  description: "Configuração white-label do PWA do Personal Trainer.",
};

export default async function DefinicoesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let perfil: Tables<"profiles"> | null = null;

  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    perfil = data;
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Definições</h1>
        <p className="text-sm text-muted-foreground">
          Configure o white-label: é esta a marca que os seus alunos veem no PWA
          de acesso por token.
        </p>
      </header>

      <DefinicoesForm perfil={perfil} />

      <p className="text-xs text-muted-foreground">
        O endereço{" "}
        <code className="rounded bg-muted px-1 font-mono">
          /aluno/&lt;slug&gt;
        </code>{" "}
        abre o PWA do aluno com a sua marca (cor, logótipo e nome).
      </p>
    </div>
  );
}
