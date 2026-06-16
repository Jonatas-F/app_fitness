import { useState } from "react";
import { downloadPlanHtml } from "../services/planHtmlExport";
import "./PlanExportButton.css";

/**
 * PlanExportButton
 * Botão que gera e baixa o plano completo como HTML standalone.
 *
 * Props:
 *  - variant: "primary" | "ghost" | "inline"  (default "ghost")
 *  - label: string (default "Baixar Plano")
 *  - showIcon: boolean (default true)
 */
export function PlanExportButton({ variant = "ghost", label = "Baixar Plano", showIcon = true }) {
  const [state, setState] = useState("idle"); // idle | generating | done

  async function handleClick() {
    if (state !== "idle") return;
    setState("generating");
    try {
      // Pequeno delay pra dar feedback visual antes de bloquear a thread
      await new Promise(r => setTimeout(r, 80));
      downloadPlanHtml();
      setState("done");
      setTimeout(() => setState("idle"), 2500);
    } catch (err) {
      console.error("[PlanExportButton] Erro ao gerar HTML:", err);
      setState("idle");
    }
  }

  const icons = { idle: "⬇", generating: "⏳", done: "✓" };
  const labels = { idle: label, generating: "Gerando…", done: "Baixado!" };
  const icon  = icons[state];
  const text  = labels[state];

  return (
    <button
      className={`plan-export-btn plan-export-btn--${variant} plan-export-btn--${state}`}
      onClick={handleClick}
      disabled={state === "generating"}
      title="Baixar plano completo como HTML"
    >
      {showIcon && <span className="plan-export-btn__icon">{icon}</span>}
      <span className="plan-export-btn__label">{text}</span>
    </button>
  );
}
