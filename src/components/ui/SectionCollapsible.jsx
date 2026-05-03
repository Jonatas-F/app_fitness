import { useId, useState } from "react";
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
  ...rest
}) {
  const contentId = useId();
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <details
      {...rest}
      className={cn("section-collapsible", className)}
      open={defaultOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary
        className={cn("section-collapsible__summary", summaryClassName)}
        aria-expanded={isOpen}
        aria-controls={contentId}
      >
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
      <div id={contentId} className={cn("section-collapsible__body", bodyClassName)}>
        {children}
      </div>
    </details>
  );
}
