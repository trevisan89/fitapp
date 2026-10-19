import { z } from "zod";

import { ehUrlHttp } from "./url";

/**
 * Schema do formulário de definições white-label (tabela `profiles`).
 * Partilhado entre o formulário client e a Server Action `updateProfile`.
 */
export const updateProfileSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(2, { message: "Informe o seu nome (mínimo de 2 caracteres)." })
    .max(120, { message: "O nome pode ter no máximo 120 caracteres." }),
  whatsapp: z.string().trim().refine(
    (valor) => {
      const digitos = valor.replace(/\D/g, "");
      return valor === "" || (digitos.length >= 10 && digitos.length <= 15);
    },
    { message: "WhatsApp inválido. Ex.: (11) 99999-9999." }
  ),
  slug: z
    .string()
    .trim()
    .min(3, { message: "O slug tem de ter pelo menos 3 caracteres." })
    .max(60, { message: "O slug pode ter no máximo 60 caracteres." })
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message: "Slug inválido: apenas minúsculas, números e hífens (ex.: meu-nome).",
    }),
  corPrimaria: z.string().regex(/^#[0-9a-fA-F]{6}$/, {
    message: "Escolha uma cor válida (formato #RRGGBB).",
  }),
  logoUrl: z.string().trim().refine((valor) => valor === "" || ehUrlHttp(valor), {
    message: "URL do logótipo inválida. Use https://…",
  }),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
