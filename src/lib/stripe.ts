import Stripe from "stripe";

/**
 * Cliente Stripe — SOMENTE servidor (nunca importar em componentes client).
 *
 * A inicialização é preguiçosa (lazy) porque o `next build` importa os route
 * handlers durante a recolha de dados: com o construtor no topo do módulo, o
 * build falharia enquanto as chaves ainda não estiverem preenchidas.
 *
 * A `apiVersion` está fixada na versão mais recente suportada pela SDK
 * instalada (stripe v23 → "2026-09-30.endive"). Atualizar ao fazer upgrade
 * da SDK `stripe`, garantindo que o literal coincide com `LatestApiVersion`.
 */
let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (typeof window !== "undefined") {
    throw new Error("getStripe() só pode ser usado no servidor.");
  }

  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error(
      "STRIPE_SECRET_KEY em falta no .env.local. Copie o placeholder e preencha com a chave de teste do Stripe (https://dashboard.stripe.com/test/apikeys)."
    );
  }

  if (!stripeClient) {
    stripeClient = new Stripe(apiKey, {
      apiVersion: "2026-09-30.endive",
      appInfo: { name: "FitApp", version: "0.1.0" },
    });
  }

  return stripeClient;
}
