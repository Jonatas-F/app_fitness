import { cn } from "@/lib/utils";
import "./SectionCard.css";

export default function SectionCard({
  eyebrow,
  title,
  description,
  badge,
  children,
  className,
  bodyClassName,
}) {
  return (
    <section className={cn("section-card", className)}>
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
    </section>
  );
}
