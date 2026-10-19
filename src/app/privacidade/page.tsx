import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidade | FitApp",
  description:
    "Política de privacidade do FitApp: como recolhemos, usamos e protegemos os seus dados.",
};

export default function PrivacidadePage() {
  return (
    <main className="prose dark:prose-invert max-w-3xl mx-auto py-12 px-4">
      <h1>Política de Privacidade</h1>
      <p className="italic">Última atualização: Outubro de 2026.</p>

      <h2>Recolha de Dados</h2>
      <p>
        Para prestar o serviço, o FitApp recolhe apenas os dados necessários:
        na criação da conta do Profissional, o seu nome, endereço de e-mail e
        palavra-passe (guardada de forma cifrada); na utilização da plataforma,
        os dados dos alunos inseridos pelo Profissional (por exemplo, nome e
        identificador de acesso às fichas), os treinos e exercícios criados e os
        dados de execução dos treinos (séries concluídas e datas de prática).
        Podemos ainda registar informação técnica básica de sessão indispensável
        ao funcionamento e à segurança do app.
      </p>

      <h2>Uso das Informações</h2>
      <p>
        Os dados são utilizados exclusivamente para o funcionamento do FitApp:
        autenticação, apresentação das fichas aos alunos, acompanhamento do
        progresso do treino e melhoria do próprio serviço. Não vendemos,
        alugamos nem cedemos dados pessoais a terceiros para fins de
        publicidade, marketing ou qualquer outra finalidade comercial, e não
        utilizamos os dados dos seus alunos para outro fim que não o prestado
        pela plataforma.
      </p>

      <h2>Proteção de Dados</h2>
      <p>
        A informação é transmitida sempre através de ligação cifrada (HTTPS) e
        alojada em infraestrutura cloud com controlo de acesso por conta: cada
        profissional acede apenas aos seus próprios dados e aos dos seus
        alunos, através de políticas de segurança aplicadas na base de dados. As
        credenciais de acesso privilegiado ao sistema nunca são expostas no
        navegador do utilizador. Apesar disso, nenhum sistema é imune a riscos,
        e adotamos as medidas razoáveis para minimizá-los.
      </p>

      <h2>Direitos do Utilizador</h2>
      <p>
        O titular dos dados tem o direito de solicitar acesso, correção,
        exportação ou eliminação dos seus dados pessoais, nos termos da
        legislação aplicável de proteção de dados (incluindo a LGPD). A conta do
        Profissional pode ser apagada diretamente no painel, em Definições,
        o que remove os dados associados da plataforma, ou mediante pedido
        através do e-mail de suporte. O encerramento da conta não é
        condicionado a qualquer pagamento ou permanência mínima.
      </p>

      <p>
        <Link href="/">← Voltar para o Início</Link>
      </p>
    </main>
  );
}
