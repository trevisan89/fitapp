-- ============================================================
-- 02 — Assinaturas Stripe em `profiles`
--
-- Colunas de sincronização com o Stripe, gravadas pelo webhook
-- `src/app/api/webhook/route.ts` (via service role, bypass de RLS):
--
--   checkout.session.completed  -> stripe_customer_id,
--                                  stripe_subscription_id,
--                                  plano_status = 'pro'
--   customer.subscription.deleted
--   invoice.payment_failed      -> plano_status = 'starter'
-- ============================================================

alter table public.profiles
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists plano_status text not null default 'starter';

-- Somente os dois planos existentes.
alter table public.profiles
  add constraint profiles_plano_status_check
  check (plano_status in ('starter', 'pro'));

-- O webhook localiza o perfil pelo customer id do Stripe.
create index if not exists profiles_stripe_customer_id_idx
  on public.profiles (stripe_customer_id);
