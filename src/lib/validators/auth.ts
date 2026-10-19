import { z } from "zod";

/**
 * Schema da autenticação do profissional (login e registo nativos do
 * Supabase). Partilhado entre o formulário client e as Server Actions
 * em `src/app/actions/auth.ts`.
 */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, { message: "Informe o e-mail." })
    .refine((valor) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor), {
      message: "E-mail inválido.",
    }),
  // Mínimo do Supabase por omissão (6) — o erro real também é traduzido.
  password: z.string().min(6, {
    message: "A palavra-passe tem pelo menos 6 caracteres.",
  }),
});

export type LoginInput = z.infer<typeof loginSchema>;
