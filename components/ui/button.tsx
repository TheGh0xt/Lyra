import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/ui/cn";

/**
 * The four button treatments the design specifies, plus the focus ring.
 *
 * The ring is `focus-visible`, not `focus`, so it appears for keyboard users
 * and not on a mouse click — UI_PRD §9 requires a visible focus state, and a
 * ring that also fires on pointer input trains people to ignore it.
 */
const button = cva(
  "inline-flex items-center justify-center gap-2 rounded-[11px] font-sans font-semibold " +
    "transition-[filter,border-color,color] cursor-pointer " +
    "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-violet-soft focus-visible:border-violet " +
    "disabled:cursor-not-allowed disabled:bg-elev disabled:text-faint disabled:border disabled:border-line " +
    "disabled:hover:filter-none",
  {
    variants: {
      variant: {
        primary: "bg-violet text-white border-none hover:brightness-110",
        secondary: "bg-transparent text-text border border-line-2 hover:border-violet",
        ghost: "bg-transparent text-violet-text border-none hover:bg-violet-soft",
      },
      size: {
        sm: "text-xs px-[13px] py-2",
        md: "text-sm px-[18px] py-[11px]",
        lg: "text-[15px] px-6 py-[14px] rounded-xl",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof button>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(button({ variant, size }), className)} {...props} />;
}

export { button as buttonVariants };
