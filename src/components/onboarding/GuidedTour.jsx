import { useState, useEffect } from "react";
import "./GuidedTour.css";

const STEPS = [
  { icon: "👋", title: "Bem-vindo ao Shape Certo!", description: "Você acabou de completar seu primeiro check-in. Agora vou te mostrar como cada seção funciona." },
  { icon: "📊", title: "Dashboard", description: "Acompanhe sua evolução corporal, performance e aderência ao longo do tempo. Os gráficos são atualizados a cada check-in que você preenche.", nav: "/dashboard" },
  { icon: "✅", title: "Check-ins", description: "O coração da plataforma. Registre dados semanais e mensais — peso, energia, sono, aderência e muito mais. Quanto mais você preenche, mais preciso o protocolo.", nav: "/checkins" },
  { icon: "💪", title: "Treinos", description: "Seu protocolo de treino gerado pela IA com base nos check-ins, objetivos e equipamentos disponíveis. Registre séries, cargas e vídeos de execução.", nav: "/treinos" },
  { icon: "🥗", title: "Dieta", description: "Plano alimentar personalizado com alimentos, quantidades precisas e opções de substituição. Marque as refeições realizadas para acompanhar sua aderência.", nav: "/dietas" },
  { icon: "🤖", title: "Personal Virtual", description: "Converse com seu Personal Virtual para ajustar protocolos, tirar dúvidas ou pedir análises do seu histórico. Ele tem acesso a tudo que você preencheu.", nav: "/chat" },
  { icon: "⚙️", title: "Configurações", description: "Configure seu perfil, equipamentos disponíveis na academia, preferências e restrições alimentares. Essas informações alimentam diretamente os protocolos.", nav: "/configuracoes" },
  { icon: "🎯", title: "Tudo pronto!", description: "Complete seus check-ins regularmente para que a IA possa montar protocolos cada vez mais precisos. Quanto mais dados, melhor o resultado.", isLast: true },
];

export default function GuidedTour({ onComplete }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  // Escape key → skip tour
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onComplete();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onComplete]);

  function next() {
    if (current.isLast) { onComplete(); return; }
    setStep(s => s + 1);
  }

  return (
    <div className="tour-overlay" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      <div className="tour-card glass-panel">
        <div className="tour-card__icon">{current.icon}</div>
        <div className="tour-card__body">
          <p className="tour-card__step">Passo {step + 1} de {STEPS.length}</p>
          <h3 id="tour-title" className="tour-card__title">{current.title}</h3>
          <p className="tour-card__desc">{current.description}</p>
        </div>
        <div className="tour-dots">
          {STEPS.map((_, i) => (
            <span key={i} className={`tour-dot${i === step ? " is-active" : ""}`} />
          ))}
        </div>
        <div className="tour-actions">
          <button type="button" className="ghost-button" onClick={onComplete}>Pular tour</button>
          <button type="button" className="primary-button" onClick={next}>
            {current.isLast ? "Começar →" : "Próximo →"}
          </button>
        </div>
      </div>
    </div>
  );
}
