export const metadata = {
  title: "Política de Privacidade | MOZBET",
};

export default function PrivacidadePage() {
  return (
    <div className="space-y-6 text-muted-foreground leading-relaxed">
      <h1 className="text-3xl font-extrabold text-white mb-8">Política de Privacidade</h1>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white">1. Nosso Compromisso</h2>
        <p>
          Na MOZBET, a privacidade e a segurança dos dados dos nossos utilizadores são a nossa maior prioridade. Esta política explica como recolhemos, usamos, protegemos e partilhamos as suas informações pessoais ao utilizar os nossos serviços.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white">2. Informações Recolhidas</h2>
        <p>Ao registar e utilizar a MOZBET, recolhemos os seguintes dados essenciais:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Dados de Conta:</strong> Número de telefone celular (+258) e a palavra-passe encriptada de forma segura (Hash).</li>
          <li><strong>Dados Financeiros:</strong> Histórico de transações, montantes de depósitos e levantamentos processados via carteiras móveis parceiras (e2Payments). Não armazenamos PINs ou credenciais bancárias.</li>
          <li><strong>Dados de Navegação:</strong> Endereços IP (para prevenção de fraudes e rate-limiting), tipo de dispositivo e métricas básicas de uso para melhorar a sua experiência (cookies).</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white">3. Como Usamos as Informações</h2>
        <p>Utilizamos as suas informações para os seguintes propósitos restritos:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Processar as suas apostas, depósitos e levantamentos.</li>
          <li>Garantir a segurança da sua conta e prevenir atividades fraudulentas, branqueamento de capitais ou acessos não autorizados.</li>
          <li>Fornecer suporte ao cliente através da nossa Inteligência Artificial ou equipa humana.</li>
          <li>Cumprir obrigações legais e regulamentares da Inspeção Geral de Jogos de Moçambique.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white">4. Partilha de Dados</h2>
        <p>
          A MOZBET <strong>nunca venderá ou alugará</strong> os seus dados a terceiros para fins de marketing. Partilhamos as suas informações estritamente com:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Prestadores de Pagamento (e2Payments):</strong> Para processamento exclusivo de transações M-Pesa e E-Mola.</li>
          <li><strong>Autoridades Legais:</strong> Se formos legalmente obrigados a fazê-lo por mandado judicial ou exigência regulatória moçambicana.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white">5. Segurança dos Dados</h2>
        <p>
          Utilizamos criptografia padrão da indústria (incluindo JWT HttpOnly Cookies, certificados TLS/SSL e RLS nas bases de dados) para proteger as suas informações contra acessos indevidos. Todas as passwords são encriptadas de forma irreversível (Bcrypt) no servidor.
        </p>
      </section>

      <div className="pt-8 mt-8 border-t border-border/50 text-sm">
        <p>Última atualização: 29 de Abril de 2026</p>
      </div>
    </div>
  );
}
