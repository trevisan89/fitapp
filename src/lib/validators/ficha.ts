import { z } from "zod";

/**
 * Id do aluno dono da ficha — validado como uuid ANTES de qualquer
 * consulta; a Server Action `createFicha` ainda verifica a posse
 * (`professional_id = auth.uid()`) antes de criar qualquer registo.
 */
export const alunoIdSchema = z.uuid({ message: "Aluno inválido." });

/**
 * Id da ficha nas Server Actions de estado (`toggleFichaAtiva`) —
 * validado como uuid ANTES de qualquer consulta ou UPDATE.
 */
export const fichaIdSchema = z.uuid({ message: "Ficha inválida." });

/**
 * Payload relacional de uma ficha: `fichas_treino` → `treino_dias` →
 * `treino_itens`. Partilhado entre o montador (cliente) e a Server Action
 * `createFicha`, que volta a validar no servidor.
 *
 * Os limites de tamanho (dias e itens por dia) existem como guarda de
 * esforço: a action insere linha a linha e um payload absurdamente
 * grande não deve chegar a sequer tocar na base de dados.
 */
export const itemFichaSchema = z.object({
  exercicioId: z.uuid({ message: "Exercício inválido." }),
  // `treino_itens.series` é NOT NULL no banco — o montador pré-valida com
  // mensagem amigável antes de chegar aqui.
  series: z
    .number({ message: "Defina as séries do exercício." })
    .int({ message: "As séries têm de ser um número inteiro." })
    .min(1, { message: "As séries têm de ser pelo menos 1." }),
  // Texto livre: "8-12", "30 s", "AMRAP"...
  repeticoes: z.string().trim().max(60, { message: "Repetições: máximo 60 caracteres." }),
  cargaSugerida: z.string().trim().max(60, { message: "Carga: máximo 60 caracteres." }),
  descansoSegundos: z
    .number({ message: "Descanso inválido." })
    .int({ message: "O descanso tem de ser um número inteiro de segundos." })
    .min(0, { message: "O descanso não pode ser negativo." })
    .nullable(),
  ordem: z.number().int().min(0),
});

export const diaFichaSchema = z.object({
  letra: z.string().length(1, { message: "A letra do dia tem de ter 1 carácter." }),
  nome: z.string().trim().max(60, { message: "Nome do dia: máximo 60 caracteres." }),
  itens: z
    .array(itemFichaSchema)
    .min(1, { message: "O dia precisa de pelo menos um exercício." })
    .max(60, { message: "Um dia pode ter no máximo 60 exercícios." }),
});

export const fichaPayloadSchema = z.object({
  titulo: z
    .string()
    .trim()
    .min(3, { message: "Informe um título para a ficha (mínimo de 3 caracteres)." })
    .max(120, { message: "O título pode ter no máximo 120 caracteres." }),
  dias: z
    .array(diaFichaSchema)
    .min(1, { message: "Adicione exercícios a pelo menos um dia de treino." })
    .max(10, { message: "Uma ficha pode ter no máximo 10 dias de treino." }),
});

export type ItemFichaInput = z.infer<typeof itemFichaSchema>;
export type DiaFichaInput = z.infer<typeof diaFichaSchema>;
export type FichaPayloadInput = z.infer<typeof fichaPayloadSchema>;
