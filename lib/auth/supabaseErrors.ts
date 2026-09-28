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

/**
 * The *other* shape of "that email is taken".
 *
 * The enumeration protection `signUpHitExistingEmail` reads only applies
 * while email confirmations are on. With "Confirm email" off — which is how
 * sign-up works at all without a sending domain, see `emailSignupFlag.ts` —
 * there is no confirmation step to hide behind, so Supabase gives up the
 * pretence and returns a plain error instead.
 *
 * That is not a regression in privacy terms: with confirmations off, sign-in
 * timing and the immediate session already tell an attacker the same thing.
 * It is only a UI problem, and this is how it gets routed to the same
 * "sign in instead" panel as the other shape rather than surfacing raw API
 * text under the password field.
 */
export function signUpRejectedExistingEmail(error: AuthError | { message: string }): boolean {
  return error.message.toLowerCase().includes("already registered");
}
