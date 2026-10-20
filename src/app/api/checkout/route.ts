import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

/**
 * Cria uma sessão de Checkout do Stripe (modo subscription) para o
 * Profissional autenticado e devolve a URL de pagamento.
 *
 * Nota: o runtime é o Node.js por omissão no Next 16 — necessário para a SDK
 * Stripe (crypto, HTTP próprio). Com `cacheComponents` ativo não é possível
 * exportar `runtime`/`dynamic` no segmento.
 */

/**
 * Price ID real do plano Pro — definir no `.env.local`:
 * Stripe > Dashboard > Products > [produto do Pro] > Pricing
 * e copiar o "Price ID" (formato `price_...`). Ver `.env.local.example`.
 */
const PRECO_PLANO_PRO = process.env.STRIPE_PRICE_ID;

/** URL pública da app, sem barra final (fallback: dev server). */
function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/+$/,
    ""
  );
}

export async function POST() {
  // 1) Autenticação — exige sessão válida do Supabase (cookies da request).
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }
  const user = data.user;

  // Pagamentos ainda não configurados (STRIPE_PRICE_ID em falta no .env.local).
  if (!PRECO_PLANO_PRO) {
    console.error(
      "[stripe] STRIPE_PRICE_ID em falta no .env.local — ver comentário em src/app/api/checkout/route.ts."
    );
    return NextResponse.json(
      { error: "Pagamentos ainda não estão configurados." },
      { status: 503 }
    );
  }

  // 2) Sessão de Checkout (mode: subscription).
  try {
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      client_reference_id: user.id,
      customer_email: user.email ?? undefined,
      line_items: [{ price: PRECO_PLANO_PRO, quantity: 1 }],
      success_url: `${appUrl()}/dashboard?checkout=sucesso`,
      cancel_url: `${appUrl()}/#precos`,
    });

    if (!session.url) {
      throw new Error("Sessão de Checkout criada sem URL de pagamento.");
    }

    // 3) O frontend redireciona o utilizador para a URL devolvida.
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[stripe] Erro ao criar checkout session:", err);
    return NextResponse.json(
      { error: "Não foi possível criar a sessão de pagamento. Tente novamente." },
      { status: 500 }
    );
  }
}
