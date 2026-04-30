export const metadata = {
  title: "Termos e Condições | MOZBET",
};

export default function TermosPage() {
  return (
    <div className="space-y-6 text-muted-foreground leading-relaxed">
      <h1 className="text-3xl font-extrabold text-white mb-8">Termos e Condições de Uso</h1>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white">1. Introdução</h2>
        <p>
          Bem-vindo à MOZBET. Ao aceder e utilizar o nosso website, você concorda em cumprir e ficar vinculado aos seguintes termos e condições. A MOZBET opera sob as leis e regulamentos da República de Moçambique.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white">2. Elegibilidade</h2>
        <p>
          Para registar uma conta e realizar apostas na MOZBET, o utilizador deve ter idade igual ou superior a 18 anos. É da exclusiva responsabilidade do utilizador garantir que a participação em jogos de fortuna e azar é legal na sua jurisdição.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white">3. Registo de Conta</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Cada utilizador pode registar apenas uma (1) conta utilizando o seu número de telemóvel nacional (+258).</li>
          <li>As informações fornecidas durante o registo devem ser exatas, completas e atualizadas.</li>
          <li>A MOZBET reserva-se o direito de suspender ou encerrar contas duplicadas ou que forneçam dados falsos.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white">4. Depósitos e Levantamentos</h2>
        <p>
          Todas as transações financeiras são processadas exclusivamente através de carteiras móveis nacionais (M-Pesa e E-Mola) via a nossa integradora oficial (e2Payments).
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>O depósito mínimo é de 10 MT e o máximo é de 25.000 MT por transação.</li>
          <li>Os levantamentos só serão processados para o mesmo número de telemóvel utilizado durante o depósito.</li>
          <li>A MOZBET não cobra taxas adicionais por depósitos ou levantamentos, mas taxas das operadoras (Vodacom/Movitel) podem ser aplicadas.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white">5. Política de Bónus</h2>
        <p>
          A MOZBET oferece Bónus Promocionais aos seus jogadores (como o bónus de 500% no primeiro depósito). O saldo de bónus não pode ser levantado imediatamente e está sujeito a requisitos de apostas (Wagering Requirements) especificados na página de promoções.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white">6. Encerramento de Contas e Disputas</h2>
        <p>
          Reservamo-nos o direito de encerrar contas e anular apostas se houver suspeita fundamentada de fraude, manipulação de sistema ou uso de bots. Em caso de litígio, a decisão final caberá à equipa de gestão da MOZBET e aos órgãos reguladores competentes em Moçambique.
        </p>
      </section>

      <div className="pt-8 mt-8 border-t border-border/50 text-sm">
        <p>Última atualização: 29 de Abril de 2026</p>
      </div>
    </div>
  );
}
