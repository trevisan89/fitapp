import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";

import { getStripe } from "@/lib/stripe";

/**
 * Webhook do Stripe — recebe os eventos da conta (checkout, faturas, etc.).
 *
 * A verificação de assinatura exige o corpo BRUTO da request. O runtime é o
 * Node.js por omissão no Next 16 (a SDK usa crypto para validar o HMAC de
 * `stripe-signature`); com `cacheComponents` ativo não é possível exportar
 * `runtime`/`dynamic` no segmento.
 */

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error(
      "[stripe] STRIPE_WEBHOOK_SECRET em falta no .env.local — webhook rejeitado."
    );
    return NextResponse.json(
      { error: "Servidor não configurado." },
      { status: 500 }
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Cabeçalho stripe-signature em falta." },
      { status: 400 }
    );
  }

  // Corpo raw obrigatório para o constructEvent (não usar .json()).
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );
  } catch (err) {
    console.error(
      "[stripe] Assinatura do webhook inválida:",
      err instanceof Error ? err.message : err
    );
    return NextResponse.json(
      { error: "Assinatura inválida." },
      { status: 400 }
    );
  }

  // Processamento dos eventos — por agora apenas registo;
  // a persistência na base de dados será ligada na próxima etapa.
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        console.log("[stripe] checkout.session.completed", {
          sessionId: session.id,
          userId: session.client_reference_id,
          clienteStripe: session.customer,
          assinatura: session.subscription,
          pagamento: session.payment_status,
        });
        break;
      }
      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        console.log("[stripe] invoice.payment_succeeded", {
          invoiceId: invoice.id,
          assinatura: invoice.parent?.subscription_details?.subscription,
          clienteStripe: invoice.customer,
          total: invoice.total,
          moeda: invoice.currency,
        });
        break;
      }
      default:
        // Ex.: invoice.payment_failed, customer.subscription.deleted —
        // serão tratados quando ligarmos o webhook à base de dados.
        console.log(`[stripe] Evento ignorado: ${event.type}`);
    }
  } catch (err) {
    console.error("[stripe] Erro ao processar o evento:", err);
    return NextResponse.json(
      { error: "Erro ao processar o evento." },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
