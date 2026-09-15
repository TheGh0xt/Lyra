import type { AuthError, User } from "@supabase/supabase-js";

/**
 * Supabase's sign-in error for a wrong password or unknown email is one
 * generic message on purpose, so a bad actor can't use it to enumerate
 * accounts — but that means both PRD-required states ("invalid credentials")
 * collapse to the same string, so no finer classification is possible here.
 */
export function isInvalidCredentials(error: AuthError): boolean {
  return error.message.toLowerCase().includes("invalid login credentials");
}

/**
 * Whether an "already have an account" sign-up actually created a new user.
 *
 * Supabase's default enumeration protection makes `signUp` return 200 with a
 * user object even when the email is already registered, rather than an
 * error — otherwise the response itself would leak which emails exist. The
 * documented tell: a genuinely new sign-up gets a non-empty `identities`
 * array; signing up again with a known, confirmed email gets an empty one.
 */
export function signUpHitExistingEmail(user: User | null): boolean {
  return user !== null && (user.identities?.length ?? 0) === 0;
}
