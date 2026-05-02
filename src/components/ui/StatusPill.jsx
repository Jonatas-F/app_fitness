import { cn } from "@/lib/utils";
import "./StatusPill.css";

export default function StatusPill({ children, tone = "neutral", className, ...props }) {
  return (
    <span className={cn("status-pill", `status-pill--${tone}`, className)} {...props}>
      {children}
    </span>
  );
}
