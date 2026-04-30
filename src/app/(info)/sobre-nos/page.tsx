export const metadata = {
  title: "Quem Somos | MOZBET",
};

export default function SobreNosPage() {
  return (
    <div className="space-y-6 text-muted-foreground leading-relaxed">
      <h1 className="text-3xl font-extrabold text-white mb-8">Sobre a MOZBET</h1>

      <section className="space-y-4">
        <p className="text-lg">
          A <strong className="text-primary">MOZBET</strong> é uma plataforma de apostas desportivas e casino online inovadora, desenvolvida especificamente para o público moçambicano. O nosso objetivo é proporcionar uma experiência de entretenimento seguro, rápido e transparente, acessível a qualquer pessoa a partir do seu telemóvel.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white mt-8">A Nossa Missão</h2>
        <p>
          Queremos redefinir a experiência de apostas em Moçambique, combinando a paixão nacional pelo desporto e jogos com a mais recente tecnologia de ponta. Otimizamos a nossa plataforma para funcionar perfeitamente mesmo em conexões de internet mais lentas e telemóveis de entrada, garantindo que ninguém fique de fora da diversão.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white mt-8">Tecnologia e Segurança</h2>
        <p>
          Construímos a MOZBET sobre uma arquitetura tecnológica robusta e segura. Empregamos encriptação avançada e protocolos rigorosos de verificação para garantir que o seu dinheiro e as suas informações pessoais estão sempre blindados contra ameaças.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white mt-8">Integração Local</h2>
        <p>
          Entendemos que a facilidade de transação é fundamental. Por isso, a MOZBET é orgulhosamente integrada com os sistemas de pagamento mais utilizados pelos moçambicanos: o <strong>M-Pesa</strong> e o <strong>E-Mola</strong>, através do nosso parceiro de confiança, a e2Payments. Os seus depósitos refletem-se instantaneamente, e os seus ganhos são pagos na hora.
        </p>
      </section>

      <section className="space-y-4 mt-8 pt-8 border-t border-border/50">
        <h2 className="text-xl font-bold text-white">Contactos</h2>
        <p>
          Precisas de ajuda ou queres deixar uma sugestão? A nossa Inteligência Artificial está disponível 24/7 na plataforma, ou podes enviar um email para:
        </p>
        <p className="font-bold text-white">suportemozbet@gmail.com</p>
      </section>
    </div>
  );
}
