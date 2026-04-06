import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./login.css";

function LoginPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    // Fluxo temporário até a autenticação real:
    // ao enviar o formulário, o usuário entra na área interna existente.
    navigate("/app");
  };

  return (
    <div className="auth-page">
      <div className="auth-wrapper">
        <section className="auth-hero glass-card">
          <div className="auth-hero-content">
            <span className="eyebrow">Acesso da plataforma</span>

            <div className="brand auth-brand">
              <div className="brand-badge">SC</div>
              <div className="brand-text">
                <h1>Shape Certo</h1>
                <span>Seu ecossistema fitness com base em dados</span>
              </div>
            </div>

            <h2 className="auth-title">
              Entre para acompanhar treino, dieta, progresso e evolução em um só lugar.
            </h2>

            <p className="auth-description">
              Esta etapa fecha a base de autenticação visual do projeto. O login
              já entra por rota real e prepara o terreno para cadastro, conta e
              autenticação persistente.
            </p>

            <div className="auth-highlight-list">
              <div className="auth-highlight-item">
                <strong>Treino atual</strong>
                <span>Protocolos organizados por ciclo</span>
              </div>

              <div className="auth-highlight-item">
                <strong>Dieta atual</strong>
                <span>Estratégia alimentar com histórico</span>
              </div>

              <div className="auth-highlight-item">
                <strong>Progresso vivo</strong>
                <span>Atualizações, fotos e reavaliações</span>
              </div>
            </div>
          </div>
        </section>

        <section className="auth-form-panel glass-card">
          <div className="auth-form-header">
            <span className="badge badge-primary">Login</span>
            <h2>Acesse sua conta</h2>
            <p>
              Entre com seu e-mail e senha para acessar a área interna da plataforma.
            </p>
          </div>

          <form className="form-grid auth-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label className="input-label" htmlFor="email">
                E-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="input-field"
                placeholder="seuemail@exemplo.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="password">
                Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                className="input-field"
                placeholder="Digite sua senha"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            <button type="submit" className="primary-button auth-submit">
              Entrar
            </button>

            <button
              type="button"
              className="secondary-button auth-google-button"
              disabled
            >
              Entrar com Google em breve
            </button>
          </form>

          <div className="auth-links">
            <Link to="/" className="auth-link">
              Voltar para Home
            </Link>

            <a href="#" className="auth-link">
              Esqueci minha senha
            </a>
          </div>

          <div className="auth-footer-note">
            <span className="text-muted">
              Cadastro entra no próximo passo. Neste momento, a rota de cadastro
              está temporariamente redirecionada para o login.
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}

export default LoginPage;