/**
 * Tipos serializáveis do WebApp do aluno — saída da Server Action
 * `getTreinoAluno` (`src/app/actions/execucao.ts`).
 *
 * Mantidos fora dos ficheiros "use server" (que só exportam async) e
 * desacoplados das linhas cruas do banco para estabilizar a UI.
 */

/** Exercício prescrito (`treino_itens`) + detalhes do catálogo. */
export type ItemTreinoAluno = {
  /** `treino_itens.id` — usado como chave em `treino_logs.treino_item_id`. */
  id: string;
  nome: string;
  grupoMuscular: string;
  videoGifUrl: string | null;
  instrucoes: string | null;
  series: number;
  repeticoes: string | null;
  cargaSugerida: string | null;
  descansoSegundos: number | null;
  ordem: number;
};

export type DiaTreinoAluno = {
  id: string;
  letra: string;
  nome: string | null;
  ordem: number;
  itens: ItemTreinoAluno[];
};

export type TreinoAluno = {
  aluno: { id: string; nome: string };
  /** `null` quando o aluno não tem ficha ativa (token válido, sem treino). */
  ficha: { id: string; titulo: string } | null;
  dias: DiaTreinoAluno[];
};
