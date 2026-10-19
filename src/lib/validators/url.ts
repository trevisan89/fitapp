/** Valida URLs http(s) — usada nos validators de exercício e de perfil. */
export function ehUrlHttp(valor: string): boolean {
  try {
    const url = new URL(valor);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
