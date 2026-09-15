"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "./config";

/**
 * The one Supabase client for client components — sign up, sign in, Google
 * OAuth, resending a verification email, TOTP enrollment.
 *
 * Memoized at module scope: `createBrowserClient` sets up its own auth-state
 * listener, and a fresh instance per render would mean a fresh listener too.
 */
let client: ReturnType<typeof createBrowserClient> | undefined;

export function supabaseBrowserClient() {
  if (!client) {
    client = createBrowserClient(supabaseUrl(), supabaseAnonKey());
  }
  return client;
}
