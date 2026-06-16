import { LazyMotion, domAnimation, m, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import "./SectionCard.css";
import "@/components/ui/spotlight-card.css";
import { useGlowEffect } from "@/hooks/useGlowEffect";

export default function SectionCard({
  eyebrow,
  title,
  description,
  badge,
  children,
  className,
  bodyClassName,
  glowColor = "brand-soft",
}) {
  const reduceMotion = useReducedMotion();
  const glowRef = useGlowEffect(glowColor);

  return (
    <LazyMotion features={domAnimation}>
      <m.section
        ref={glowRef}
        className={cn("section-card", className)}
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        {(eyebrow || title || description || badge) ? (
          <header className="section-card__header">
            <div className="section-card__copy">
              {eyebrow ? <span className="section-card__eyebrow">{eyebrow}</span> : null}
              {title ? <strong className="section-card__title">{title}</strong> : null}
              {description ? <p className="section-card__description">{description}</p> : null}
            </div>
            {badge}
          </header>
        ) : null}
        <div className={cn("section-card__body", bodyClassName)}>{children}</div>
      </m.section>
    </LazyMotion>
  );
}
