"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle2, Dumbbell, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";

import { signIn, signUp } from "@/app/actions/auth";
import { cn } from "@/lib/utils";
import { loginSchema, type LoginInput } from "@/lib/validators/auth";

type Feedback = { type: "success" | "error"; message: string };

const INPUT_CLASSES =
  "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40";

/**
 * Formulário de login/registo do profissional. A Server Action devolve
 * `{ error }` em falha (mensagem legível, sem lançar — produção mascara
 * erros lançados); em sucesso a action grava os cookies da sessão e o
 * cliente navega para /dashboard.
 */
export function LoginForm() {
  const router = useRouter();
  const [modo, setModo] = useState<"entrar" | "registar">("entrar");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [pendente, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onBlur",
  });

  function alternarModo() {
    setModo((atual) => (atual === "entrar" ? "registar" : "entrar"));
    setFeedback(null);
  }

  function onSubmit(values: LoginInput) {
    setFeedback(null);

    startTransition(async () => {
      try {
        if (modo === "entrar") {
          const resultado = await signIn(values);

          if (resultado.error) {
            setFeedback({ type: "error", message: resultado.error });
            return;
          }

          router.push("/dashboard");
          return;
        }

        const resultado = await signUp(values);

        if (resultado.error) {
          setFeedback({ type: "error", message: resultado.error });
          return;
        }

        if (resultado.confirmacaoEmail) {
          setFeedback({
            type: "success",
            message:
              "Conta criada! Confirme o e-mail recebido e depois inicie sessão.",
          });
          setModo("entrar");
          reset({ email: values.email, password: "" });
          return;
        }

        router.push("/dashboard");
      } catch {
        setFeedback({
          type: "error",
          message: "Falha de ligação ao servidor. Tente novamente.",
        });
      }
    });
  }

  return (
    <main className="flex min-h-dvh flex-col justify-center bg-muted/40 px-4 py-10">
      <div className="mx-auto w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <span
            className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm"
            aria-hidden="true"
          >
            <Dumbbell className="size-6" />
          </span>
          <h1 className="text-xl font-semibold tracking-tight">FitApp</h1>
          <p className="text-sm text-muted-foreground">
            {modo === "entrar"
              ? "Entre no seu painel de Personal Trainer."
              : "Crie a sua conta de Personal Trainer."}
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm"
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
            <label htmlFor="email" className="text-sm font-medium">
              E-mail <span className="text-destructive">*</span>
            </label>
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="voce@exemplo.com"
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? "email-error" : undefined}
              className={cn(
                INPUT_CLASSES,
                errors.email && "border-destructive"
              )}
              {...register("email")}
            />
            {errors.email ? (
              <p id="email-error" className="text-sm text-destructive">
                {errors.email.message}
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium">
              Palavra-passe <span className="text-destructive">*</span>
            </label>
            <input
              id="password"
              type="password"
              autoComplete={
                modo === "entrar" ? "current-password" : "new-password"
              }
              placeholder="••••••••"
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={errors.password ? "password-error" : undefined}
              className={cn(
                INPUT_CLASSES,
                errors.password && "border-destructive"
              )}
              {...register("password")}
            />
            {errors.password ? (
              <p id="password-error" className="text-sm text-destructive">
                {errors.password.message}
              </p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={pendente}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-60"
          >
            {pendente ? <Loader2 className="size-4 animate-spin" /> : null}
            {pendente
              ? "A autenticar…"
              : modo === "entrar"
                ? "Entrar"
                : "Criar Conta"}
          </button>

          <button
            type="button"
            onClick={alternarModo}
            className="w-full text-center text-sm text-muted-foreground transition hover:text-foreground"
          >
            {modo === "entrar" ? (
              <>
                Ainda não tem conta?{" "}
                <span className="font-medium text-primary">Criar conta</span>
              </>
            ) : (
              <>
                Já tem conta?{" "}
                <span className="font-medium text-primary">Entrar</span>
              </>
            )}
          </button>
        </form>

        <Link
          href="/"
          className="block text-center text-xs text-muted-foreground transition hover:text-foreground"
        >
          Voltar à página inicial
        </Link>
      </div>
    </main>
  );
}
