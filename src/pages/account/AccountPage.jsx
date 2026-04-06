import { useMemo, useState } from "react";
import "./account.css";

const STORAGE_KEY = "shapeCertoAccountSettings";

const defaultAccountData = {
  accountName: "Jonatas",
  email: "jonatas@email.com",
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
  gmailLinked: false,
  keepConnected: true,
  allowEmailAlerts: true,
  preferGoogleLogin: false,
};

function AccountPage() {
  const savedAccountData = useMemo(() => {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return defaultAccountData;
    }

    try {
      return {
        ...defaultAccountData,
        ...JSON.parse(raw),
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      };
    } catch (error) {
      return defaultAccountData;
    }
  }, []);

  const [formData, setFormData] = useState(savedAccountData);
  const [feedback, setFeedback] = useState({
    type: "",
    message: "",
  });

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));

    if (feedback.message) {
      setFeedback({ type: "", message: "" });
    }
  };

  const handleSaveAccount = (event) => {
    event.preventDefault();

    if (!formData.accountName.trim()) {
      setFeedback({
        type: "error",
        message: "Informe o nome da conta antes de salvar.",
      });
      return;
    }

    if (!formData.email.trim()) {
      setFeedback({
        type: "error",
        message: "Informe um e-mail válido para a conta.",
      });
      return;
    }

    if (
      formData.newPassword ||
      formData.confirmPassword ||
      formData.currentPassword
    ) {
      if (!formData.currentPassword) {
        setFeedback({
          type: "error",
          message: "Para alterar a senha, preencha a senha atual.",
        });
        return;
      }

      if (!formData.newPassword) {
        setFeedback({
          type: "error",
          message: "Digite a nova senha para concluir a alteração.",
        });
        return;
      }

      if (formData.newPassword !== formData.confirmPassword) {
        setFeedback({
          type: "error",
          message: "A confirmação da nova senha precisa ser igual.",
        });
        return;
      }
    }

    const payloadToSave = {
      accountName: formData.accountName,
      email: formData.email,
      gmailLinked: formData.gmailLinked,
      keepConnected: formData.keepConnected,
      allowEmailAlerts: formData.allowEmailAlerts,
      preferGoogleLogin: formData.preferGoogleLogin,
      lastUpdatedAt: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payloadToSave));

    setFormData((current) => ({
      ...current,
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    }));

    setFeedback({
      type: "success",
      message:
        "Configurações da conta salvas localmente com sucesso nesta etapa provisória.",
    });
  };

  const handleToggleGmail = () => {
    setFormData((current) => ({
      ...current,
      gmailLinked: !current.gmailLinked,
    }));

    setFeedback({
      type: "success",
      message:
        formData.gmailLinked
          ? "Conta Gmail marcada para desvinculação. Salve para aplicar."
          : "Conta Gmail marcada para vinculação. Salve para aplicar.",
    });
  };

  return (
    <section className="account-page">
      <div className="account-grid">
        <article className="glass-card card-padding">
          <div className="card-header">
            <div>
              <span className="badge badge-primary">Conta</span>
              <h3 className="card-title mt-12">Dados de acesso</h3>
              <p className="card-subtitle">
                Esta área cuida apenas de autenticação, segurança e preferências
                de entrada no sistema.
              </p>
            </div>
          </div>

          <form className="form-grid account-form" onSubmit={handleSaveAccount}>
            <div className="input-group">
              <label className="input-label" htmlFor="accountName">
                Nome da conta
              </label>
              <input
                id="accountName"
                name="accountName"
                className="input-field"
                type="text"
                placeholder="Nome exibido na conta"
                value={formData.accountName}
                onChange={handleChange}
              />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="accountEmail">
                E-mail
              </label>
              <input
                id="accountEmail"
                name="email"
                className="input-field"
                type="email"
                placeholder="seuemail@exemplo.com"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div className="account-password-grid">
              <div className="input-group">
                <label className="input-label" htmlFor="currentPassword">
                  Senha atual
                </label>
                <input
                  id="currentPassword"
                  name="currentPassword"
                  className="input-field"
                  type="password"
                  placeholder="Digite a senha atual"
                  value={formData.currentPassword}
                  onChange={handleChange}
                />
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="newPassword">
                  Nova senha
                </label>
                <input
                  id="newPassword"
                  name="newPassword"
                  className="input-field"
                  type="password"
                  placeholder="Digite a nova senha"
                  value={formData.newPassword}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="confirmPassword">
                Confirmar nova senha
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                className="input-field"
                type="password"
                placeholder="Repita a nova senha"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>

            <div className="account-actions">
              <button type="submit" className="primary-button">
                Salvar configurações
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={handleToggleGmail}
              >
                {formData.gmailLinked ? "Desvincular Gmail" : "Vincular Gmail"}
              </button>
            </div>

            {feedback.message ? (
              <div
                className={`account-feedback ${
                  feedback.type === "error"
                    ? "account-feedback-error"
                    : "account-feedback-success"
                }`}
              >
                {feedback.message}
              </div>
            ) : null}
          </form>
        </article>

        <div className="account-side-column">
          <article className="glass-card card-padding">
            <div className="card-header">
              <div>
                <span className="badge badge-warning">Login social</span>
                <h3 className="card-title mt-12">Integração com Gmail</h3>
                <p className="card-subtitle">
                  Estrutura inicial para futura autenticação com Google.
                </p>
              </div>
            </div>

            <div className="account-status-box">
              <div>
                <span className="metric-label">Status atual</span>
                <strong className="metric-value">
                  {formData.gmailLinked ? "Vinculado" : "Não vinculado"}
                </strong>
              </div>

              <span
                className={`badge ${
                  formData.gmailLinked ? "badge-success" : "badge-warning"
                }`}
              >
                {formData.gmailLinked ? "Pronto para uso futuro" : "Pendente"}
              </span>
            </div>
          </article>

          <article className="glass-card card-padding">
            <div className="card-header">
              <div>
                <span className="badge badge-primary">Preferências</span>
                <h3 className="card-title mt-12">Preferências de login</h3>
                <p className="card-subtitle">
                  Ajustes que pertencem à conta, não ao perfil físico.
                </p>
              </div>
            </div>

            <div className="account-toggle-list">
              <label className="account-toggle-row">
                <div>
                  <strong>Manter conectado neste dispositivo</strong>
                  <span>Evita novo login frequente neste navegador.</span>
                </div>
                <input
                  name="keepConnected"
                  type="checkbox"
                  checked={formData.keepConnected}
                  onChange={handleChange}
                />
              </label>

              <label className="account-toggle-row">
                <div>
                  <strong>Receber alertas de acesso por e-mail</strong>
                  <span>Notificações básicas relacionadas à segurança da conta.</span>
                </div>
                <input
                  name="allowEmailAlerts"
                  type="checkbox"
                  checked={formData.allowEmailAlerts}
                  onChange={handleChange}
                />
              </label>

              <label className="account-toggle-row">
                <div>
                  <strong>Priorizar login com Google quando disponível</strong>
                  <span>Preferência salva para quando a integração real entrar.</span>
                </div>
                <input
                  name="preferGoogleLogin"
                  type="checkbox"
                  checked={formData.preferGoogleLogin}
                  onChange={handleChange}
                />
              </label>
            </div>
          </article>

          <article className="glass-card card-padding">
            <div className="card-header">
              <div>
                <span className="badge badge-success">Separação correta</span>
                <h3 className="card-title mt-12">Conta ≠ Perfil</h3>
              </div>
            </div>

            <ul className="account-info-list">
              <li>Conta cuida de nome da conta, e-mail, senha e login social.</li>
              <li>Perfil continua responsável por dados físicos, metas e dieta.</li>
              <li>Essa separação evita retrabalho quando entrar autenticação real.</li>
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}

export default AccountPage;