import { cn } from "@/lib/utils";
import { DIcons } from "dicons";

/**
 * Animated radial-gradient border that sweeps around the container.
 * @param {number} borderRadius - Corner radius in px
 * @param {number} borderWidth  - Border thickness in px
 * @param {number} duration     - Animation cycle in seconds
 * @param {string|string[]} color - Gradient color(s) for the shine
 * @param {string} className    - Extra classes for the outer wrapper
 */
export function ShineBorder({
  borderRadius = 8,
  borderWidth = 1,
  duration = 14,
  color = ["#ff4d3d", "#ff2e2e", "#e50914"],
  className,
  children,
}) {
  return (
    <div
      style={{ "--border-radius": `${borderRadius}px` }}
      className={cn(
        "relative grid h-full w-full place-items-center rounded-3xl bg-[var(--bg-secondary)] p-3 text-white",
        className,
      )}
    >
      <div
        style={{
          "--border-width": `${borderWidth}px`,
          "--border-radius": `${borderRadius}px`,
          "--shine-pulse-duration": `${duration}s`,
          "--mask-linear-gradient":
            "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          "--background-radial-gradient": `radial-gradient(transparent,transparent, ${
            Array.isArray(color) ? color.join(",") : color
          },transparent,transparent)`,
        }}
        className={`before:bg-shine-size before:absolute before:inset-0 before:aspect-square before:size-full before:rounded-3xl before:p-[--border-width] before:will-change-[background-position] before:content-[""] before:![-webkit-mask-composite:xor] before:[background-image:--background-radial-gradient] before:[background-size:300%_300%] before:![mask-composite:exclude] before:[mask:--mask-linear-gradient] motion-safe:before:animate-[shine-pulse_var(--shine-pulse-duration)_infinite_linear]`}
      />
      {children}
    </div>
  );
}

export function TimelineContainer({ children }) {
  return (
    <div className="mx-auto flex max-w-md flex-col justify-center gap-3">
      {children}
    </div>
  );
}

export function TimelineEvent({ label, message, icon, isLast = false }) {
  const Icon = DIcons[icon.name];
  return (
    <div className="group relative -m-2 flex gap-4 border border-transparent p-2">
      <div className="relative">
        <div className={cn("rounded-full border bg-[var(--bg-secondary)] p-2", icon.borderColor)}>
          {Icon && <Icon className={cn("h-4 w-4", icon.textColor)} />}
        </div>
        {!isLast && (
          <div className="absolute inset-x-0 mx-auto h-full w-[2px] bg-[var(--border)]" />
        )}
      </div>
      <div className="mt-1 flex flex-1 flex-col gap-1">
        <p className="text-base font-semibold text-white">{label}</p>
        <p className="text-xs text-[var(--text-muted)]">{message}</p>
      </div>
    </div>
  );
}

const timeline = [
  {
    label: "Escolha seu plano",
    message: "Navegue pelos planos e acesse seu dashboard personalizado.",
    icon: { name: "Shapes", textColor: "text-orange-400", borderColor: "border-orange-400/40" },
  },
  {
    label: "Complete seu perfil",
    message: "Informe seus dados corporais, objetivos e preferências alimentares.",
    icon: { name: "Send", textColor: "text-amber-400", borderColor: "border-amber-400/40" },
  },
  {
    label: "Receba seu plano",
    message: "Seu treino e dieta são gerados em segundos pela IA.",
    icon: { name: "Check", textColor: "text-blue-400", borderColor: "border-blue-400/40" },
  },
  {
    label: "Ajuste e evolua",
    message: "Peça ajustes a qualquer momento conforme seu progresso.",
    icon: { name: "Repeat", textColor: "text-[#ff4d3d]", borderColor: "border-[#ff4d3d]/40" },
  },
  {
    label: "Acompanhe resultados",
    message: "Registre check-ins e veja sua evolução semana a semana.",
    icon: { name: "Download", textColor: "text-[var(--success)]", borderColor: "border-[var(--success)]/40" },
  },
];

export function Timeline() {
  return (
    <div className="w-full">
      <TimelineContainer>
        {timeline.map((event, i) => (
          <TimelineEvent
            key={event.label}
            isLast={i === timeline.length - 1}
            {...event}
          />
        ))}
      </TimelineContainer>
    </div>
  );
}
