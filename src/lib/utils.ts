import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combina classes condicionais (clsx) e resolve conflitos de utilitários
 * do Tailwind (tailwind-merge), mantendo as últimas classes como prioridade.
 *
 * @example cn("px-4 py-2", isActive && "bg-primary text-primary-foreground")
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Iniciais para avatares: "Maria Silva" -> "MS", "João" -> "JO".
 */
export function getIniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);

  if (partes.length === 0) return "PT";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();

  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}
