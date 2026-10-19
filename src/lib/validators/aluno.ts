import { z } from "zod";

/**
 * Schema do formulário de aluno — partilhado entre o formulário client
 * (React Hook Form + Zod) e a Server Action `createAluno`, que volta a
 * validar no servidor (nunca confie apenas na validação do browser).
 */
export const createAlunoSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(3, { message: "Informe o nome completo (mínimo de 3 caracteres)." })
    .max(120, { message: "O nome pode ter no máximo 120 caracteres." }),
  whatsapp: z
    .string()
    .trim()
    .min(1, { message: "Informe o WhatsApp do aluno." })
    .refine(
      (value) => {
        const digitos = value.replace(/\D/g, "");
        return digitos.length >= 10 && digitos.length <= 15;
      },
      { message: "WhatsApp inválido. Ex.: (11) 99999-9999." }
    ),
});

/** Tipo de entrada usado no `useForm<CreateAlunoInput>` e na Server Action. */
export type CreateAlunoInput = z.infer<typeof createAlunoSchema>;
