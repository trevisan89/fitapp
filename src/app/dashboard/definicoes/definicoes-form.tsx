"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";

import { updateProfile } from "@/app/actions/profile";
import { cn } from "@/lib/utils";
import {
  updateProfileSchema,
  type UpdateProfileInput,
} from "@/lib/validators/profile";
import type { Tables } from "@/types/database.types";

type Feedback = { type: "success" | "error"; message: string };

const INPUT_CLASSES =
  "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

export function DefinicoesForm({ perfil }: { perfil: Tables<"profiles"> | null }) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      nome: perfil?.nome ?? "",
      whatsapp: perfil?.whatsapp ?? "",
      slug: perfil?.slug ?? "",
      corPrimaria: perfil?.cor_primaria ?? "#4f46e5",
      logoUrl: perfil?.logo_url ?? "",
    },
    mode: "onBlur",
  });

  const slug = useWatch({ control, name: "slug" });

  async function onSubmit(values: UpdateProfileInput) {
    setFeedback(null);

    try {
      await updateProfile(values);
      setFeedback({ type: "success", message: "Definições guardadas!" });
      // Re-render do servidor: o cabeçalho (nome/avatar) passa a usar os
      // novos valores do perfil.
      router.refresh();
    } catch (error) {
      setFeedback({
        type: "error",
        message:
          error instanceof Error ? error.message : "Não foi possível guardar as definições.",
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
          autoComplete="name"
          placeholder="Ex.: Maria Personal"
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
          WhatsApp
        </label>
        <input
          id="whatsapp"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="(11) 99999-9999"
          aria-invalid={errors.whatsapp ? true : undefined}
          aria-describedby={errors.whatsapp ? "whatsapp-error" : undefined}
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
        ) : null}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="slug" className="text-sm font-medium">
          Slug <span className="text-destructive">*</span>
        </label>
        <input
          id="slug"
          type="text"
          autoComplete="off"
          placeholder="meu-nome"
          aria-invalid={errors.slug ? true : undefined}
          aria-describedby={errors.slug ? "slug-error" : "slug-hint"}
          className={cn(
            INPUT_CLASSES,
            errors.slug && "border-destructive focus-visible:ring-ring/40"
          )}
          {...register("slug")}
        />
        {errors.slug ? (
          <p id="slug-error" className="text-sm text-destructive">
            {errors.slug.message}
          </p>
        ) : (
          <p id="slug-hint" className="text-xs text-muted-foreground">
            Endereço do PWA: {BASE_URL}/aluno/
            <span className="font-medium text-foreground">{slug || "…"}</span>
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-end">
        <div className="space-y-1.5">
          <label htmlFor="corPrimaria" className="text-sm font-medium">
            Cor Primária <span className="text-destructive">*</span>
          </label>
          <input
            id="corPrimaria"
            type="color"
            aria-invalid={errors.corPrimaria ? true : undefined}
            className="h-10 w-16 cursor-pointer rounded-lg border border-input bg-background p-1"
            {...register("corPrimaria")}
          />
          {errors.corPrimaria ? (
            <p className="text-sm text-destructive">{errors.corPrimaria.message}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="logoUrl" className="text-sm font-medium">
            URL do Logótipo
          </label>
          <input
            id="logoUrl"
            type="url"
            inputMode="url"
            autoComplete="off"
            placeholder="https://…/logo.png"
            aria-invalid={errors.logoUrl ? true : undefined}
            aria-describedby={errors.logoUrl ? "logo-error" : undefined}
            className={cn(
              INPUT_CLASSES,
              errors.logoUrl && "border-destructive focus-visible:ring-ring/40"
            )}
            {...register("logoUrl")}
          />
          {errors.logoUrl ? (
            <p id="logo-error" className="text-sm text-destructive">
              {errors.logoUrl.message}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex justify-end border-t border-border pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-60"
        >
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {isSubmitting ? "A guardar…" : "Guardar Definições"}
        </button>
      </div>
    </form>
  );
}
