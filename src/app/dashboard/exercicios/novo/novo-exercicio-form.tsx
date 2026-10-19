"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";

import { createExercercicio } from "@/app/actions/exercicios";
import { cn } from "@/lib/utils";
import {
  createExercicioSchema,
  type CreateExercicioInput,
} from "@/lib/validators/exercicio";

type Feedback = { type: "success" | "error"; message: string };

const INPUT_CLASSES =
  "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40";

const GRUPOS_SUGERIDOS = [
  "Peito",
  "Costas",
  "Pernas",
  "Ombro",
  "Braço",
  "Core",
  "Glúteos",
  "Cardio",
];

export function NovoExercicioForm() {
  const router = useRouter();
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateExercicioInput>({
    resolver: zodResolver(createExercicioSchema),
    defaultValues: { nome: "", grupoMuscular: "", videoGifUrl: "", instrucoes: "" },
    mode: "onBlur",
  });

  async function onSubmit(values: CreateExercicioInput) {
    setFeedback(null);

    try {
      await createExercercicio(values);
      reset();
      setFeedback({
        type: "success",
        message: "Exercício adicionado! A redirecionar…",
      });
      window.setTimeout(() => router.push("/dashboard/exercicios"), 1200);
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível adicionar o exercício.",
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
          Nome <span className="text-destructive">*</span>
        </label>
        <input
          id="nome"
          type="text"
          autoComplete="off"
          placeholder="Ex.: Supino reto com barra"
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
        <label htmlFor="grupoMuscular" className="text-sm font-medium">
          Grupo Muscular <span className="text-destructive">*</span>
        </label>
        <input
          id="grupoMuscular"
          type="text"
          autoComplete="off"
          list="grupos-musculares"
          placeholder="Ex.: Peito"
          aria-invalid={errors.grupoMuscular ? true : undefined}
          aria-describedby={
            errors.grupoMuscular ? "grupo-muscular-error" : "grupo-muscular-hint"
          }
          className={cn(
            INPUT_CLASSES,
            errors.grupoMuscular && "border-destructive focus-visible:ring-ring/40"
          )}
          {...register("grupoMuscular")}
        />
        <datalist id="grupos-musculares">
          {GRUPOS_SUGERIDOS.map((grupo) => (
            <option key={grupo} value={grupo} />
          ))}
        </datalist>
        {errors.grupoMuscular ? (
          <p id="grupo-muscular-error" className="text-sm text-destructive">
            {errors.grupoMuscular.message}
          </p>
        ) : (
          <p id="grupo-muscular-hint" className="text-xs text-muted-foreground">
            Sugestões: {GRUPOS_SUGERIDOS.join(", ")} — pode escrever outro.
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="videoGifUrl" className="text-sm font-medium">
          URL do Vídeo / GIF
        </label>
        <input
          id="videoGifUrl"
          type="url"
          inputMode="url"
          autoComplete="off"
          placeholder="https://…"
          aria-invalid={errors.videoGifUrl ? true : undefined}
          aria-describedby={
            errors.videoGifUrl ? "video-error" : "video-hint"
          }
          className={cn(
            INPUT_CLASSES,
            errors.videoGifUrl && "border-destructive focus-visible:ring-ring/40"
          )}
          {...register("videoGifUrl")}
        />
        {errors.videoGifUrl ? (
          <p id="video-error" className="text-sm text-destructive">
            {errors.videoGifUrl.message}
          </p>
        ) : (
          <p id="video-hint" className="text-xs text-muted-foreground">
            Opcional. Link de YouTube, Vimeo ou GIF (começa por https://).
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="instrucoes" className="text-sm font-medium">
          Instruções
        </label>
        <textarea
          id="instrucoes"
          rows={4}
          placeholder="Ex.: Manter as escápulas retraídas e descer a barra até ao peito controlando a fase excêntrica."
          aria-invalid={errors.instrucoes ? true : undefined}
          aria-describedby={errors.instrucoes ? "instrucoes-error" : undefined}
          className={cn(
            INPUT_CLASSES,
            "resize-y",
            errors.instrucoes && "border-destructive focus-visible:ring-ring/40"
          )}
          {...register("instrucoes")}
        />
        {errors.instrucoes ? (
          <p id="instrucoes-error" className="text-sm text-destructive">
            {errors.instrucoes.message}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => router.push("/dashboard/exercicios")}
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
          {isSubmitting ? "A guardar…" : "Adicionar Exercício"}
        </button>
      </div>
    </form>
  );
}
