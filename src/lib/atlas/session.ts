import { authClient } from "@/lib/auth/client";

/**
 * Same key the pre-wired auth client uses for the live-preview bearer token
 * (`src/lib/auth/client.ts`). Email/password does not go through the OAuth
 * popup, so we persist the token Better Auth already returns (`set-auth-token`
 * header, signed) and let the existing `onRequest` hook attach it.
 */
const BEARER_KEY = "grok-auth.bearer-token";

export function persistSessionToken(token: string | null | undefined): void {
  if (!token || typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(BEARER_KEY, token);
  } catch {
    /* storage unavailable */
  }
}

export const emailAuthFetchOptions = {
  onSuccess(ctx: { response: Response }) {
    persistSessionToken(ctx.response.headers.get("set-auth-token"));
  },
};

export async function finishEmailAuth(result: {
  data?: { token?: string | null } | null;
  error?: unknown;
}): Promise<void> {
  if (result.error) throw result.error;
  persistSessionToken(result.data?.token ?? undefined);
  try {
    await authClient.getSession();
  } catch {
    /* session store recovers on the next fetch */
  }
}
