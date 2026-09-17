import { AuthedNav } from "@/components/nav/AuthedNav";

/**
 * Shared chrome for `/feed`, `/usage` and `/analyses/[id]` (L1, 2026-09-17).
 *
 * A layout, not a per-page opt-in component: opt-in is how every one of
 * these screens ended up with zero navigation in the first place — the next
 * page under this group is correct by default instead of being another
 * instance of the same bug. A route group changes no URLs.
 */
export default function AuthedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AuthedNav />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
