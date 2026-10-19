import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Termos de Uso | FitApp",
  description:
    "Termos de uso da plataforma FitApp para Personal Trainers e seus alunos.",
};

export default function TermosDeUsoPage() {
  return (
    <main className="prose dark:prose-invert max-w-3xl mx-auto py-12 px-4">
      <h1>Termos de Uso</h1>
      <p className="italic">Última atualização: Outubro de 2026.</p>

      <h2>Aceitação dos Termos</h2>
      <p>
        Estes Termos de Uso regulam a utilização da plataforma FitApp, um
        serviço de gestão de fichas de treino para Personal Trainers e seus
        alunos. Ao criar uma conta ou continuar a utilizar qualquer
        funcionalidade do FitApp, você — aqui designado por
        &quot;Profissional&quot; — aceita estes Termos na íntegra. Se não
        concordar com alguma das suas disposições, não utilize o serviço.
      </p>

      <h2>Uso da Plataforma</h2>
      <p>
        O FitApp disponibiliza ferramentas para criar, organizar e partilhar
        fichas de treino com alunos mediante um link direto. O Profissional é o
        único responsável pela criação, prescrição, supervisão e ajuste dos
        treinos que disponibiliza aos seus alunos, incluindo a adequação dos
        exercícios aos objetivos, condições de saúde, lesões e limitações de
        cada aluno. O FitApp atua exclusivamente como ferramenta tecnológica de
        apoio: não avalia, recomenda nem valida exercícios, e não substitui o
        aconselhamento de um profissional de saúde ou de treino.
      </p>
      <p>
        O acesso à conta é pessoal e intransferível. O Profissional compromete-se
        a fornecer informações corretas na criação da conta, a manter as
        credenciais seguras e a utilizar a plataforma apenas para fins lícitos,
        no âmbito da sua atividade profissional.
      </p>

      <h2>Assinaturas e Cancelamentos</h2>
      <p>
        O FitApp oferece o plano Starter, gratuito e limitado a até 5 alunos,
        destinado a testar a plataforma, e o plano Pro, com custo de R$ 49,90
        por mês, que inclui alunos ilimitados e funcionalidades de marca
        (white-label). Os valores são faturados mensalmente de forma recorrente
        a partir da data de subscrição. O plano gratuito não exige dados de
        pagamento.
      </p>
      <p>
        O cancelamento pode ser feito a qualquer momento diretamente no painel,
        sendo efetivo no final do período de faturação já pago, sem direito a
        reembolso proporcional salvo o exigido por lei. Alterações de preços ou
        de âmbito dos planos serão comunicadas com, pelo menos, 30 dias de
        antecedência.
      </p>

      <h2>Limitação de Responsabilidade</h2>
      <p>
        O FitApp é fornecido &quot;como está&quot;, sem garantias de
        disponibilidade ininterrupta, ausência de erros ou adequação a um
        propósito específico. O Profissional assume integralmente a
        responsabilidade pelos treinos prescritos, pela relação com os seus
        alunos e por quaisquer lesões, danos ou resultados decorrentes da
        prática de exercícios físicos. Na máxima medida permitida pela lei
        aplicável, a responsabilidade do FitApp fica limitada aos valores
        efetivamente pagos pelo Profissional nos 12 meses anteriores ao facto
        que originar a reclamação.
      </p>
      <p>
        O serviço pode conter links para plataformas de terceiros (por exemplo,
        WhatsApp), sujeitas aos seus próprios termos e políticas, pelas quais o
        FitApp não se responsabiliza.
      </p>

      <p>
        <Link href="/">← Voltar para o Início</Link>
      </p>
    </main>
  );
}
