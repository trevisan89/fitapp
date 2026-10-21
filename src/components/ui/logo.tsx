import { useId } from "react";

import { cn } from "@/lib/utils";

const DIMENSOES = {
  sm: { emblema: "size-8", texto: "text-base" },
  md: { emblema: "size-10", texto: "text-lg" },
  lg: { emblema: "size-16", texto: "text-2xl" },
} as const;

/**
 * Emblema vetorial oficial — 100% SVG inline, sem imagens: disco com o
 * gradiente da marca (roxo neon #8b5cf6 → azul elétrico #3b82f6), halo de
 * brilho ambiente, órbita fina e haltere minimalista a branco. Nítido em
 * qualquer densidade de ecrã, dos 32px da sidebar aos 64px+ do login.
 */
function Emblema({
  className,
  decorativo,
}: {
  className?: string;
  decorativo?: boolean;
}) {
  // IDs únicos por instância (várias logos no mesmo DOM) e seguros em `url(#…)`.
  const sufixo = useId().replace(/:/g, "");
  const idGradiente = `aura-g-${sufixo}`;
  const idHalo = `aura-halo-${sufixo}`;
  const idBrilho = `aura-brilho-${sufixo}`;

  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      aria-hidden={decorativo || undefined}
      role={decorativo ? undefined : "img"}
      aria-label={decorativo ? undefined : "Logótipo da AURA Training"}
    >
      <defs>
        <linearGradient id={idGradiente} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
        <radialGradient id={idHalo} cx="50%" cy="50%" r="50%">
          <stop offset="60%" stopColor="#8b5cf6" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={idBrilho} cx="35%" cy="28%" r="65%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Aura/glow ambiente */}
      <circle cx="32" cy="32" r="31" fill={`url(#${idHalo})`} />
      {/* Órbita fina — efeito "aura" em duplo anel */}
      <circle
        cx="32"
        cy="32"
        r="29"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.28"
        strokeWidth="1.5"
      />
      {/* Disco da marca + brilho superior */}
      <circle cx="32" cy="32" r="25" fill={`url(#${idGradiente})`} />
      <circle cx="32" cy="32" r="25" fill={`url(#${idBrilho})`} />
      {/* Haltere minimalista */}
      <g fill="#ffffff">
        <rect x="12" y="30" width="40" height="4" rx="2" />
        <rect x="19" y="22.5" width="6" height="19" rx="2.5" />
        <rect x="39" y="22.5" width="6" height="19" rx="2.5" />
        <rect x="13.5" y="26.5" width="4" height="11" rx="2" />
        <rect x="46.5" y="26.5" width="4" height="11" rx="2" />
      </g>
    </svg>
  );
}

/**
 * Logótipo oficial da AURA Training em vetor: emblema SVG nítido + wordmark
 * tipográfico ("AURA" no gradiente da marca, "Training" em ciano subtil).
 * Variantes sm/md/lg para sidebar, header e login; horizontal ou empilhado.
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
      <Emblema
        className={cn("shrink-0", dimensaoAtual.emblema)}
        decorativo={comTexto}
      />

      {comTexto ? (
        <span className={cn("font-bold tracking-tight", dimensaoAtual.texto)}>
          <span className="text-gradient-primary">AURA</span>{" "}
          <span className="font-light text-sky-700 dark:text-sky-300">
            Training
          </span>
        </span>
      ) : null}
    </span>
  );
}
