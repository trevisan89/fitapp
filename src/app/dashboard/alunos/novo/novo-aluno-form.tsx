"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";

import { createAluno } from "@/app/actions/alunos";
import { cn } from "@/lib/utils";
import { createAlunoSchema, type CreateAlunoInput } from "@/lib/validators/aluno";

type Feedback = { type: "success" | "error"; message: string };

const INPUT_CLASSES =
  "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40";

export function NovoAlunoForm() {
  const router = useRouter();
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateAlunoInput>({
    resolver: zodResolver(createAlunoSchema),
    defaultValues: { nome: "", whatsapp: "" },
    mode: "onBlur",
  });

  async function onSubmit(values: CreateAlunoInput) {
    setFeedback(null);

    try {
      await createAluno(values);
      reset();
      setFeedback({ type: "success", message: "Aluno adicionado! A redirecionar…" });
      window.setTimeout(() => router.push("/dashboard"), 1200);
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error ? error.message : "Não foi possível adicionar o aluno.",
      });
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-5 rounded-2xl border border-border bg-card p-6 shadow-sm"
    >
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

      <div className="space-y-1.5">
        <label htmlFor="nome" className="text-sm font-medium">
          Nome completo <span className="text-destructive">*</span>
        </label>
        <input
          id="nome"
          type="text"
          autoComplete="name"
          placeholder="Ex.: Maria Silva"
          aria-invalid={errors.nome ? true : undefined}
          aria-describedby={errors.nome ? "nome-error" : undefined}
          className={cn(
            INPUT_CLASSES,
            errors.nome && "border-destructive focus-visible:ring-ring/40"
          )}
          {...register("nome")}
        />
        {errors.nome ? (
          <p id="nome-error" className="text-sm text-destructive">
            {errors.nome.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="whatsapp" className="text-sm font-medium">
          WhatsApp <span className="text-destructive">*</span>
        </label>
        <input
          id="whatsapp"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(11) 99999-9999"
          aria-invalid={errors.whatsapp ? true : undefined}
          aria-describedby={errors.whatsapp ? "whatsapp-error" : "whatsapp-hint"}
          className={cn(
            INPUT_CLASSES,
            errors.whatsapp && "border-destructive focus-visible:ring-ring/40"
          )}
          {...register("whatsapp")}
        />
        {errors.whatsapp ? (
          <p id="whatsapp-error" className="text-sm text-destructive">
            {errors.whatsapp.message}
          </p>
        ) : (
          <p id="whatsapp-hint" className="text-xs text-muted-foreground">
            Inclua o DDD. Ex.: (11) 99999-9999 ou +351 912 345 678.
          </p>
        )}
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium transition hover:bg-accent hover:text-accent-foreground"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-60"
        >
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {isSubmitting ? "A guardar…" : "Adicionar Aluno"}
        </button>
      </div>
    </form>
  );
}
