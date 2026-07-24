// Préserve la destination d'un lien profond (ex: /activities/<id> partagé sur
// WhatsApp) le temps du passage par /auth, pour qu'un nouveau membre atterrisse
// directement dessus après son inscription plutôt que sur /social par défaut.
const STORAGE_KEY = 'post_auth_redirect';

export function setPostAuthRedirect(path: string): void {
  sessionStorage.setItem(STORAGE_KEY, path);
}

// Lit puis efface la destination mémorisée (usage unique).
export function consumePostAuthRedirect(fallback: string): string {
  const stored = sessionStorage.getItem(STORAGE_KEY);
  if (!stored) return fallback;
  sessionStorage.removeItem(STORAGE_KEY);
  return stored;
}
