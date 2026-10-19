import { redirect } from "next/navigation";

/**
 * Alias: o `/dashboard` já é a lista de alunos. Este redirect elimina o
 * 404 do link "Alunos" da barra lateral.
 */
export default function AlunosPage() {
  redirect("/dashboard");
}
