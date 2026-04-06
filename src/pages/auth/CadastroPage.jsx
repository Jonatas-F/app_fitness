import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./cadastro.css";

function CadastroPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  });

  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (errorMessage) {
      setErrorMessage("");
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage("A confirmação de senha precisa ser igual à senha.");
      return;
    }

    if (!formData.acceptTerms) {
      setErrorMessage("Você precisa aceitar os termos para continuar.");
      return;
    }

    navigate("/app");
  };

  return (
    <div className="register-page">
      <div className="register-wrapper">
        <section className="register-hero glass-card">
          <div className="register-hero-content">
            <span className="eyebrow">Cadastro inicial</span>

            <div className="brand register-brand">
              <div className="brand-badge">SC</div>
              <div className="brand-text">
                <h1>Shape Certo</h1>
                <span>Estrutura pronta para treino, dieta e evolução</span>
              </div>
            </div>

            <h2 className="register-title">
              Crie sua conta para começar sua jornada com uma base organizada e inteligente.
            </h2>

            <p className="register-description">
              Aqui nasce a camada de acesso da plataforma. Conta e autenticação
              ficam separadas do perfil físico, que será consolidado nas próximas
              etapas como base viva de dados.
            </p>

            <div className="register-benefits">
              <div className="register-benefit-card">
                <strong>Conta separada do perfil</strong>
                <span>Acesso e autenticação independentes dos dados físicos</span>
              </div>

              <div className="register-benefit-card">
                <strong>Base pronta para histórico</strong>
                <span>O sistema evolui sem perder estrutura no futuro</span>
              </div>

              <div className="register-benefit-card">
                <strong>Preparação para IA real</strong>
                <span>Dados organizados para treino, dieta e progresso</span>
              </div>
            </div>
          </div>
        </section>

        <section className="register-form-panel glass-card">
          <div className="register-form-header">
            <span className="badge badge-primary">Cadastro</span>
            <h2>Criar nova conta</h2>
            <p>
              Preencha os dados abaixo para liberar seu acesso inicial à plataforma.
            </p>
          </div>

          <form className="form-grid register-form" onSubmit={handleSubmit}>
            <div className="input-group">
              <label className="input-label" htmlFor="name">
                Nome
              </label>
              <input
                id="name"
                name="name"
                type="text"
                className="input-field"
                placeholder="Digite seu nome"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="register-email">
                E-mail
              </label>
              <input
                id="register-email"
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
              <label className="input-label" htmlFor="register-password">
                Senha
              </label>
              <input
                id="register-password"
                name="password"
                type="password"
                className="input-field"
                placeholder="Crie sua senha"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="confirmPassword">
                Confirmar senha
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                className="input-field"
                placeholder="Repita sua senha"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>

            <label className="register-terms">
              <input
                name="acceptTerms"
                type="checkbox"
                checked={formData.acceptTerms}
                onChange={handleChange}
              />
              <span>
                Li e aceito os termos de uso e as condições iniciais da plataforma.
              </span>
            </label>

            {errorMessage ? (
              <div className="register-error-message">
                {errorMessage}
              </div>
            ) : null}

            <button type="submit" className="primary-button register-submit">
              Criar conta
            </button>
          </form>

          <div className="register-links">
            <Link to="/" className="register-link">
              Voltar para Home
            </Link>

            <Link to="/login" className="register-link">
              Já tenho conta
            </Link>
          </div>

          <div className="register-footer-note">
            <span className="text-muted">
              Neste momento o cadastro ainda entra de forma visual e provisória.
              A persistência real virá nas próximas camadas.
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}

export default CadastroPage;