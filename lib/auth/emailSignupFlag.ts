/**
 * Email + password sign-up. **On** since 2026-09-26.
 *
 * It was off for the whole of Wave 1 on a premise that turned out to be
 * wrong. The reasoning was: Supabase's built-in sender only delivers to
 * project team members and caps at 2/hour
 * (https://supabase.com/docs/guides/auth/auth-smtp), B.8 (Resend) is
 * deferred for lack of a verified sending domain (H3), so an email sign-up
 * would wait forever on a verification message that never arrives. Every
 * word of that is true — and none of it matters, because **email
 * confirmation is optional**. With Supabase Auth → Sign In / Providers →
 * Email → "Confirm email" turned off, `signUp` returns a live session
 * immediately and no message is ever sent. The dependency was on email
 * *delivery*, not on email *sign-up*, and the flag conflated them.
 *
 * So the old "flip this back on the day H3 lands" condition was wrong.
 * H3 is not a prerequisite. What H3 still gates is listed below.
 *
 * `app/signup/page.tsx` branches on `data.session` rather than assuming
 * either setting, so this stays correct whichever way the dashboard toggle
 * is set — turning confirmations back on cannot strand anyone.
 *
 * ## What is still missing without email delivery
 *
 * - **No password reset.** `resetPasswordForEmail` is not called anywhere
 *   in this repo, for any provider. A tester who forgets their password
 *   loses the account exactly as a Google tester who loses their Google
 *   account does. Say so in the invite.
 * - **No verified addresses.** `email_verified` stays false, so B.10's
 *   referral-conversion counting cannot fire for these accounts.
 *
 * Both are acceptable for a small, invited, hand-picked beta and neither is
 * acceptable at public launch. Land B.8 before then.
 *
 * Its own module, not an inline constant in the page, so a test can mock it
 * to exercise both states.
 */
export const EMAIL_SIGNUP_ENABLED = true;
