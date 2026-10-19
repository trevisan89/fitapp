import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/types/database.types";

/**
 * Controle de sessão do Supabase (Next.js 16).
 *
 * Observação: no Next.js 16 a convenção `middleware.ts` foi depreciada e
 * renomeada para `proxy.ts` — mesma funcionalidade, com `export function
 * proxy()` e `config.matcher`. Ver
 * `node_modules/next/dist/docs/.../file-conventions/proxy.md`.
 *
 * Fluxo (`updateSession` do @supabase/ssr):
 * 1. Cria um cliente Supabase que lê os cookies do request e escreve os
 *    cookies renovados na resposta (`setAll`).
 * 2. Chama `getUser()` SEM rodar código entre a criação e a chamada — é
 *    ele que dispara o refresh do token e persiste os novos cookies.
 * 3. Retorna a resposta com os cookies atualizados anexados.
 */
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Variáveis de ambiente do Supabase ausentes. Copie `.env.local.example` para `.env.local` e preencha NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        // Recria a resposta para carregar os cookies já atualizados no
        // request e devolvê-los no Set-Cookie da resposta.
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANTE: não execute código entre createServerClient() e
  // supabase.auth.getUser() — o refresh do token depende disso.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Guardas de sessão (só DEPOIS do getUser, para não atrasar o refresh):
  //   * rotas do painel exigem sessão → /login;
  //   * /login com sessão → /dashboard.
  // O WebApp do aluno (/aluno/[token]) e a landing são públicos.
  const caminho = request.nextUrl.pathname;
  const emPainel = caminho === "/dashboard" || caminho.startsWith("/dashboard/");
  const emLogin = caminho === "/login" || caminho.startsWith("/login/");

  if (emPainel && !user) {
    return redirecionar(request, supabaseResponse, "/login");
  }

  if (emLogin && user) {
    return redirecionar(request, supabaseResponse, "/dashboard");
  }

  return supabaseResponse;
}

/**
 * Redirect que preserva os cookies renovados pelo refresh do Supabase —
 * descartá-los invalidaria o refresh token rotacionado e reenviaria o
 * utilizador para /login no pedido seguinte.
 */
function redirecionar(
  request: NextRequest,
  respostaComCookies: NextResponse,
  caminho: string
): NextResponse {
  const destino = request.nextUrl.clone();
  destino.pathname = caminho;
  destino.search = "";

  const resposta = NextResponse.redirect(destino);

  for (const cookie of respostaComCookies.headers.getSetCookie()) {
    resposta.headers.append("Set-Cookie", cookie);
  }

  return resposta;
}

export const config = {
  matcher: [
    // Só rota navegações de página: ignora assets internos e estáticos
    // (_next/static, _next/image, favicon, imagens, fontes, css, js...).
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff2?)$).*)",
  ],
};
