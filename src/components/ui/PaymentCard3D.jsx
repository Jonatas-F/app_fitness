import Atropos from "atropos/react";
import { motion } from "motion/react";
import { Icon } from "@iconify/react";
import mastercardLogo from "simple-icons/icons/mastercard.svg";
import visaLogo from "simple-icons/icons/visa.svg";
import "atropos/css";
import "./PaymentCard3D.css";

const cardBrandAssets = {
  Visa: {
    logo: visaLogo,
    icon: "simple-icons:visa",
    label: "Visa",
  },
  Mastercard: {
    logo: mastercardLogo,
    icon: "simple-icons:mastercard",
    label: "Mastercard",
  },
  Stripe: {
    logo: null,
    icon: "simple-icons:stripe",
    label: "Stripe",
  },
};

function getCardBrand(method) {
  return cardBrandAssets[method.brand] || {
    logo: null,
    icon: "material-symbols:lock-outline-rounded",
    label: "Metodo seguro",
  };
}

export default function PaymentCard3D({ method, selected = false, onSelect }) {
  const brand = getCardBrand(method);
  const isNewCard = method.id === "novo";

  function handleSelect(event) {
    event.preventDefault();
    onSelect?.(method);
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" || event.key === " ") {
      handleSelect(event);
    }
  }

  return (
    <motion.div
      role="button"
      tabIndex={0}
      className={`payment-card-3d ${selected ? "is-selected" : ""}`}
      onClickCapture={handleSelect}
      onKeyDown={handleKeyDown}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", stiffness: 420, damping: 34 }}
    >
      <Atropos
        className="payment-card-3d__tilt"
        activeOffset={18}
        rotateXMax={8}
        rotateYMax={10}
        shadow={false}
        highlight
      >
        <span className="payment-card-3d__surface">
          <span className="payment-card-3d__glow" aria-hidden="true" />

          <span className="payment-card-3d__top">
            <span className="payment-card-3d__brand">
              {brand.logo ? (
                <img src={brand.logo} alt={brand.label} />
              ) : (
                <Icon icon={brand.icon} aria-hidden="true" />
              )}
            </span>

            <span className={`payment-card-3d__status ${selected ? "is-active" : ""}`}>
              <Icon
                icon={selected ? "material-symbols:check-circle-rounded" : "material-symbols:radio-button-unchecked"}
                aria-hidden="true"
              />
              {selected ? "Selecionado" : "Selecionar"}
            </span>
          </span>

          <span className="payment-card-3d__number">
            {isNewCard ? "Novo metodo" : method.ending === "----" ? "Dados protegidos no Stripe" : `**** **** **** ${method.ending}`}
          </span>

          <span className="payment-card-3d__meta">
            <span>
              <small>Metodo</small>
              <strong>{method.label}</strong>
            </span>
            <span>
              <small>{isNewCard ? "Acao" : "Validade"}</small>
              <strong>
                <Icon
                  icon={isNewCard ? "material-symbols:add-card-outline" : "material-symbols:event-available-outline-rounded"}
                  aria-hidden="true"
                />
                {isNewCard ? "Adicionar" : method.expires || "--/--"}
              </strong>
            </span>
          </span>
        </span>
      </Atropos>
    </motion.div>
  );
}
