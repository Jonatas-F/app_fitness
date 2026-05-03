import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./GuidedTour.css";

// ── Tour steps ────────────────────────────────────────────────────────────────
// position: onde o tooltip aparece em relação ao elemento destacado
//   "right"  → tooltip à direita, seta aponta para esquerda
//   "bottom" → tooltip abaixo,    seta aponta para cima
//   "top"    → tooltip acima,     seta aponta para baixo
//   "left"   → tooltip à esquerda, seta aponta para direita
//   "center" → modal centralizado, sem spotlight
const TOUR_STEPS = [
  {
    id: "welcome",
    route: null,
    target: null,
    position: "center",
    icon: "👋",
    title: "Bem-vindo ao Shape Certo!",
    description:
      "Vou te mostrar como usar cada funcionalidade em poucos passos. Use as setas para navegar.",
  },
  // ── Check-in ──────────────────────────────────────────────────────────────
  {
    id: "nav-checkins",
    route: "/checkins",
    target: '[data-tour="nav-checkins"]',
    position: "right",
    icon: "✅",
    title: "1. Check-ins",
    description:
      "Clique aqui toda semana para registrar seus dados. O check-in é a base que a IA usa para montar e ajustar seus protocolos.",
  },
  {
    id: "checkin-selector",
    route: "/checkins",
    target: '[data-tour="checkin-selector"]',
    position: "bottom",
    icon: "📅",
    title: "Tipo de check-in",
    description:
      "Escolha Semanal para acompanhar aderência rápida, ou Mensal para uma revisão completa com medidas e bioimpedância.",
  },
  {
    id: "checkin-weight",
    route: "/checkins",
    target: '[data-tour="checkin-weight"]',
    position: "right",
    icon: "⚖️",
    title: "Preencha seus dados",
    description:
      "Registre peso, energia, sono, fome e outros indicadores. Quanto mais consistente, mais preciso o protocolo da IA.",
  },
  // ── Treinos ───────────────────────────────────────────────────────────────
  {
    id: "nav-treinos",
    route: "/treinos",
    target: '[data-tour="nav-treinos"]',
    position: "right",
    icon: "💪",
    title: "2. Treinos",
    description:
      "Após o check-in, a IA monta um protocolo de treino completo com séries, cargas e progressão.",
  },
  {
    id: "workout-start",
    route: "/treinos",
    target: '[data-tour="workout-start"]',
    position: "top",
    icon: "▶️",
    title: "Iniciar sessão",
    description:
      "Clique aqui para iniciar sua sessão de treino. Registre cargas e repetições — esses dados alimentam os próximos protocolos.",
  },
  // ── Dieta ─────────────────────────────────────────────────────────────────
  {
    id: "nav-dieta",
    route: "/dietas",
    target: '[data-tour="nav-dieta"]',
    position: "right",
    icon: "🥗",
    title: "3. Plano alimentar",
    description:
      "Seu plano alimentar personalizado com refeições, quantidades exatas e opções de substituição para cada alimento.",
  },
  {
    id: "diet-content",
    route: "/dietas",
    target: '[data-tour="diet-content"]',
    position: "bottom",
    icon: "🍽️",
    title: "Refeições do dia",
    description:
      "Cada refeição vem com alimentos, gramas e calorias. Marque as refeições realizadas para acompanhar sua aderência diária.",
  },
  // ── Chat ──────────────────────────────────────────────────────────────────
  {
    id: "nav-chat",
    route: "/chat",
    target: '[data-tour="nav-chat"]',
    position: "right",
    icon: "🤖",
    title: "4. Personal Virtual",
    description:
      "Converse com seu Personal a qualquer momento para ajustar protocolos, tirar dúvidas ou pedir análises do seu histórico.",
  },
  {
    id: "chat-input",
    route: "/chat",
    target: '[data-tour="chat-input"]',
    position: "top",
    icon: "💬",
    title: "Faça uma pergunta",
    description:
      "Digite aqui sua dúvida ou pedido. O Personal tem acesso a todos os seus check-ins, treinos e dietas — responde com contexto real.",
  },
  // ── Configurações ─────────────────────────────────────────────────────────
  {
    id: "nav-config",
    route: "/configuracoes",
    target: '[data-tour="nav-config"]',
    position: "right",
    icon: "⚙️",
    title: "5. Configurações e plano",
    description:
      "Configure seu perfil, equipamentos disponíveis e preferências alimentares. Aqui também você gerencia seu plano e pagamentos.",
  },
  {
    id: "settings-overview",
    route: "/configuracoes",
    target: '[data-tour="settings-overview"]',
    position: "bottom",
    icon: "💳",
    title: "Seu plano atual",
    description:
      "Acompanhe os tokens usados, data de recarga e faça upgrade quando quiser acessar recursos avançados como check-in diário e dashboard completo.",
  },
  // ── Done ──────────────────────────────────────────────────────────────────
  {
    id: "done",
    route: null,
    target: null,
    position: "center",
    icon: "🎯",
    title: "Tudo pronto!",
    description:
      "Comece pelo check-in semanal para a IA montar seus protocolos. Quanto mais dados, mais preciso o resultado. Bons treinos!",
    isLast: true,
  },
];

