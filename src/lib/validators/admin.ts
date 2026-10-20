import { z } from "zod";

/**
 * Payload da gestão manual de planos (área administrativa).
 * Partilhado entre o seletor client (`PlanoToggle`) e a Server Action
 * `updatePlanoManual`, que volta a validar no servidor — nunca se confia
 * no cliente, sobretudo numa ação que usa a service role (bypass do RLS).
 *
 * Os valores ecoam o constraint CHECK da migração 02
 * (`plano_status in ('starter', 'pro')`).
 */
export const updatePlanoManualSchema = z.object({
  profileId: z.uuid({ message: "Perfil inválido." }),
  novoPlano: z.enum(["starter", "pro"], {
    message: "Plano inválido — escolha 'starter' ou 'pro'.",
  }),
});

/** Tipo de entrada usado pelo seletor client e pela Server Action. */
export type UpdatePlanoManualInput = z.infer<typeof updatePlanoManualSchema>;
