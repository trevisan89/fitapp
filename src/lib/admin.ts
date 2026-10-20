/**
 * Lista de e-mails com acesso à área administrativa do FitApp.
 *
 * A checagem é feita TRÊS vezes por defesa em profundidade:
 *   1. no `proxy.ts` (borda) — redireciona antes de qualquer streaming;
 *   2. na página `/admin` (Server Component) — guarda primária pedida;
 *   3. na Server Action `updatePlanoManual` — as Server Actions são
 *      endpoints invocáveis por qualquer sessão autenticada; proteger só
 *      a página não bastaria.
 */
const EMAILS_ADMIN: readonly string[] = ["trevisan89@hotmail.com"];

/** Compara em minúsculas e sem espaços acidentais nas pontas. */
export function ehAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;

  const normalizado = email.trim().toLowerCase();

  return EMAILS_ADMIN.some((permitido) => permitido === normalizado);
}
