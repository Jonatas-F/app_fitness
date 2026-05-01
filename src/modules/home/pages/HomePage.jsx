import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import logo from "../../../assets/logo.svg";
import { formatCurrency, subscriptionPlans } from "../../../data/plans";
import {
  buildGoogleSignInUrl,
  rememberGoogleReturnTo,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from "../../../services/authService";
import "./HomePage.css";

const plans = subscriptionPlans;

const platformItems = [
  "Check-ins diario, semanal e mensal",
  "Treino ABCDE com series dinamicas",
  "Dieta por refeicoes habilitadas",
  "Dashboard de evolucao corporal e performance",
  "Perfil com academia, preferencias e pagamentos",
];

export default function HomePage() {
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState("login");
  const [selectedPlan, setSelectedPlan] = useState("intermediario");
  const [authForm, setAuthForm] = useState({
    fullName: "",
    email: "",
    password: "",
  });
  const [authMessage, setAuthMessage] = useState("");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const googleSignInUrl = buildGoogleSignInUrl({ returnTo: "/dashboard" });

  useEffect(() => {
    const hash = window.location.hash.startsWith("#")
      ? window.location.hash.slice(1)
      : window.location.hash;
    const params = new URLSearchParams(hash);
    const authError = params.get("auth_error");

    if (!authError) {
      return;
    }

    setAuthMessage(authError);
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }, []);

  function handleAuthChange(event) {
    const { name, value } = event.target;
    setAuthMessage("");
    setAuthForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setAuthMessage("");

    const result =
      authMode === "login"
        ? await signInWithEmail({
            email: authForm.email,
            password: authForm.password,
          })
        : await signUpWithEmail({
            email: authForm.email,
            password: authForm.password,
            fullName: authForm.fullName,
            plan: selectedPlan,
          });

    if (result.error) {
      setAuthMessage(result.error.message);
      return;
    }

    if (result.skipped) {
      setAuthMessage("Supabase ainda nao configurado. Entrando em modo local.");
    }

    navigate("/dashboard");
  }

  async function handleGoogleLogin() {
    setAuthMessage("");
    setIsGoogleLoading(true);
    const result = await signInWithGoogle({ returnTo: "/dashboard" });

    if (result.error) {
      setAuthMessage(result.error.message);
      setIsGoogleLoading(false);
      return;
    }

    if (result.skipped) {
      setAuthMessage("Supabase ainda nao configurado. Preencha o .env.local para ativar Google.");
      setIsGoogleLoading(false);
    }
  }

  function handleGoogleLinkClick() {
    rememberGoogleReturnTo("/dashboard");
    setAuthMessage("");
    setIsGoogleLoading(true);
  }

  return (
    <main className="home-page">
      <header className="home-header">
        <Link to="/" className="home-brand">
          <span>
            <img src={logo} alt="Shape Certo" />
          </span>
          <div>
            <strong>Shape Certo</strong>
            <small>Personal Virtual fitness</small>
          </div>
        </Link>

        <nav className="home-header__nav" aria-label="Navegacao da home">
          <a href="#quem-somos">Quem somos</a>
          <a href="#planos">Planos</a>
          <a href="#acesso">Entrar</a>
        </nav>
      </header>

      <section className="home-hero">
        <div className="home-hero__content">
          <span className="home-eyebrow">Treino, dieta e evolucao no mesmo lugar</span>
          <h1>Uma plataforma para transformar check-ins em protocolos personalizados.</h1>
          <p>
            O Shape Certo organiza dados corporais, rotina, aparelhos disponiveis, preferencias
            alimentares e historico de treino para o Personal Virtual montar orientacoes mais precisas.
          </p>

          <div className="home-hero__actions">
            <a className="primary-button" href="#acesso">
              Comecar agora
            </a>
            <a className="secondary-button" href="#planos">
              Ver planos
            </a>
          </div>
        </div>

        <aside className="home-auth-panel glass-panel" id="acesso">
          <div className="home-auth-panel__tabs">
            <button
              type="button"
              className={authMode === "login" ? "is-active" : ""}
              onClick={() => setAuthMode("login")}
            >
              Login
            </button>
            <button
              type="button"
              className={authMode === "signup" ? "is-active" : ""}
              onClick={() => setAuthMode("signup")}
            >
              Criar conta
            </button>
          </div>

          <form className="home-auth-form" onSubmit={handleSubmit}>
            {authMode === "signup" ? (
              <label>
                <span>Nome completo</span>
                <input
                  type="text"
                  name="fullName"
                  value={authForm.fullName}
                  onChange={handleAuthChange}
                  placeholder="Seu nome"
                />
              </label>
            ) : null}

            <label>
              <span>Email</span>
              <input
                type="email"
                name="email"
                value={authForm.email}
                onChange={handleAuthChange}
                placeholder="usuario@gmail.com"
              />
            </label>

            <label>
              <span>Senha</span>
              <input
                type="password"
                name="password"
                value={authForm.password}
                onChange={handleAuthChange}
                placeholder="Digite sua senha"
              />
            </label>

            {authMode === "signup" ? (
              <label>
                <span>Plano inicial</span>
                <select value={selectedPlan} onChange={(event) => setSelectedPlan(event.target.value)}>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <button type="submit" className="primary-button">
              {authMode === "login" ? "Entrar na plataforma" : "Criar conta"}
            </button>

            <a
              href={googleSignInUrl || "#"}
              role="button"
              className="home-google-button"
              onClick={googleSignInUrl ? handleGoogleLinkClick : handleGoogleLogin}
              aria-disabled={isGoogleLoading}
            >
              {isGoogleLoading ? "Abrindo Google..." : "Continuar com Google"}
            </a>

            {authMessage ? <small className="home-auth-message">{authMessage}</small> : null}
          </form>
        </aside>

      </section>

      <section className="home-section" id="quem-somos">
        <div className="home-section__copy">
          <span className="home-eyebrow">Quem somos</span>
          <h2>Um app feito para acompanhar a evolucao real, nao apenas gerar uma ficha solta.</h2>
          <p>
            A plataforma conecta check-ins, treino, dieta, bioimpedancia, fotos e videos de execucao
            para criar uma base de dados continua. Com isso, cada protocolo pode evoluir conforme o
            usuario treina, descansa, se alimenta e registra seus resultados.
          </p>
        </div>

        <div className="home-feature-grid">
          {platformItems.map((item) => (
            <article key={item} className="home-feature-card">
              <span />
              <strong>{item}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="home-section" id="planos">
        <div className="home-section__copy">
          <span className="home-eyebrow">Planos</span>
          <h2>Escolha a quantidade de acompanhamento e tokens que combina com a rotina.</h2>
          <p>
            Os valores e limites abaixo sao ilustrativos para estruturar o produto antes da integracao
            com pagamento, backend e controle real de consumo.
          </p>
        </div>

        <div className="home-plan-grid">
          {plans.map((plan) => (
            <article key={plan.id} className={`home-plan-card ${plan.featured ? "is-featured" : ""}`}>
              {plan.featured ? <span className="home-plan-card__badge">Mais equilibrado</span> : null}
              <div>
                <small>{plan.highlight}</small>
                <h3>{plan.name}</h3>
                <p>
                  <strong>{formatCurrency(plan.monthlyPrice)}</strong>
                  <span>/mes</span>
                </p>
              </div>

              <div className="home-plan-card__limits">
                <span>{plan.tokens}</span>
                <span>{plan.workouts}</span>
                <span>{plan.meals}</span>
              </div>

              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>

              <Link
                className={plan.featured ? "primary-button" : "secondary-button"}
                to={`/checkout?plan=${plan.id}`}
              >
                Escolher {plan.name}
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
