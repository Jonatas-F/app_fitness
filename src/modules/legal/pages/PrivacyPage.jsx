import { Link } from "react-router-dom";
import logoMark from "../../../assets/logo_sp.svg";
import "./LegalPage.css";

const UPDATED = "11 de junho de 2026";
const CONTACT = "jonatas.freire.prof@gmail.com";

export default function PrivacyPage() {
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
        <h1>Política de Privacidade</h1>
        <p className="legal-updated">Última atualização: {UPDATED}</p>

        <p>
          Esta Política de Privacidade descreve como o <strong>Shape Certo</strong> ("nós", "aplicativo")
          coleta, usa, armazena e protege os dados pessoais dos seus usuários, em conformidade com a
          Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD). Ao criar uma conta e usar o
          aplicativo, você concorda com as práticas descritas aqui.
        </p>

        <section className="legal-section">
          <div className="legal-section__head"><span className="legal-num">01</span><h2>Quais dados coletamos</h2></div>
          <ul>
            <li><strong>Dados de cadastro:</strong> nome, e-mail e senha (armazenada de forma criptografada). Caso use o login do Google, recebemos seu nome e e-mail da conta Google.</li>
            <li><strong>Dados de saúde e composição corporal:</strong> peso, altura, medidas, percentual de gordura, bioimpedância e, opcionalmente, fotos de progresso que você decidir enviar.</li>
            <li><strong>Dados de treino e rotina:</strong> objetivos, frequência, lesões, preferências alimentares, check-ins e registros de execução (cargas e repetições).</li>
            <li><strong>Dados de uso:</strong> interações com o aplicativo necessárias ao funcionamento (ex.: protocolos gerados, histórico de conversas com o Personal Virtual).</li>
            <li><strong>Dados de pagamento:</strong> processados <strong>diretamente pela Stripe</strong>. Não armazenamos número de cartão — recebemos apenas o status da assinatura.</li>
          </ul>
        </section>

        <section className="legal-section">
          <div className="legal-section__head"><span className="legal-num">02</span><h2>Como usamos os dados</h2></div>
          <ul>
            <li>Gerar e ajustar protocolos personalizados de treino e dieta por meio de inteligência artificial.</li>
            <li>Acompanhar sua evolução ao longo do tempo (gráficos, comparativos e check-ins).</li>
            <li>Operar a assinatura, o login e o suporte ao usuário.</li>
            <li>Melhorar a experiência e a precisão das recomendações do aplicativo.</li>
          </ul>
          <p>Não vendemos seus dados pessoais e não os usamos para publicidade de terceiros.</p>
        </section>

        <section className="legal-section">
          <div className="legal-section__head"><span className="legal-num">03</span><h2>Compartilhamento e processadores</h2></div>
          <p>Compartilhamos dados apenas com prestadores essenciais ao funcionamento do serviço:</p>
          <ul>
            <li><strong>Provedores de IA (OpenAI / Anthropic):</strong> recebem os dados do seu perfil necessários para gerar treino e dieta. O conteúdo é enviado de forma isolada por usuário e usado apenas para gerar a sua resposta.</li>
            <li><strong>Stripe:</strong> processamento de pagamentos e gestão de assinatura.</li>
            <li><strong>Google:</strong> autenticação, quando você opta por entrar com a conta Google.</li>
            <li><strong>Infraestrutura de hospedagem:</strong> servidores onde os dados ficam armazenados com acesso restrito.</li>
          </ul>
        </section>

        <section className="legal-section">
          <div className="legal-section__head"><span className="legal-num">04</span><h2>Armazenamento e segurança</h2></div>
          <p>
            Os dados são armazenados em banco de dados com acesso restrito e transmitidos sempre por
            conexão segura (HTTPS). Senhas são guardadas de forma criptografada (hash) e chaves de
            integração ficam exclusivamente no servidor, nunca expostas ao navegador. Parte das
            preferências fica no seu dispositivo (armazenamento local) para o app funcionar de forma fluida.
          </p>
        </section>

        <section className="legal-section">
          <div className="legal-section__head"><span className="legal-num">05</span><h2>Seus direitos (LGPD)</h2></div>
          <p>A qualquer momento você pode solicitar:</p>
          <ul>
            <li>Acesso aos dados que mantemos sobre você;</li>
            <li>Correção de dados incompletos ou desatualizados;</li>
            <li>Exclusão da conta e dos dados associados;</li>
            <li>Portabilidade e informações sobre o compartilhamento;</li>
            <li>Revogação do consentimento.</li>
          </ul>
          <p>
            Para exercer qualquer direito — inclusive <strong>exclusão da conta e dos dados</strong> —
            escreva para <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. Atendemos as solicitações em até 15 dias.
          </p>
        </section>

        <section className="legal-section">
          <div className="legal-section__head"><span className="legal-num">06</span><h2>Retenção e exclusão</h2></div>
          <p>
            Mantemos seus dados enquanto sua conta estiver ativa. Ao solicitar a exclusão, removemos os
            dados pessoais associados, exceto registros que precisem ser mantidos por obrigação legal ou
            fiscal (ex.: comprovantes de pagamento, pelo prazo exigido por lei).
          </p>
        </section>

        <section className="legal-section">
          <div className="legal-section__head"><span className="legal-num">07</span><h2>Menores de idade</h2></div>
          <p>
            O Shape Certo é destinado a maiores de 18 anos. Não coletamos intencionalmente dados de
            menores. Se identificarmos um cadastro nessas condições, a conta será removida.
          </p>
        </section>

        <section className="legal-section">
          <div className="legal-section__head"><span className="legal-num">08</span><h2>Aviso de saúde</h2></div>
          <p>
            Os protocolos gerados pelo aplicativo têm caráter informativo e de apoio. Não substituem
            avaliação ou acompanhamento de profissional de educação física, nutricionista ou médico.
            Consulte um profissional antes de iniciar qualquer programa de treino ou dieta.
          </p>
        </section>

        <section className="legal-section">
          <div className="legal-section__head"><span className="legal-num">09</span><h2>Alterações e contato</h2></div>
          <p>
            Podemos atualizar esta política periodicamente. Mudanças relevantes serão comunicadas no
            aplicativo. Dúvidas sobre privacidade: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
          </p>
        </section>

        <footer className="legal-footer">
          <Link to="/termos">Termos de Uso</Link>
          <span>·</span>
          <Link to="/">Início</Link>
        </footer>
      </article>
    </main>
  );
}
