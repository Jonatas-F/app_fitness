import { Link } from "react-router-dom";
import logoMark from "../../../assets/logo_sp.svg";
import "./LegalPage.css";

const UPDATED = "11 de junho de 2026";
const CONTACT = "jonatas.freire.prof@gmail.com";

export default function TermsPage() {
  return (
    <main className="legal-page">
      <header className="legal-header">
        <Link to="/" className="legal-brand">
          <span><img src={logoMark} alt="Shape Certo" /></span>
          <div>
            <strong>Shape Certo</strong>
            <small>Personal Virtual fitness</small>
          </div>
        </Link>
        <Link to="/" className="legal-back">← Voltar ao início</Link>
      </header>

      <article className="legal-content">
        <span className="legal-eyebrow">Documento legal</span>
        <h1>Termos de Uso</h1>
        <p className="legal-updated">Última atualização: {UPDATED}</p>

        <p>
          Estes Termos regem o uso do aplicativo <strong>Shape Certo</strong>. Ao criar uma conta ou
          assinar um plano, você concorda com as condições abaixo.
        </p>

        <section className="legal-section">
          <div className="legal-section__head"><span className="legal-num">01</span><h2>O serviço</h2></div>
          <p>
            O Shape Certo é uma plataforma que gera e acompanha protocolos personalizados de treino e
            dieta com apoio de inteligência artificial, a partir das informações fornecidas pelo usuário
            (check-ins, objetivos, medidas e preferências).
          </p>
        </section>

        <section className="legal-section">
          <div className="legal-section__head"><span className="legal-num">02</span><h2>Conta e responsabilidades</h2></div>
          <ul>
            <li>Você é responsável por manter a confidencialidade das suas credenciais de acesso.</li>
            <li>As informações fornecidas devem ser verdadeiras — a qualidade das recomendações depende disso.</li>
            <li>É proibido usar o aplicativo para fins ilícitos ou tentar burlar limites de uso e segurança.</li>
          </ul>
        </section>

        <section className="legal-section">
          <div className="legal-section__head"><span className="legal-num">03</span><h2>Assinaturas e créditos de IA</h2></div>
          <ul>
            <li>Os planos são cobrados de forma recorrente (mensal ou anual) por meio da Stripe.</li>
            <li>Cada plano inclui uma quantidade de créditos de IA por mês para gerar protocolos e conversar com o Personal Virtual.</li>
            <li>Você pode cancelar a qualquer momento; o acesso permanece até o fim do período já pago.</li>
            <li>Preços e limites podem ser ajustados, com aviso prévio no aplicativo.</li>
          </ul>
        </section>

        <section className="legal-section">
          <div className="legal-section__head"><span className="legal-num">04</span><h2>Aviso de saúde</h2></div>
          <p>
            Os conteúdos têm caráter informativo e não substituem acompanhamento de profissional de
            educação física, nutricionista ou médico. Consulte um profissional antes de iniciar qualquer
            programa. O usuário é o único responsável por avaliar a adequação dos protocolos à sua condição.
          </p>
        </section>

        <section className="legal-section">
          <div className="legal-section__head"><span className="legal-num">05</span><h2>Limitação de responsabilidade</h2></div>
          <p>
            O serviço é fornecido "no estado em que se encontra". Não nos responsabilizamos por lesões,
            resultados não atingidos ou decisões tomadas com base no conteúdo gerado. O uso é por conta e
            risco do usuário, respeitada a legislação aplicável.
          </p>
        </section>

        <section className="legal-section">
          <div className="legal-section__head"><span className="legal-num">06</span><h2>Privacidade e contato</h2></div>
          <p>
            O tratamento de dados é descrito na <Link to="/privacidade">Política de Privacidade</Link>.
            Dúvidas sobre estes Termos: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
          </p>
        </section>

        <footer className="legal-footer">
          <Link to="/privacidade">Política de Privacidade</Link>
          <span>·</span>
          <Link to="/">Início</Link>
        </footer>
      </article>
    </main>
  );
}
