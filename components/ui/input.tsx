"use client";

import { useId } from "react";
import { cn } from "@/lib/ui/cn";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  /**
   * Validation message. Present means invalid: the border turns, an icon
   * appears, and `aria-invalid` is set — three signals, not one colour.
   */
  error?: string;
  hint?: string;
}

/**
 * A labelled text input with its error wired to the control.
 *
 * `aria-describedby` is what makes the error reach a screen reader at all; a
 * red border below the field is invisible to one. The message also carries an
 * icon so the failure survives greyscale and colour-blindness (UI_PRD §9).
 */
export function Input({ className, label, error, hint, id, ...props }: InputProps) {
  const generated = useId();
  const inputId = id ?? generated;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const describedBy = [error ? errorId : null, hint ? hintId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex flex-col gap-[7px]">
      {label ? (
        <label htmlFor={inputId} className="font-sans text-[13px] font-medium text-dim">
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={cn(
          // UX-05: 16px below `sm`, 14px from `sm` up. iOS Safari zooms the
          // page whenever a focused input's text is under 16px and never
          // zooms back out on blur — so at a flat `text-sm` the first tap on
          // the email field left every later screen scaled and scrolling
          // sideways. Fixed here rather than per-screen because it applies
          // to every field in the product: sign-in, sign-up, the MFA code,
          // and the feed's market URL box.
          "w-full rounded-[11px] border bg-elev px-[13px] py-[11px] font-sans text-base text-text sm:text-sm",
          "placeholder:text-faint transition-[border-color,box-shadow]",
          "focus:outline-none focus:border-violet focus:ring-[3px] focus:ring-violet-soft",
          error ? "border-ro" : "border-line-2",
          className,
        )}
        {...props}
      />
      {hint && !error ? (
        <p id={hintId} className="font-sans text-xs text-faint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p
          id={errorId}
          className="flex items-center gap-1.5 font-sans text-xs text-ro"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
            className="shrink-0"
          >
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 7.6v5M12 16.2v.2" />
          </svg>
          {error}
        </p>
      ) : null}
    </div>
  );
}
