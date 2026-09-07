import { cn } from "@/lib/ui/cn";
import { Badge } from "./badge";
import { Button } from "./button";
import { Owl } from "./owl";
import type { Display } from "@/lib/ui/contract-display";

export interface StatePanelProps {
  /** The classification tag — "Service", "Not found", "Honest result", … */
  tag: Display;
  title: string;
  body: string;
  action?: { label: string; onClick?: () => void; href?: string };
  className?: string;
}

/**
 * The empty / error / edge-state panel (UI_PRD §6.10).
 *
 * Every one of the eight named states is this component with different copy,
 * which is deliberate: the states differ in what they say and what you can do
 * next, not in how they look. Making them one component means a new failure
 * class cannot ship without someone writing its sentence and its next action.
 *
 * `role="status"` rather than `alert`: these render in place of content the
 * user asked for, and an assertive interrupt on every empty feed is noise.
 */
export function StatePanel({ tag, title, body, action, className }: StatePanelProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center gap-2 rounded-[13px] border border-line bg-elev p-[18px] text-center",
        className,
      )}
    >
      <Owl />
      <Badge display={tag} className="text-[11px]" />
      <div className="font-display text-[15px] font-semibold">{title}</div>
      <p className="m-0 max-w-prose font-sans text-[12.5px] leading-relaxed text-dim">{body}</p>
      {action ? (
        action.href ? (
          <a
            href={action.href}
            className="mt-1 inline-flex rounded-[9px] border border-line-2 px-[13px] py-2 font-sans text-xs font-semibold text-text hover:border-violet"
          >
            {action.label}
          </a>
        ) : (
          <Button variant="secondary" size="sm" onClick={action.onClick} className="mt-1">
            {action.label}
          </Button>
        )
      ) : null}
    </div>
  );
}
