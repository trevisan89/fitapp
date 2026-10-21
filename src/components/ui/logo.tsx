import Image from "next/image";

import { cn } from "@/lib/utils";

const DIMENSOES = {
  sm: { marca: "size-8", texto: "text-base", sizes: "32px" },
  md: { marca: "size-10", texto: "text-lg", sizes: "40px" },
  lg: { marca: "size-16", texto: "text-2xl", sizes: "64px" },
} as const;

/**
 * Logótipo oficial da AURA Training.
 *
 * O ficheiro `aura-logo.jpg` (emblema neon magenta→ciano sobre fundo
 * escuro) é ampliado dentro de um recipiente recortado que isola o
 * emblema; o wordmark é composto em texto com o gradiente da marca para
 * escalar com nitidez em qualquer densidade de ecrã.
 */
export function Logo({
  dimensao = "md",
  comTexto = true,
  orientacao = "horizontal",
  className,
}: {
  /** Escala do emblema e do wordmark. */
  dimensao?: keyof typeof DIMENSOES;
  /** Mostra o wordmark "AURA Training" ao lado/abaixo do emblema. */
  comTexto?: boolean;
  orientacao?: "horizontal" | "empilhado";
  className?: string;
}) {
  const dimensaoAtual = DIMENSOES[dimensao];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5",
        orientacao === "empilhado" && "flex-col gap-3 text-center",
        className
      )}
    >
      <span
        className={cn(
          "relative shrink-0 overflow-hidden rounded-[30%] shadow-lg shadow-violet-500/25 ring-1 ring-inset ring-white/15",
          dimensaoAtual.marca
        )}
      >
        <Image
          src="/aura-logo.jpg"
          alt="Logótipo da AURA Training"
          fill
          sizes={dimensaoAtual.sizes}
          className="scale-[2.35] object-cover [transform-origin:50%_44%]"
        />
      </span>

      {comTexto ? (
        <span
          className={cn(
            "font-bold tracking-tight",
            dimensaoAtual.texto
          )}
        >
          <span className="text-gradient-primary">AURA</span>{" "}
          <span className="font-light text-sky-300">Training</span>
        </span>
      ) : null}
    </span>
  );
}
