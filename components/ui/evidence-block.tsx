import { cn } from "@/lib/ui/cn";
import { Badge } from "./badge";
import type { Display } from "@/lib/ui/contract-display";

export interface EvidenceBlockProps {
  title: string;
  /** The classification of the item — an impact level, or a verification verdict. */
  badge?: Display;
  /** A second badge, for citations that carry both a tier and a verdict. */
  secondaryBadge?: Display;
  /** Short label under the title: the driver's `type`, or a publisher. */
  kind?: string;
  body: string;
  /**
   * Provenance line. Rendered in the mono face because it is a machine fact —
   * a log name and a timestamp — and should not read as prose.
   */
  provenance?: string;
  href?: string;
  className?: string;
}

/**
 * One piece of evidence: a key driver, or a cited source.
 *
 * Both render identically on purpose. A driver and a citation are the same
 * kind of object to a reader — a claim, its weight, and where it came from —
 * and giving them one component keeps the report from growing two competing
 * visual grammars for the same idea.
 */
export function EvidenceBlock({
  title,
  badge,
  secondaryBadge,
  kind,
  body,
  provenance,
  href,
  className,
}: EvidenceBlockProps) {
  return (
    <article
      className={cn("rounded-[14px] border border-line bg-elev p-[18px]", className)}
    >
      <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="m-0 font-sans text-[15px] font-semibold">
            {href ? (
              <a href={href} target="_blank" rel="noreferrer noopener" className="text-violet-text hover:text-violet hover:underline">
                {title}
              </a>
            ) : (
              title
            )}
          </h4>
          {kind ? (
            <div className="mt-[3px] font-sans text-[11.5px] text-faint">{kind}</div>
          ) : null}
        </div>
        {badge || secondaryBadge ? (
          <div className="flex flex-wrap gap-1.5">
            {badge ? <Badge display={badge} /> : null}
            {secondaryBadge ? <Badge display={secondaryBadge} /> : null}
          </div>
        ) : null}
      </div>
      <p className="m-0 mb-[11px] font-sans text-[13.5px] leading-relaxed text-dim">{body}</p>
      {provenance ? (
        <div className="font-mono text-[11.5px] text-faint">{provenance}</div>
      ) : null}
    </article>
  );
}
