import { z } from "zod";

import { ehUrlHttp } from "./url";

/**
 * Schema do formulário de exercício — partilhado entre o formulário client
 * (React Hook Form + Zod) e a Server Action `createExercercicio`.
 *
 * `videoGifUrl` e `instrucoes` são opcionais (colunas nullable no banco);
 * string vazia é tratada como "sem valor" e convertida em `null` no insert.
 */
export const createExercicioSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(3, { message: "Informe o nome do exercício (mínimo de 3 caracteres)." })
    .max(120, { message: "O nome pode ter no máximo 120 caracteres." }),
  grupoMuscular: z
    .string()
    .trim()
    .min(2, { message: "Informe o grupo muscular (ex.: Peito, Costas, Pernas)." })
    .max(60, { message: "O grupo muscular pode ter no máximo 60 caracteres." }),
  videoGifUrl: z
    .string()
    .trim()
    .max(500, { message: "A URL pode ter no máximo de 500 caracteres." })
    .refine((valor) => valor === "" || ehUrlHttp(valor), {
      message: "Informe uma URL válida começando por http:// ou https://.",
    }),
  instrucoes: z
    .string()
    .trim()
    .max(2000, { message: "As instruções podem ter no máximo 2000 caracteres." }),
});

/** Tipo de entrada usado no `useForm<CreateExercicioInput>` e na Server Action. */
export type CreateExercicioInput = z.infer<typeof createExercicioSchema>;
