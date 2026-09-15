import Link from "next/link";
import { Card, CardEyebrow, CardTitle } from "@/components/ui";

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
