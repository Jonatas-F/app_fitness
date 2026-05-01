import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import "./SectionCollapsible.css";

export default function SectionCollapsible({
  eyebrow,
  title,
  summary,
  badge,
  children,
  className,
  summaryClassName,
  bodyClassName,
  badgeClassName,
  defaultOpen = false,
}) {
  return (
    <details className={cn("section-collapsible", className)} open={defaultOpen}>
      <summary className={cn("section-collapsible__summary", summaryClassName)}>
        <span className="section-collapsible__icon">
          <ChevronDown aria-hidden="true" />
        </span>
        <span className="section-collapsible__copy">
          {eyebrow ? <small className="section-collapsible__eyebrow">{eyebrow}</small> : null}
          <strong>{title}</strong>
          {summary ? <em>{summary}</em> : null}
        </span>
        {badge ? (
          <span className={cn("section-collapsible__badge", badgeClassName)}>
            {badge}
          </span>
        ) : null}
      </summary>
      <div className={cn("section-collapsible__body", bodyClassName)}>{children}</div>
    </details>
  );
}
