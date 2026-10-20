import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";

import { createServiceClient } from "@/lib/supabase/service";
import { getStripe } from "@/lib/stripe";

/**
 * Webhook do Stripe — sincroniza o estado da assinatura com a tabela
 * `profiles`, usando a SERVICE ROLE KEY (bypass do RLS): os eventos do
 * Stripe chegam sem sessão de utilizador.
 *
 * A verificação de assinatura exige o corpo BRUTO da request. O runtime é o
 * Node.js por omissão no Next 16 (a SDK usa crypto para validar o HMAC de
 * `stripe-signature`); com `cacheComponents` ativo não é possível exportar
 * `runtime`/`dynamic` no segmento.
 */

/** Extrai o ID de um objeto Stripe que pode vir como string ou expandido. */
function idDe(valor: string | { id: string } | null): string | null {
  if (!valor) return null;
  return typeof valor === "string" ? valor : valor.id;
}

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

  // Escrita em `profiles` fora do RLS — os eventos não têm sessão de user.
  const supabase = createServiceClient();
  if (!supabase) {
    console.error(
      "[stripe] SUPABASE_SERVICE_ROLE_KEY em falta — não é possível gravar em profiles."
    );
    return NextResponse.json(
      { error: "Servidor não configurado." },
      { status: 500 }
    );
  }

  // Um erro aqui devolve 500 e o Stripe reintenta o evento mais tarde.
  // As operações são idempotentes (mesmo update repetido não tem efeito extra).
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.client_reference_id;
        const customerId = idDe(session.customer);
        const assinaturaId = idDe(session.subscription);

        console.log("[stripe] checkout.session.completed", {
          sessionId: session.id,
          userId,
          clienteStripe: customerId,
          assinatura: assinaturaId,
          pagamento: session.payment_status,
        });

        if (!userId || !customerId) {
          console.error(
            "[stripe] Sessão sem client_reference_id ou customer — nada gravado.",
            { sessionId: session.id }
          );
          break;
        }

        // Ativa o plano Pro do Profissional que fez o checkout.
        const { error } = await supabase
          .from("profiles")
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: assinaturaId,
            plano_status: "pro",
          })
          .eq("id", userId);
        if (error) {
          console.error(
            "[stripe] Erro ao ativar plano em profiles:",
            error.message
          );
          throw error;
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = idDe(subscription.customer);

        console.log("[stripe] customer.subscription.deleted", {
          assinatura: subscription.id,
          clienteStripe: customerId,
          fim: subscription.ended_at,
        });

        if (!customerId) break;

        // Assinatura cancelada/expirada — volta ao plano Starter.
        const { error } = await supabase
          .from("profiles")
          .update({ plano_status: "starter", stripe_subscription_id: null })
          .eq("stripe_customer_id", customerId);
        if (error) {
          console.error(
            "[stripe] Erro ao reverter plano em profiles:",
            error.message
          );
          throw error;
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId = idDe(invoice.customer);

        console.log("[stripe] invoice.payment_failed", {
          invoiceId: invoice.id,
          clienteStripe: customerId,
          tentativa: invoice.attempt_count,
        });

        if (!customerId) break;

        // Pagamento falhou (inadimplência) — reverte para Starter.
        const { error } = await supabase
          .from("profiles")
          .update({ plano_status: "starter" })
          .eq("stripe_customer_id", customerId);
        if (error) {
          console.error(
            "[stripe] Erro ao reverter plano em profiles:",
            error.message
          );
          throw error;
        }
        break;
      }

      default:
        // Ex.: customer.subscription.updated, invoice.paid — sem ação por agora.
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
