import { z } from "zod";

/**
 * Payload de gravação em `treino_logs` pelo WebApp do aluno.
 *
 * O `alunoId` é resolvido NO SERVIDORES a partir do `token` — o cliente
 * nunca envia o id do aluno, para que um aluno não possa escrever no
 * histórico de outro (o acesso usa a service role, fora do RLS).
 */
export const registrarLogSchema = z.object({
  token: z.uuid({ message: "Token inválido." }),
  treinoItemId: z.uuid({ message: "Exercício inválido." }),
  seriesFeitas: z
    .number({ message: "Séries inválidas." })
    .int({ message: "Séries inválidas." })
    .min(0, { message: "Séries inválidas." })
    .max(999, { message: "Séries inválidas." }),
  concluido: z.boolean(),
});

export type RegistrarLogInput = z.infer<typeof registrarLogSchema>;

/** `alunos.token_acesso` é uuid (default `uuid_generate_v4()`). */
export const tokenAlunoSchema = z.uuid();
