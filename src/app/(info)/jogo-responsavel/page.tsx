export const metadata = {
  title: "Jogo Responsável | MOZBET",
};

export default function JogoResponsavelPage() {
  return (
    <div className="space-y-6 text-muted-foreground leading-relaxed">
      <h1 className="text-3xl font-extrabold text-white mb-8">Jogo Responsável</h1>

      <section className="space-y-4">
        <p className="text-lg">
          As apostas e os jogos de casino devem ser sempre encarados como uma forma de entretenimento, e não como uma forma de ganhar a vida ou resolver problemas financeiros. Na <strong className="text-primary">MOZBET</strong>, estamos empenhados em promover um ambiente de jogo seguro e responsável.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white mt-8">Prevenção para Menores</h2>
        <p>
          É estritamente proibido a menores de 18 anos apostar na MOZBET. O nosso processo de registo e verificação financeira foi desenhado para impedir que menores acedam às nossas funcionalidades de dinheiro real.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white mt-8">Dicas para um Jogo Saudável</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Defina um orçamento para o seu entretenimento e nunca aposte dinheiro que não pode perder (dinheiro destinado a rendas, alimentação, etc.).</li>
          <li>Estabeleça limites de tempo para o jogo e faça pausas frequentes.</li>
          <li>Nunca tente recuperar o dinheiro que perdeu ("chasing losses").</li>
          <li>Não aposte quando estiver sob o efeito de álcool, drogas ou num estado emocional frágil.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white mt-8">Auto-Exclusão</h2>
        <p>
          Se sentir que está a perder o controlo sobre o seu jogo, a MOZBET oferece a opção de auto-exclusão. Pode solicitar o bloqueio temporário ou permanente da sua conta entrando em contacto com o nosso suporte através de <strong className="text-white">suportemozbet@gmail.com</strong>.
        </p>
      </section>
    </div>
  );
}
