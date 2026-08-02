import { base44 } from "@/api/base44Client";
import { AUTH_INTERFACE, assertImplements } from "@/services/interfaces";

const DRAFT_KEY = "pending_cv";

/**
 * AuthService — authentication + in-progress draft lifecycle.
 * Keeps the "login-on-save/print" gate and draft persistence in one place,
 * decoupled from any page. `requireAuth` is the single entry point that
 * pages call before performing a privileged action.
 */
export function createAuthService() {
  const service = {
    name: "auth",

    isAuthenticated: () => base44.auth.isAuthenticated(),

    redirectToLogin: (nextUrl) => base44.auth.redirectToLogin(nextUrl),

    logout: (redirectUrl) => base44.auth.logout(redirectUrl),

    persistDraft(draft) {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    },

    restoreDraft() {
      try {
        const raw = sessionStorage.getItem(DRAFT_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        return null;
      }
    },

    clearDraft() {
      sessionStorage.removeItem(DRAFT_KEY);
    },

    /** Returns true if authenticated; otherwise persists draft and redirects to login. */
    async requireAuth({ draft, nextUrl }) {
      const ok = await base44.auth.isAuthenticated();
      if (ok) return true;
      if (draft) this.persistDraft(draft);
      base44.auth.redirectToLogin(nextUrl);
      return false;
    },
  };

  assertImplements(service, AUTH_INTERFACE);
  return service;
}