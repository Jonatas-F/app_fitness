import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import logo from "../../../assets/logo.svg";
import { formatCurrency, getAnnualPrice, getPlanById, subscriptionPlans } from "../../../data/plans";
import { createStripeCheckoutSession } from "../../../services/stripeService";
import "./CheckoutPage.css";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedPlanId = searchParams.get("plan") || "intermediario";
  const [billingCycle, setBillingCycle] = useState("annual");
  const [installments, setInstallments] = useState("12");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedPlan = useMemo(() => getPlanById(selectedPlanId), [selectedPlanId]);
  const annualTotal = getAnnualPrice(selectedPlan);
  const monthlyTotal = selectedPlan.monthlyPrice;
  const currentTotal = billingCycle === "annual" ? annualTotal : monthlyTotal;
  const installmentValue = annualTotal / Number(installments || 1);

  function handlePlanChange(planId) {
    setSearchParams({ plan: planId });
    setMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("Abrindo checkout seguro do Stripe...");

    const result = await createStripeCheckoutSession({
      planId: selectedPlan.id,
      billingCycle,
      installments,
    });

    setIsSubmitting(false);

    if (result.error || !result.url) {
      setMessage(
        `Nao foi possivel abrir o Stripe agora. ${
          result.error?.message || "Verifique se a Function create-checkout-session foi publicada."
        }`
      );
      return;
    }

    window.location.href = result.url;
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
            <div className="checkout-form__grid">
              <label>
                <span>Nome para cobranca</span>
                <input placeholder="Nome completo" />
              </label>

              <label>
                <span>Email de cobranca</span>
                <input type="email" placeholder="usuario@gmail.com" />
              </label>

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
              recebe apenas o status da assinatura e o plano aprovado.
            </p>

            <button type="submit" className="primary-button">
              {isSubmitting ? "Abrindo Stripe..." : "Finalizar assinatura"}
            </button>
            <button type="button" className="ghost-button" onClick={() => navigate("/dashboard")}>
              Entrar sem finalizar agora
            </button>
            {message ? <small className="checkout-message">{message}</small> : null}
          </form>
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
