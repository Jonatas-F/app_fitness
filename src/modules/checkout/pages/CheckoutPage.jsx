import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import logo from "../../../assets/logo.svg";
import { formatCurrency, getAnnualPrice, getPlanById, subscriptionPlans } from "../../../data/plans";
import { signInWithEmail, signInWithGoogle, signUpWithEmail } from "../../../services/authService";
import { getApiToken, getStoredApiUser } from "../../../services/api/client";
import { createStripeCheckoutSession } from "../../../services/stripeService";
import {
  closeStripePopup,
  isStripePopupMessage,
  notifyStripePopupResult,
  openPendingStripePopup,
  redirectStripePopup,
  watchStripePopupClose,
} from "../../../utils/stripePopup";
import "./CheckoutPage.css";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedPlanId = searchParams.get("plan") || "intermediario";
  const checkoutStatus = searchParams.get("checkout");
  const isStripePopupReturn = searchParams.get("stripe_popup") === "1";
  const isNewGoogleUser = searchParams.get("new") === "1";
  const hasNoPlan      = searchParams.get("no_plan") === "1";
  const [billingCycle, setBillingCycle] = useState(() =>
    searchParams.get("cycle") === "monthly" ? "monthly" : "annual"
  );
  const [installments, setInstallments] = useState("12");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(getApiToken()));
  const [connectedUser, setConnectedUser] = useState(() => getStoredApiUser());
  const [authMode, setAuthMode] = useState("");
  const [authForm, setAuthForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [authMessage, setAuthMessage] = useState("");
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [checkoutTermsAccepted, setCheckoutTermsAccepted] = useState(false);
  const stripePopupCompletedRef = useRef(false);

  const selectedPlan = useMemo(() => getPlanById(selectedPlanId), [selectedPlanId]);
  const annualTotal = getAnnualPrice(selectedPlan);
  const monthlyTotal = selectedPlan.monthlyPrice;
  const currentTotal = billingCycle === "annual" ? annualTotal : monthlyTotal;
  const installmentValue = annualTotal / Number(installments || 1);
  const isCheckoutCanceled = ["cancel", "canceled", "cancelled"].includes(checkoutStatus);
  const checkoutStatusMessage =
    checkoutStatus && checkoutStatus !== "success"
      ? {
          title: isCheckoutCanceled ? "Pagamento cancelado" : "Pagamento nao concluido",
          description:
            isCheckoutCanceled
              ? "A Stripe retornou sem confirmar a assinatura. Voce pode revisar o plano e tentar novamente."
              : "Nao recebemos confirmacao de pagamento. Confira o status no Stripe ou tente abrir o checkout novamente.",
          helper: "Nada foi alterado no seu plano atual enquanto o pagamento nao for confirmado.",
        }
      : null;

  useEffect(() => {
    function syncAuthState() {
      const hasToken = Boolean(getApiToken());
      setIsAuthenticated(hasToken);
      setConnectedUser(hasToken ? getStoredApiUser() : null);
    }

    syncAuthState();
    window.addEventListener("shape-certo-auth-updated", syncAuthState);

    return () => {
      window.removeEventListener("shape-certo-auth-updated", syncAuthState);
    };
  }, []);

  // Aviso para novo usuário ou usuário sem plano ativo
  useEffect(() => {
    if (isNewGoogleUser) {
      setMessage("Conta criada com sucesso! Escolha um plano para começar a usar o Shape Certo.");
      setSearchParams(prev => { prev.delete("new"); return prev; }, { replace: true });
    } else if (hasNoPlan) {
      setMessage("Você ainda não tem um plano ativo. Escolha um plano para acessar o Shape Certo.");
      setSearchParams(prev => { prev.delete("no_plan"); return prev; }, { replace: true });
    }
  }, [isNewGoogleUser, hasNoPlan]);

  useEffect(() => {
    if (isStripePopupReturn && checkoutStatus) {
      notifyStripePopupResult({
        area: "checkout",
        status: checkoutStatus,
        plan: selectedPlanId,
      });
      return undefined;
    }

    if (checkoutStatus !== "success") {
      return undefined;
    }

    const timerId = window.setTimeout(() => {
      navigate("/dashboard");
    }, 3500);

    return () => window.clearTimeout(timerId);
  }, [checkoutStatus, isStripePopupReturn, navigate, selectedPlanId]);

  useEffect(() => {
    function handleStripePopupMessage(event) {
      if (!isStripePopupMessage(event)) {
        return;
      }

      const payload = event.data.payload || {};

      if (payload.area !== "checkout") {
        return;
      }

      if (payload.status === "success") {
        stripePopupCompletedRef.current = true;
        setMessage("Pagamento confirmado. Entrando no app...");
        window.setTimeout(() => navigate("/dashboard"), 1200);
        return;
      }

      stripePopupCompletedRef.current = true;
      setMessage("Pagamento cancelado antes de concluir na Stripe.");
    }

    window.addEventListener("message", handleStripePopupMessage);

    return () => window.removeEventListener("message", handleStripePopupMessage);
  }, [navigate]);

  function handlePlanChange(planId) {
    setSearchParams({ plan: planId });
    setMessage("");
  }

  function handleAuthChange(event) {
    const { name, value } = event.target;
    setAuthMessage("");
    setAuthForm((current) => ({ ...current, [name]: value }));
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();

    if (authMode === "signup" && authForm.password !== authForm.confirmPassword) {
      setAuthMessage("A confirmacao da senha precisa ser igual a senha escolhida.");
      return;
    }

    setIsAuthSubmitting(true);
    setAuthMessage(authMode === "signup" ? "Criando sua conta..." : "Entrando na sua conta...");

    const result =
      authMode === "signup"
        ? await signUpWithEmail({
            email: authForm.email,
            password: authForm.password,
            fullName: authForm.fullName,
            plan: selectedPlan.id,
          })
        : await signInWithEmail({
            email: authForm.email,
            password: authForm.password,
          });

    setIsAuthSubmitting(false);

    if (result.error) {
      setAuthMessage(result.error.message);
      return;
    }

    setIsAuthenticated(true);
    setConnectedUser(result.data?.user || getStoredApiUser());
    setAuthMessage("Conta conectada. Agora finalize a assinatura com seguranca.");
    setMessage("");
  }

  async function handleGoogleCheckoutLogin() {
    await signInWithGoogle({ returnTo: `${window.location.pathname}${window.location.search}` });
  }

  const connectedName = connectedUser?.user_metadata?.full_name || "Conta conectada";
  const connectedEmail = connectedUser?.email || "Usuario autenticado";

  async function handleSubmit(event) {
    event.preventDefault();

    if (!isAuthenticated && !getApiToken()) {
      setMessage("Antes de finalizar, crie sua conta ou entre com Google/e-mail para vincular o plano.");
      setAuthMessage("Escolha uma forma de acesso para continuar com este plano.");
      return;
    }

    if (!checkoutTermsAccepted) {
      setMessage("Confirme que leu e concorda com a assinatura antes de seguir para o Stripe.");
      return;
    }

    setIsSubmitting(true);
    setMessage("Abrindo checkout seguro do Stripe em uma janela popup...");
    stripePopupCompletedRef.current = false;
    const stripePopup = openPendingStripePopup();

    if (!stripePopup) {
      setIsSubmitting(false);
      setMessage("O navegador bloqueou o popup da Stripe. Libere popups para continuar o pagamento.");
      return;
    }

    const stopWatchingPopup = watchStripePopupClose(stripePopup, () => {
      if (stripePopupCompletedRef.current) {
        return;
      }

      setIsSubmitting(false);
      setMessage("Janela da Stripe fechada. Se o pagamento foi concluido, a assinatura sera atualizada pelo webhook.");
    });

    const result = await createStripeCheckoutSession({
      planId: selectedPlan.id,
      billingCycle,
      installments,
      returnMode: "popup",
    });

    setIsSubmitting(false);

    if (result.error || !result.url) {
      stopWatchingPopup();
      closeStripePopup(stripePopup);
      setMessage(
        `Nao foi possivel abrir o Stripe agora. ${
          result.error?.message || "Verifique se a Function create-checkout-session foi publicada."
        }`
      );
      return;
    }

    redirectStripePopup(stripePopup, result.url);
  }

  return (
    <main className="checkout-page">
      <header className="checkout-header">
        <Link to="/" className="checkout-brand">
          <span>
            <img src={logo} alt="Shape Certo" />
          </span>
          <div>
            <strong>Shape Certo</strong>
            <small>Checkout seguro</small>
          </div>
        </Link>
        <Link to="/" className="checkout-header__back">
          Voltar para home
        </Link>
      </header>

      <section className="checkout-shell">
        <div className="checkout-main glass-panel">
          {checkoutStatus === "success" ? (
            <section className="checkout-success-panel">
              <span>Pagamento confirmado</span>
              <h1>Assinatura recebida com sucesso.</h1>
              <p>
                Estamos vinculando o plano ao seu perfil. Voce sera levado para o app em instantes.
              </p>
              <button type="button" className="primary-button" onClick={() => navigate("/dashboard")}>
                Entrar no app agora
              </button>
            </section>
          ) : null}

          {checkoutStatusMessage ? (
            <section className="checkout-status-panel app-empty-state" role="status" aria-live="polite">
              <strong>{checkoutStatusMessage.title}</strong>
              <p>{checkoutStatusMessage.description}</p>
              <small>{checkoutStatusMessage.helper}</small>
            </section>
          ) : null}

          {checkoutStatus === "success" ? null : (
            <>
          <span className="checkout-eyebrow">Assinatura</span>
          <h1>Escolha o plano e finalize com o cartao.</h1>
          <p>
            No anual, o usuario paga o ciclo completo com 20% de desconto e pode parcelar em ate
            12 vezes. No mensal, a cobranca entra em recorrencia todo mes.
          </p>

          <div className="checkout-plan-picker">
            {subscriptionPlans.map((plan) => (
              <button
                key={plan.id}
                type="button"
                className={selectedPlan.id === plan.id ? "is-selected" : ""}
                onClick={() => handlePlanChange(plan.id)}
              >
                <strong>{plan.name}</strong>
                <span>{formatCurrency(plan.monthlyPrice)}/mes</span>
              </button>
            ))}
          </div>

          <div className="checkout-billing">
            <button
              type="button"
              className={billingCycle === "monthly" ? "is-selected" : ""}
              onClick={() => setBillingCycle("monthly")}
            >
              <strong>Mensal recorrente</strong>
              <span>{formatCurrency(monthlyTotal)} cobrados todo mes</span>
            </button>

            <button
              type="button"
              className={billingCycle === "annual" ? "is-selected" : ""}
              onClick={() => setBillingCycle("annual")}
            >
              <strong>Anual com 20% off</strong>
              <span>{formatCurrency(annualTotal)} no ciclo completo</span>
            </button>
          </div>

          <form className="checkout-form" onSubmit={handleSubmit}>
            {!isAuthenticated ? (
              <section className="checkout-auth-card">
                <div className="checkout-auth-card__intro">
                  <div>
                    <span className="checkout-auth-card__eyebrow">Acesso</span>
                    <h2>Crie sua conta para vincular este plano.</h2>
                  </div>
                  <p>Pagamento associado ao seu perfil, check-ins, treinos e dieta.</p>
                </div>

                <div className="checkout-auth-card__tabs">
                  <button
                    type="button"
                    className={authMode === "signup" ? "is-selected" : ""}
                    onClick={() => {
                      setAuthMode((current) => (current === "signup" ? "" : "signup"));
                      setAuthMessage("");
                    }}
                    aria-expanded={authMode === "signup"}
                  >
                    Criar conta
                  </button>
                  <button
                    type="button"
                    className={authMode === "login" ? "is-selected" : ""}
                    onClick={() => {
                      setAuthMode((current) => (current === "login" ? "" : "login"));
                      setAuthMessage("");
                    }}
                    aria-expanded={authMode === "login"}
                  >
                    Ja tenho conta
                  </button>
                </div>

                <button type="button" className="checkout-google-button" onClick={handleGoogleCheckoutLogin}>
                  <Icon icon="logos:google-icon" aria-hidden="true" />
                  Entrar com Google e continuar
                </button>

                {authMode ? (
                  <>
                    <div className="checkout-auth-divider">
                      <span>{authMode === "signup" ? "criar com e-mail" : "entrar com e-mail"}</span>
                    </div>

                    <div className="checkout-auth-fields">
                      {authMode === "signup" ? (
                        <label>
                          <span>Nome completo</span>
                          <input
                            name="fullName"
                            value={authForm.fullName}
                            onChange={handleAuthChange}
                            placeholder="Seu nome"
                          />
                        </label>
                      ) : null}

                      <label>
                        <span>E-mail</span>
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
                        <div className="checkout-password-field">
                          <input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            value={authForm.password}
                            onChange={handleAuthChange}
                            placeholder="Minimo 8 caracteres"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((current) => !current)}
                            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                          >
                            <Icon icon={showPassword ? "solar:eye-closed-bold" : "solar:eye-bold"} />
                          </button>
                        </div>
                      </label>

                      {authMode === "signup" ? (
                        <label>
                          <span>Confirmar senha</span>
                          <div className="checkout-password-field">
                            <input
                              type={showConfirmPassword ? "text" : "password"}
                              name="confirmPassword"
                              value={authForm.confirmPassword}
                              onChange={handleAuthChange}
                              placeholder="Repita a senha"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword((current) => !current)}
                              aria-label={showConfirmPassword ? "Ocultar confirmacao" : "Mostrar confirmacao"}
                            >
                              <Icon icon={showConfirmPassword ? "solar:eye-closed-bold" : "solar:eye-bold"} />
                            </button>
                          </div>
                        </label>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      className="secondary-button checkout-auth-submit"
                      onClick={handleAuthSubmit}
                      disabled={isAuthSubmitting}
                    >
                      {isAuthSubmitting
                        ? "Conectando..."
                        : authMode === "signup"
                          ? "Criar conta e continuar"
                          : "Entrar e continuar"}
                    </button>
                  </>
                ) : null}

                {authMessage ? <small className="checkout-auth-message">{authMessage}</small> : null}
              </section>
            ) : (
              <section className="checkout-auth-ready" aria-live="polite">
                <span className="checkout-auth-card__eyebrow">Acesso liberado</span>
                <div>
                  <strong>{connectedName}</strong>
                  <small>{connectedEmail}</small>
                </div>
                <p>Permaneça nesta pagina para finalizar a assinatura. O plano sera vinculado a esta conta.</p>
              </section>
            )}

            <div className="checkout-form__grid">
              {billingCycle === "annual" ? (
                <label>
                  <span>Parcelamento do anual</span>
                  <select value={installments} onChange={(event) => setInstallments(event.target.value)}>
                    {Array.from({ length: 12 }, (_, index) => String(index + 1)).map((value) => (
                      <option key={value} value={value}>
                        {value}x de {formatCurrency(annualTotal / Number(value))}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>

            <p className="checkout-secure-note">
              Os dados do cartao serao preenchidos diretamente no Stripe. O Shape Certo
              usa os dados da conta conectada para vincular assinatura e plano aprovado.
            </p>

            <label className="checkout-terms">
              <input
                type="checkbox"
                checked={checkoutTermsAccepted}
                onChange={(event) => setCheckoutTermsAccepted(event.target.checked)}
              />
              <span>
                Li e concordo em seguir para a Stripe para confirmar o pagamento da assinatura selecionada.
              </span>
            </label>

            <button type="submit" className="primary-button" disabled={isSubmitting || !checkoutTermsAccepted}>
              {isSubmitting ? "Abrindo Stripe..." : "Finalizar assinatura"}
            </button>
            <button type="button" className="ghost-button" onClick={() => navigate("/dashboard")}>
              Entrar sem finalizar agora
            </button>
            {message ? <small className="checkout-message">{message}</small> : null}
          </form>
            </>
          )}
        </div>

        <aside className="checkout-summary glass-panel">
          <span>Resumo</span>
          <h2>{selectedPlan.name}</h2>
          <p>{selectedPlan.highlight}</p>

          <div className="checkout-summary__price">
            <strong>{formatCurrency(currentTotal)}</strong>
            <small>{billingCycle === "annual" ? "pagamento anual" : "recorrencia mensal"}</small>
          </div>

          {billingCycle === "annual" ? (
            <div className="checkout-summary__discount">
              <strong>20% de desconto</strong>
              <small>
                Ou {installments}x de {formatCurrency(installmentValue)}
              </small>
            </div>
          ) : (
            <div className="checkout-summary__discount">
              <strong>Recorrente</strong>
              <small>Cobranca automatica mensal</small>
            </div>
          )}

          <div className="checkout-summary__limits">
            <span>{selectedPlan.tokens}</span>
            <span>{selectedPlan.workouts}</span>
            <span>{selectedPlan.meals}</span>
          </div>

          <ul>
            {selectedPlan.features.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>
        </aside>
      </section>
    </main>
  );
}
