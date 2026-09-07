import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge class names, letting a caller's utility beat a component's default.
 *
 * Without twMerge, `<Button className="px-2">` produces `px-4 px-2` and the
 * winner depends on stylesheet order rather than on the call site — which is
 * the bug that makes variant components feel unpredictable.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
