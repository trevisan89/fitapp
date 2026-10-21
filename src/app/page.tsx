import Link from "next/link";
import {
  ArrowRight,
  Check,
  GripVertical,
  Palette,
  Smartphone,
  Sparkles,
  Timer,
} from "lucide-react";

import { Logo } from "@/components/ui/logo";

/** Linhas ilustrativas do mockup do WebApp do aluno (apenas visual). */
const DEMO_EXERCICIOS = [
  { nome: "Supino Reto com Barra", series: "3×10", concluido: true },
  { nome: "Puxada Frente", series: "4×12", concluido: true },
  { nome: "Rosca Martelo", series: "3×12", concluido: false },
];

export default function Home() {
  return (
    <div className="flex min-h-svh flex-col">
      {/* ---------------------------------------------------------- Header */}
      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <Logo dimensao="md" />
          </Link>

          <nav className="hidden items-center gap-8 md:flex" aria-label="Navegação principal">
            <a
              href="#funcionalidades"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Funcionalidades
            </a>
            <a
              href="#precos"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Preços
            </a>
          </nav>

          <Link
            href="/login"
            className="inline-flex items-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Entrar / Criar Conta
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* ---------------------------------------------------------- Hero */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent"
          />
          <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-4 py-16 sm:px-6 md:grid-cols-2 md:items-center md:py-24">
            <div className="flex flex-col items-start gap-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
                Sem app para instalar — funciona em qualquer celular
              </span>

              <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
                O fim dos PDFs e planilhas.{" "}
                <span className="text-primary">
                  Treinos na palma da mão do seu aluno.
                </span>
              </h1>

              <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
                Plataforma para Personal Trainers focada em conversão. Seu aluno
                acessa a ficha por um link direto (PWA), sem precisar baixar nada
                nas lojas de aplicativos.
              </p>

              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-opacity hover:opacity-90"
                >
                  Começar Grátis
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
                <a
                  href="#demonstracao"
                  className="inline-flex items-center justify-center rounded-full border border-border bg-card px-6 py-3 font-medium transition-colors hover:bg-muted"
                >
                  Ver Demonstração
                </a>
              </div>

              <p className="text-sm text-muted-foreground">
                Plano gratuito para até 5 alunos — sem cartão de crédito.
              </p>
            </div>

            {/* Mockup do WebApp do aluno (ilustração) */}
            <div id="demonstracao" className="mx-auto w-full max-w-sm scroll-mt-24">
              <div className="rounded-3xl border border-border bg-card p-4 shadow-2xl shadow-primary/10">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <p className="text-sm font-semibold">
                      Treino A — Costas e Bíceps
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Aluno · João Silva
                    </p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                    Semana 3
                  </span>
                </div>

                <ul className="mt-4 space-y-3">
                  {DEMO_EXERCICIOS.map((exercicio) => (
                    <li
                      key={exercicio.nome}
                      className="flex items-center gap-3 rounded-xl border border-border bg-background p-3"
                    >
                      <span
                        aria-hidden="true"
                        className={
                          exercicio.concluido
                            ? "flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
                            : "flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-border"
                        }
                      >
                        {exercicio.concluido ? (
                          <Check className="size-3.5" />
                        ) : null}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {exercicio.nome}
                      </span>
                      <span className="text-xs font-medium text-muted-foreground">
                        {exercicio.series}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 flex items-center gap-2 rounded-xl bg-muted p-3 text-sm font-medium">
                  <Timer className="size-4 text-primary" aria-hidden="true" />
                  Descanso 1:30
                  <span className="ml-auto text-xs font-normal text-muted-foreground">
                    +15s · Pular
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------- Funcionalidades */}
        <section
          id="funcionalidades"
          className="scroll-mt-20 border-y border-border bg-muted/40"
        >
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Menos fricção. Mais resultado.
              </h2>
              <p className="mt-3 text-muted-foreground">
                O essencial para entregar treinos profissionais — e impressionar
                seu aluno desde a primeira série.
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Smartphone className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-lg font-semibold">Zero Fricção</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Webapp instantâneo. O aluno clica no link do WhatsApp e já está
                  treinando.
                </p>
              </article>

              <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <GripVertical className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-lg font-semibold">
                  Montador Drag-and-Drop
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Monte treinos complexos em segundos arrastando e soltando
                  exercícios.
                </p>
              </article>

              <article className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:col-span-2 lg:col-span-1">
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Palette className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-lg font-semibold">White-label</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  As suas cores e a sua marca. O aluno sente que o app é 100%
                  seu.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------- Preços */}
        <section id="precos" className="scroll-mt-20">
          <div className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 md:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Preços simples, sem letras miúdas.
              </h2>
              <p className="mt-3 text-muted-foreground">
                Comece de graça hoje. Faça upgrade quando fizer sentido.
              </p>
            </div>

            <div className="mt-12 grid gap-8 md:grid-cols-2">
              {/* Starter */}
              <div className="flex flex-col rounded-3xl border border-border bg-card p-8">
                <h3 className="text-lg font-semibold">Starter</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ideal para testar.
                </p>
                <p className="mt-6">
                  <span className="text-4xl font-bold tracking-tight">R$ 0</span>
                  <span className="text-muted-foreground"> /mês</span>
                </p>
                <ul className="mt-6 flex-1 space-y-3 text-sm">
                  <li className="flex items-center gap-2.5">
                    <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />
                    Até 5 alunos
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />
                    WebApp do aluno com link direto
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />
                    Montador de fichas com drag-and-drop
                  </li>
                </ul>
                <Link
                  href="/login"
                  className="mt-8 inline-flex items-center justify-center rounded-full border border-border px-6 py-3 font-medium transition-colors hover:bg-muted"
                >
                  Começar Grátis
                </Link>
              </div>

              {/* Pro (destacado) */}
              <div className="relative flex flex-col rounded-3xl border border-border bg-card p-8 shadow-xl shadow-primary/10 ring-2 ring-primary">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                  Mais popular
                </span>
                <h3 className="text-lg font-semibold">Pro</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Para trainers em crescimento.
                </p>
                <p className="mt-6">
                  <span className="text-4xl font-bold tracking-tight">
                    R$ 49,90
                  </span>
                  <span className="text-muted-foreground"> /mês</span>
                </p>
                <ul className="mt-6 flex-1 space-y-3 text-sm">
                  <li className="flex items-center gap-2.5">
                    <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />
                    Tudo do plano Starter
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />
                    Alunos ilimitados
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />
                    White-label completo
                  </li>
                </ul>
                <Link
                  href="/login"
                  className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-opacity hover:opacity-90"
                >
                  Assinar Pro
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ---------------------------------------------------------- Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
          <p className="text-sm text-muted-foreground">
            © 2026 AURA Training. Todos os direitos reservados.
          </p>
          <nav className="flex items-center gap-6 text-sm" aria-label="Rodapé">
            <Link
              href="/termos"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Termos de Uso
            </Link>
            <Link
              href="/privacidade"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Privacidade
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
