import { cn } from "@/lib/utils";
import "./skeleton.css";

export function Skeleton({ className, ...props }) {
  return <div className={cn("ui-skeleton", className)} aria-hidden="true" {...props} />;
}

export default Skeleton;
