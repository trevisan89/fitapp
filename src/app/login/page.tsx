import type { Metadata } from "next";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Entrar | AURA Training",
  description: "Acesse o painel do Personal Trainer.",
};

/**
 * Autenticação do profissional (rota pública — o proxy redireciona
 * utilizadores já autenticados para /dashboard).
 */
export default function LoginPage() {
  return <LoginForm />;
}
