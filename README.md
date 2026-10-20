# FitApp

SaaS white-label de fichas de treino para Personal Trainers. O profissional monta
as fichas com drag-and-drop e o aluno treina pelo navegador (PWA) — sem precisar
baixar aplicativo nas lojas.

## Funcionalidades

- **Painel do Personal**: alunos, fichas de treino, biblioteca de exercícios e
  definições de marca (logo, cor primária, slug white-label).
- **Montador de fichas** com drag-and-drop: dias (A/B/C...), séries, repetições,
  carga sugerida e descanso.
- **WebApp do aluno** via link privado (`/aluno/[token]`): treino do dia, registro
  de séries/carga/RPE e cronômetro de descanso.
- **Biblioteca global com 73 exercícios** (demonstração em GIF) + exercícios
  próprios do profissional.
- **PWA** instalável no celular do aluno.
- **Assinaturas via Stripe**: checkout em modo assinatura e webhook que sincroniza
  o plano (`starter`/`pro`) na tabela `profiles`.

## Stack

- **Next.js 16** — App Router, Server Actions, Route Handlers, Cache Components
- **Supabase** — Postgres, Autenticação e Row Level Security
- **Tailwind CSS 4** + shadcn/ui + lucide-react
- **Stripe** — Checkout Sessions + Webhooks
- **TypeScript** estrito

## Requisitos

- Node.js 20+
- Um projeto Supabase (URL + chaves anon e service_role)

## Variáveis de ambiente

Copie `.env.local.example` para `.env.local` e preencha:

| Variável                            | Descrição                                                    |
| ----------------------------------- | ------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`          | URL do projeto Supabase                                       |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`     | Chave pública (anon)                                          |
| `SUPABASE_SERVICE_ROLE_KEY`         | Chave de serviço — só servidor (bypass do RLS)                |
| `NEXT_PUBLIC_APP_URL`               | URL pública da app (dev: `http://localhost:3000`)             |
| `STRIPE_SECRET_KEY`                 | Chave secreta do Stripe (modo teste)                          |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`| Chave pública do Stripe                                       |
| `STRIPE_WEBHOOK_SECRET`             | Segredo de assinatura do webhook (`/api/webhook`)             |
| `STRIPE_PRICE_ID`                   | Price ID do plano Pro (`price_...`, em Products → Pricing)    |

## Rodando localmente

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Crie o `.env.local` com os valores da tabela acima. Os pagamentos ficam
   desativados (resposta `503`) enquanto `STRIPE_PRICE_ID` não estiver definido.

3. Aplique o schema no Supabase: no **SQL Editor**, cole e execute, por esta ordem:

   - `supabase/migrations/01_initial_schema.sql` (tabelas + RLS + catálogo inicial)
   - `supabase/migrations/02_stripe_subscriptions.sql` (colunas de assinatura em `profiles`)

4. Inicie o servidor de desenvolvimento:

   ```bash
   npm run dev
   ```

5. Abra <http://localhost:3000> — landing page comercial; `/login` para o painel
   do profissional.

Para testar os eventos do Stripe em desenvolvimento:

```bash
stripe listen --forward-to localhost:3000/api/webhook
```

## Estrutura do projeto

```
src/
├── app/              # rotas: landing, /login, /dashboard, /aluno/[token], /api
├── components/       # UI: dashboard, montador de fichas, webapp do aluno
├── lib/              # Supabase (client/server/service), Stripe, validators
└── types/            # tipos do banco (database.types.ts)
supabase/migrations/  # schema SQL, RLS e migrações incrementais
public/               # ícones PWA e manifest
```

## Deploy (Vercel)

1. Importe o repositório na Vercel.
2. Adicione as variáveis de ambiente da tabela acima (use o domínio de produção
   em `NEXT_PUBLIC_APP_URL`).
3. Clique em **Deploy**. Em seguida:
   - Supabase → *Authentication → URL Configuration*: adicione o domínio aos
     Redirect URLs.
   - Stripe → crie um webhook apontando para `https://<dominio>/api/webhook` e
     copie o segredo para `STRIPE_WEBHOOK_SECRET` na Vercel.
