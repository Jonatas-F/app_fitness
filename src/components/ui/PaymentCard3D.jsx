import { useState } from "react";
import Atropos from "atropos/react";
import { AnimatePresence, motion } from "motion/react";
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
};

function getCardBrand(method) {
  return cardBrandAssets[method.brand] || {
    logo: null,
    icon: "material-symbols:add-card-outline",
    label: "Novo cartao",
  };
}

export default function PaymentCard3D({
  method,
  selected = false,
  canDelete = false,
  onSelect,
  onDelete,
}) {
  const [expanded, setExpanded] = useState(false);
  const brand = getCardBrand(method);
  const isNewCard = method.id === "novo";

  function handleCardClick() {
    onSelect?.(method);
    setExpanded((current) => !current);
  }

  function handleDelete(event) {
    event.stopPropagation();
    onDelete?.(method.id);
  }

  return (
    <Atropos
      className={`payment-card-3d ${selected ? "is-selected" : ""}`}
      activeOffset={18}
      rotateXMax={8}
      rotateYMax={10}
      shadow={false}
      highlight
    >
      <motion.article
        className="payment-card-3d__surface"
        layout
        transition={{ type: "spring", stiffness: 420, damping: 34 }}
      >
        <span className="payment-card-3d__glow" aria-hidden="true" />

        <motion.button
          type="button"
          className="payment-card-3d__selector"
          onClick={handleCardClick}
          aria-expanded={expanded}
          whileTap={{ scale: 0.985 }}
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
        >
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
            {isNewCard ? "Novo metodo" : `**** **** **** ${method.ending}`}
          </span>

          <span className="payment-card-3d__meta">
            <span>
              <small>Metodo</small>
              <strong>{method.label}</strong>
            </span>
            <span>
              <small>Seguranca</small>
              <strong>
                <Icon icon="material-symbols:lock-outline-rounded" aria-hidden="true" />
                Stripe
              </strong>
            </span>
          </span>
        </motion.button>

        <AnimatePresence initial={false}>
          {expanded ? (
            <motion.div
              className="payment-card-3d__expanded"
              initial={{ opacity: 0, height: 0, y: -6 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -6 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <div className="payment-card-3d__miniature" aria-hidden="true">
                <span className="payment-card-3d__miniature-brand">
                  {brand.logo ? <img src={brand.logo} alt="" /> : <Icon icon={brand.icon} />}
                </span>
                <span>{isNewCard ? "Adicionar metodo" : `Final ${method.ending}`}</span>
              </div>

              <div className="payment-card-3d__details">
                <div>
                  <Icon icon="material-symbols:person-outline-rounded" aria-hidden="true" />
                  {isNewCard ? "Novo metodo seguro" : method.holder || "Titular nao informado"}
                </div>
                <div>
                  <Icon icon="material-symbols:event-outline-rounded" aria-hidden="true" />
                  {isNewCard ? "Cadastro pelo Stripe" : `Validade ${method.expires || "--/--"}`}
                </div>
                <div>
                  <Icon icon="material-symbols:credit-score-outline-rounded" aria-hidden="true" />
                  {isNewCard ? "Preencha os dados abaixo." : "Pronto para cobrancas do plano."}
                </div>
              </div>

              {canDelete ? (
                <button type="button" className="payment-card-3d__delete" onClick={handleDelete}>
                  <Icon icon="material-symbols:delete-outline-rounded" aria-hidden="true" />
                  Excluir cartao
                </button>
              ) : null}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.article>
    </Atropos>
  );
}
