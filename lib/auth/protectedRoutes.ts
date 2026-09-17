/**
 * Routes that require a signed-in session (B.17).
 *
 * `/share/...` deliberately isn't here even though it sits under the same
 * `/analyses` feature: a shared report is meant to be readable by an
 * anonymous holder of the link (UI_PRD §6.7), authorized by its token, not
 * by a session.
 */
const PROTECTED_PREFIXES = ["/feed", "/onboarding", "/mfa", "/usage", "/analyses", "/terminal"];

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
