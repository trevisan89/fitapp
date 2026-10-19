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

/** Preço placeholder do plano Pro — substituir pelo Price ID real do Stripe. */
const PRECO_PLANO_PRO = "price_XYZ";

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
