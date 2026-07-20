const STORAGE_KEY = 'referral_code';

// Capture le code de parrainage présent dans l'URL (?ref=<user_id>) et le
// garde en mémoire le temps de la session, pour qu'il survive à la
// navigation entre la page d'accueil et le formulaire d'inscription.
export function captureReferralFromUrl(search: string): void {
  const ref = new URLSearchParams(search).get('ref');
  if (ref) sessionStorage.setItem(STORAGE_KEY, ref);
}

export function getStoredReferralCode(): string | null {
  return sessionStorage.getItem(STORAGE_KEY);
}

export function clearStoredReferralCode(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}

export function buildReferralLink(userId: string): string {
  return `${window.location.origin}/?ref=${userId}`;
}
