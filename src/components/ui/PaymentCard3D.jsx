import * as React from "react"
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion"
import { Eye, EyeOff } from "lucide-react"
import { Icon } from "@iconify/react"
import mastercardLogo from "simple-icons/icons/mastercard.svg"
import visaLogo from "simple-icons/icons/visa.svg"
import "./PaymentCard3D.css"

const cardBrandAssets = {
  Visa:       { logo: visaLogo,       icon: "simple-icons:visa",        label: "Visa" },
  Mastercard: { logo: mastercardLogo, icon: "simple-icons:mastercard",   label: "Mastercard" },
  Stripe:     { logo: null,           icon: "simple-icons:stripe",       label: "Stripe" },
}

function getCardBrand(method) {
  return cardBrandAssets[method.brand] ?? {
    logo: null,
    icon: "material-symbols:lock-outline-rounded",
    label: "Metodo seguro",
  }
}

export default function PaymentCard3D({ method, selected = false, disabled = false, onSelect }) {
  const [isVisible, setIsVisible] = React.useState(false)
  const [isFlipped, setIsFlipped]  = React.useState(false)
  const [ripple, setRipple]        = React.useState(false)

  const brand    = getCardBrand(method)
  const isNewCard = method.id === "novo"

  /* ── 3-D mouse tilt ─────────────────────────────────────── */
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const rotateX = useSpring(useTransform(my, [-80, 80], [7, -7]),  { stiffness: 280, damping: 28 })
  const rotateY = useSpring(useTransform(mx, [-120, 120], [-9, 9]), { stiffness: 280, damping: 28 })

  function onMouseMove(e) {
    const r = e.currentTarget.getBoundingClientRect()
    mx.set(e.clientX - (r.left + r.width  / 2))
    my.set(e.clientY - (r.top  + r.height / 2))
  }
  function onMouseLeave() { mx.set(0); my.set(0) }

  /* ── interactions ───────────────────────────────────────── */
  function handleSelect(e) {
    e.preventDefault(); e.stopPropagation()
    if (disabled) return
    onSelect?.(method)
  }
  function handleKeyDown(e) {
    if (disabled) return
    if (e.key === "Enter" || e.key === " ") handleSelect(e)
  }
  function handleFlip(e) {
    e.stopPropagation()
    if (disabled || isNewCard) return
    setRipple(true)
    setTimeout(() => setRipple(false), 400)
    setIsFlipped(f => !f)
  }

  /* ── card number display ─────────────────────────────────── */
  const displayNumber = isNewCard
    ? "Novo metodo"
    : method.ending === "----"
    ? "•••• •••• •••• ••••"
    : isVisible
    ? `**** **** **** ${method.ending}`
    : `•••• •••• •••• ${method.ending}`

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-pressed={selected}
      className={`payment-card-3d${selected ? " is-selected" : ""}${disabled ? " is-disabled" : ""}`}
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
    >
      {/* perspective wrapper — handles mouse tilt */}
      <div
        className="payment-card-3d__scene"
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
      >
        <motion.div
          className="payment-card-3d__tilt"
          style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        >
          {/* flip layer */}
          <motion.div
            className="payment-card-3d__flipper"
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.55, type: "spring", stiffness: 90, damping: 18 }}
            style={{ transformStyle: "preserve-3d" }}
          >

            {/* ── FRONT ───────────────────────────────────── */}
            <span
              className="payment-card-3d__surface"
              style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
            >
              <span className="payment-card-3d__glow" aria-hidden="true" />

              {/* shimmer sweep */}
              <motion.span
                aria-hidden="true"
                className="payment-card-3d__shimmer"
                animate={{ backgroundPosition: ["-200% 0", "300% 0"] }}
                transition={{ duration: 3.8, repeat: Infinity, repeatDelay: 3, ease: "linear" }}
              />

              {/* top row */}
              <span className="payment-card-3d__top">
                <span className="payment-card-3d__brand">
                  {brand.logo
                    ? <img src={brand.logo} alt={brand.label} />
                    : <Icon icon={brand.icon} aria-hidden="true" />}
                </span>

                <span className="payment-card-3d__top-actions">
                  {!isNewCard && (
                    <motion.button
                      type="button"
                      className="payment-card-3d__eye"
                      onClick={e => { e.stopPropagation(); setIsVisible(v => !v) }}
                      whileHover={{ scale: 1.12 }}
                      whileTap={{ scale: 0.88 }}
                      aria-label={isVisible ? "Ocultar número" : "Revelar número"}
                    >
                      {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                    </motion.button>
                  )}

                  <span className={`payment-card-3d__status${selected ? " is-active" : ""}`}>
                    <Icon
                      icon={selected
                        ? "material-symbols:check-circle-rounded"
                        : "material-symbols:radio-button-unchecked"}
                      aria-hidden="true"
                    />
                    {selected ? "Selecionado" : "Selecionar"}
                  </span>
                </span>
              </span>

              {/* card number */}
              <span className="payment-card-3d__number">{displayNumber}</span>

              {/* meta row */}
              <span className="payment-card-3d__meta">
                <span>
                  <small>Titular</small>
                  <strong>{isNewCard ? "—" : (method.holder || "—")}</strong>
                </span>
                <span>
                  <small>{isNewCard ? "Ação" : "Validade"}</small>
                  <strong>
                    <Icon
                      icon={isNewCard
                        ? "material-symbols:add-card-outline"
                        : "material-symbols:event-available-outline-rounded"}
                      aria-hidden="true"
                    />
                    {isNewCard ? "Adicionar" : (method.expires || "--/--")}
                  </strong>
                </span>
                {!isNewCard && (
                  <span>
                    <small>Ver verso</small>
                    <strong
                      className="payment-card-3d__flip-btn"
                      onClick={handleFlip}
                    >
                      <Icon icon="material-symbols:flip-rounded" aria-hidden="true" />
                      Virar
                    </strong>
                  </span>
                )}
              </span>

              {/* click ripple */}
              {ripple && (
                <motion.span
                  aria-hidden="true"
                  className="payment-card-3d__ripple"
                  initial={{ scale: 0.85, opacity: 0.5 }}
                  animate={{ scale: 1.08, opacity: 0 }}
                  transition={{ duration: 0.4 }}
                />
              )}
            </span>

            {/* ── BACK ────────────────────────────────────── */}
            {!isNewCard && (
              <span
                className="payment-card-3d__surface payment-card-3d__surface--back"
                style={{
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }}
              >
                <span className="payment-card-3d__glow" aria-hidden="true" />
                <span className="payment-card-3d__strip" aria-hidden="true" />

                <span className="payment-card-3d__back-body">
                  <Icon icon="simple-icons:stripe" className="payment-card-3d__back-icon" aria-hidden="true" />
                  <strong>Protegido pelo Stripe</strong>
                  <small>CVV e dados sensíveis nunca ficam armazenados localmente.</small>
                </span>

                <span
                  className="payment-card-3d__flip-btn payment-card-3d__flip-btn--back"
                  onClick={handleFlip}
                >
                  <Icon icon="material-symbols:flip-rounded" aria-hidden="true" />
                  Voltar
                </span>
              </span>
            )}

          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
