/**
 * Google-only for the beta (user decision, 2026-09-16, Lyra#13 review).
 *
 * Supabase's built-in email sender only delivers to project team members and
 * caps at 2/hour — https://supabase.com/docs/guides/auth/auth-smtp — and B.8
 * (Resend) is deferred for lack of a verified sending domain (H3). An email
 * sign-up would wait on a verification message that never arrives, and it
 * would never convert a referral either, since B.10 counts conversion on
 * `email_verified`. Flip this back on the day H3 lands; `/login` keeps
 * email + password for accounts that already exist.
 *
 * Its own module, not an inline constant in the page, so a test can mock it
 * to exercise both states.
 */
export const EMAIL_SIGNUP_ENABLED = false;
