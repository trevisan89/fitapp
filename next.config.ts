import type { NextConfig } from "next";

/**
 * Diretivas de segurança aplicadas a todas as rotas (/(.*)).
 *
 * A CSP (Content-Security-Policy) é aplicada SÓ em produção: em dev o
 * HMR do Turpaback usa eval/blob e uma política estrita quebraria o
 * `next dev`. O Stripe.js já aparece em script-src/frame-src/connect-src
 * para os pagamentos sem alterações futuras de configuração.
 */
const diretivasSeguranca: Array<{ key: string; value: string }> = [
  // Impede que o browser "adivinhe" tipos de ficheiro (MIME sniffing).
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Clickjacking: a app nunca é embutida em iframes de terceiros
  // (reforçado por frame-ancestors 'none' na CSP).
  { key: "X-Frame-Options", value: "DENY" },
  // Não expõe o URL completo em referrers cross-origin.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Não cede permissões sensíveis do device (a app não precisa de nenhuma).
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

if (process.env.NODE_ENV === "production") {
  // HSTS apenas quando publicado (Vercel) — nunca em localhost.
  if (process.env.VERCEL) {
    diretivasSeguranca.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    });
  }

  diretivasSeguranca.push({
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      // 'unsafe-inline' é exigido pelos scripts de bootstrap do Next.js
      // (sem nonce configurado). GIFs de demonstração são URLs https
      // arbitrárias do profissional — img-src https: cobre isso.
      "script-src 'self' 'unsafe-inline' https://js.stripe.com https://checkout.stripe.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com",
      "frame-src https://js.stripe.com https://hooks.stripe.com",
      "media-src 'self' blob: data: https:",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
  });
}

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    serverActions: {
      // CSRF das Server Actions: o Next compara o Origin com o Host da
      // aplicação e rejeita divergências. Estes hosts são os extras
      // aceites além do próprio host (domínio de produção + dev local).
      allowedOrigins: [
        "fitapp-taupe.vercel.app",
        "localhost:3000",
        "127.0.0.1:3000",
      ],
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: diretivasSeguranca,
      },
    ];
  },
};

export default nextConfig;