const TOOLTIP_W = 300;
const SPOT_PAD  = 10; // px de padding ao redor do elemento destacado

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Calcula posição (top/left) do tooltip relativo ao rect do elemento */
function calcTooltipPos(rect, position) {
  const cx = rect.left + rect.width  / 2;
  const cy = rect.top  + rect.height / 2;
  const gap = 18 + SPOT_PAD;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  switch (position) {
    case "right":
      return {
        left: Math.min(rect.right + gap, vw - TOOLTIP_W - 12),
        top:  Math.max(12, Math.min(cy - 90, vh - 220)),
      };
    case "left":
      return {
        left: Math.max(12, rect.left - TOOLTIP_W - gap),
        top:  Math.max(12, Math.min(cy - 90, vh - 220)),
      };
    case "bottom":
      return {
        left: Math.max(12, Math.min(cx - TOOLTIP_W / 2, vw - TOOLTIP_W - 12)),
        top:  Math.min(rect.bottom + gap, vh - 220),
      };
    case "top":
    default:
      return {
        left: Math.max(12, Math.min(cx - TOOLTIP_W / 2, vw - TOOLTIP_W - 12)),
        top:  Math.max(12, rect.top - gap - 180),
      };
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function GuidedTour({ onComplete }) {
  const [stepIndex, setStepIndex]   = useState(0);
  const [rect, setRect]             = useState(null);   // BoundingClientRect do target
  const [visible, setVisible]       = useState(false);  // animação de entrada
  const activeElRef                 = useRef(null);      // referência ao elemento com pulse
  const navigate                    = useNavigate();
  const step                        = TOUR_STEPS[stepIndex];

  // ── Limpa pulse do elemento anterior ──────────────────────────────────────
  const clearPulse = useCallback(() => {
    if (activeElRef.current) {
      activeElRef.current.classList.remove("tour-target--active");
      activeElRef.current = null;
    }
  }, []);

  // ── Quando o step muda: navega + encontra o elemento ─────────────────────
  useEffect(() => {
    setVisible(false);
    setRect(null);
    clearPulse();

    if (step.route) navigate(step.route);

    // Aguarda render da página destino
    const DELAY = step.route ? 600 : 100;
    const timer = setTimeout(() => {
      if (!step.target) {
        setVisible(true);
        return;
      }

      const el = document.querySelector(step.target);
      if (!el) {
        // Elemento não encontrado (ex.: sidebar oculta em mobile) → modo center
        setVisible(true);
        return;
      }

      // Scroll INSTANTÂNEO (síncrono) para garantir que o elemento está no
      // viewport ANTES de medir o rect. behavior:"smooth" é assíncrono e
      // causa race condition com getBoundingClientRect().
      el.scrollIntoView({ behavior: "instant", block: "center", inline: "nearest" });

      // Dois rAF garantem que o browser pintou o frame pós-scroll
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const r = el.getBoundingClientRect();
          const inView =
            r.width > 0 &&
            r.height > 0 &&
            r.top >= 0 &&
            r.bottom <= window.innerHeight + 1;

          if (inView) {
            setRect(r);
            el.classList.add("tour-target--active");
            activeElRef.current = el;
          }
          setVisible(true);
        });
      });
    }, DELAY);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex]);

  // ── Cleanup ao desmontar ──────────────────────────────────────────────────
  useEffect(() => () => clearPulse(), [clearPulse]);

  // ── Escape fecha o tour ────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onComplete(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onComplete]);

  // ── Navegação ─────────────────────────────────────────────────────────────
  function goNext() {
    if (step.isLast) { onComplete(); return; }
    setStepIndex((i) => i + 1);
  }
  function goPrev() {
    if (stepIndex === 0) return;
    setStepIndex((i) => i - 1);
  }

  // ── Derived state ─────────────────────────────────────────────────────────
  const isCenter      = !rect || step.position === "center";
  const tooltipPos    = (!isCenter && rect) ? calcTooltipPos(rect, step.position) : null;

  return (
    <div
      className="tour-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
    >
      {/* ── SVG Spotlight ─────────────────────────────────────────────────── */}
      {rect ? (
        <svg className="tour-spotlight" aria-hidden="true">
          <defs>
            <mask id="tour-mask">
              <rect fill="white" x="0" y="0" width="100%" height="100%" />
              <rect
                fill="black"
                x={rect.left   - SPOT_PAD}
                y={rect.top    - SPOT_PAD}
                width={rect.width  + SPOT_PAD * 2}
                height={rect.height + SPOT_PAD * 2}
                rx="10"
              />
            </mask>
          </defs>
          <rect
            fill="rgba(0,0,0,0.78)"
            x="0" y="0"
            width="100%" height="100%"
            mask="url(#tour-mask)"
          />
        </svg>
      ) : (
        <div className="tour-backdrop" />
      )}

      {/* ── Tooltip / Card ────────────────────────────────────────────────── */}
      <div
        id="tour-title"
        className={[
          "tour-card",
          "glass-panel",
          isCenter ? "tour-card--center" : "tour-card--anchored",
          !isCenter ? `tour-card--${step.position}` : "",
          visible ? "tour-card--visible" : "",
        ].join(" ")}
        style={tooltipPos ? { left: tooltipPos.left, top: tooltipPos.top } : {}}
      >
        {/* Seta apontando para o elemento */}
        {!isCenter && <span className={`tour-arrow tour-arrow--${step.position}`} aria-hidden="true" />}

        {/* Ícone + conteúdo */}
        <div className="tour-card__icon">{step.icon}</div>

        <div className="tour-card__body">
          <p className="tour-card__step">{stepIndex + 1} / {TOUR_STEPS.length}</p>
          <h3 className="tour-card__title">{step.title}</h3>
          <p className="tour-card__desc">{step.description}</p>
        </div>

        {/* Indicadores de progresso */}
        <div className="tour-dots" aria-hidden="true">
          {TOUR_STEPS.map((_, i) => (
            <span
              key={i}
              className={`tour-dot${i === stepIndex ? " is-active" : ""}`}
            />
          ))}
        </div>

        {/* Botões */}
        <div className="tour-actions">
          <button type="button" className="ghost-button" onClick={onComplete}>
            Pular
          </button>
          <div className="tour-actions__nav">
            {stepIndex > 0 && (
              <button type="button" className="ghost-button" onClick={goPrev}>
                ← Voltar
              </button>
            )}
            <button type="button" className="primary-button" onClick={goNext}>
              {step.isLast ? "Começar →" : "Próximo →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
