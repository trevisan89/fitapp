"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { Copy, Loader2, Pencil, Trash2 } from "lucide-react";

import { deletarFicha, duplicarFicha } from "@/app/actions/fichas";

const BOTAO_BASE =
  "inline-flex size-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition disabled:cursor-not-allowed disabled:opacity-60";

/**
 * Acções de gestão de uma ficha no cartão da listagem:
 *
 *  - **Editar** → navega para o montador pré-preenchido (`?editar=<id>`);
 *  - **Duplicar** → `duplicarFicha` (Server Action), a cópia "(Cópia)"
 *    surge na lista via `revalidatePath`;
 *  - **Eliminar** → `<dialog>` nativo de confirmação (ESC/fundo fecham)
 *    antes de chamar `deletarFicha`.
 *
 * Os estados derivam das props revalidadas pela action — sem cópias locais
 * que fiquem obsoletas.
 */
export function FichaAcoes({
  fichaId,
  alunoId,
}: {
  fichaId: string;
  alunoId: string;
}) {
  const [dialogAberto, setDialogAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [eliminacaoPendente, eliminarEmTransicao] = useTransition();
  const [duplicacaoPendente, duplicarEmTransicao] = useTransition();

  // O `<dialog>` nativo vive fora do ciclo React do estado — o efeito
  // apenas o sincroniza (showModal/close), sem setState no corpo.
  useEffect(() => {
    const dialogo = dialogRef.current;
    if (!dialogo) return;
    if (dialogAberto && !dialogo.open) {
      dialogo.showModal();
    } else if (!dialogAberto && dialogo.open) {
      dialogo.close();
    }
  }, [dialogAberto]);

  function confirmarEliminacao() {
    setErro(null);
    eliminarEmTransicao(async () => {
      const resultado = await deletarFicha(fichaId);
      if (resultado.sucesso) {
        // A lista revalidada já não inclui a ficha — o cartão desmonta.
        setDialogAberto(false);
      } else {
        setErro(resultado.erro);
      }
    });
  }

  function duplicar() {
    setErro(null);
    duplicarEmTransicao(async () => {
      const resultado = await duplicarFicha(fichaId);
      if (!resultado.sucesso) {
        setErro(resultado.erro);
      }
      // Sucesso: o revalidatePath da action re-renderiza a lista com a
      // nova ficha "… (Cópia)" (spinner ativo até lá).
    });
  }

  return (
    <div className="mt-3 flex items-center justify-end gap-1.5">
      {erro && !dialogAberto ? (
        <p role="alert" className="mr-auto text-[11px] text-destructive">
          {erro}
        </p>
      ) : null}

      <Link
        href={`/dashboard/alunos/${alunoId}/fichas/nova?editar=${fichaId}`}
        title="Editar — abre o montador pré-preenchido com esta ficha"
        aria-label="Editar ficha"
        className={`${BOTAO_BASE} hover:border-primary/40 hover:text-primary`}
      >
        <Pencil className="size-4" aria-hidden="true" />
      </Link>

      <button
        type="button"
        onClick={duplicar}
        disabled={duplicacaoPendente}
        title="Duplicar ficha"
        aria-label="Duplicar ficha"
        className={`${BOTAO_BASE} hover:border-primary/40 hover:text-primary`}
      >
        {duplicacaoPendente ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Copy className="size-4" aria-hidden="true" />
        )}
      </button>

      <button
        type="button"
        onClick={() => setDialogAberto(true)}
        disabled={eliminacaoPendente}
        title="Eliminar ficha"
        aria-label="Eliminar ficha"
        className={`${BOTAO_BASE} hover:border-destructive/40 hover:text-destructive`}
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </button>

      <dialog
        ref={dialogRef}
        onCancel={(evento) => {
          evento.preventDefault();
          setDialogAberto(false);
        }}
        onClick={(evento) => {
          // Clique no backdrop (o próprio <dialog>): fecha sem confirmar.
          if (evento.target === dialogRef.current) {
            setDialogAberto(false);
          }
        }}
        className="m-auto w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-border bg-card p-6 text-foreground shadow-2xl backdrop:bg-black/60"
      >
        <h2 className="text-lg font-semibold">Eliminar ficha?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A ficha e todos os dias e exercícios serão apagados
          permanentemente. Esta ação não pode ser desfeita.
        </p>

        {erro ? (
          <p
            role="alert"
            className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
          >
            {erro}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setDialogAberto(false)}
            disabled={eliminacaoPendente}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmarEliminacao}
            disabled={eliminacaoPendente}
            className="inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground shadow-sm transition hover:opacity-90 disabled:opacity-60"
          >
            {eliminacaoPendente ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Trash2 className="size-4" aria-hidden="true" />
            )}
            Eliminar
          </button>
        </div>
      </dialog>
    </div>
  );
}
