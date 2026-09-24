import Link from "next/link";
import { Card, CardEyebrow, CardTitle } from "@/components/ui";
import { WarmBackend } from "@/components/WarmBackend";

/**
 * The narrow centered card every auth/onboarding screen sits in.
 *
 * One shell for sign up, sign in, verify-pending, onboarding and TOTP
 * enrollment keeps the "fifteen seconds of work" feel from §6.2 — nothing
 * about the frame should compete for attention across that sequence.
 */
export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  width = "max-w-md",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: string;
}) {
  return (
    <main className={`mx-auto flex min-h-screen w-full flex-col justify-center px-6 py-16 ${width}`}>
      {/*
        Every screen in this shell sits between arriving and needing the API:
        sign in, sign up, verify-pending, onboarding, TOTP. Onboarding matters
        most — picking categories is ~30s of typing that lands the user
        straight on the feed, which is the request that otherwise eats the
        cold start.
      */}
      <WarmBackend />
      <Link href="/" className="mb-8 self-start font-sans text-xs font-medium text-faint hover:text-dim">
        ← VegaIntel
      </Link>
      <Card className="flex flex-col gap-6">
        <div>
          {eyebrow ? <CardEyebrow>{eyebrow}</CardEyebrow> : null}
          <CardTitle className="mt-2 text-2xl">{title}</CardTitle>
          {subtitle ? <p className="mt-2 font-sans text-sm text-dim">{subtitle}</p> : null}
        </div>
        {children}
      </Card>
    </main>
  );
}
