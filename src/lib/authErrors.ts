import type { TFunction } from 'i18next';

// Les messages d'erreur bruts de Supabase Auth sont en anglais — cette
// fonction les traduit pour les cas courants rencontrés dans l'app
// (connexion, inscription, changement de mot de passe).
export function translateAuthError(t: TFunction, error: unknown): string {
  const msg = error instanceof Error ? error.message.toLowerCase() : '';
  if (msg.includes('rate limit') || msg.includes('for security purposes') || msg.includes('trop de tentatives')) {
    return t('auth.rateLimited');
  }
  if (msg.includes('password') && (msg.includes('should be') || msg.includes('different') || msg.includes('at least'))) {
    return t('auth.weakPassword');
  }
  if (msg.includes('session') || msg.includes('jwt') || msg.includes('not authenticated')) {
    return t('auth.sessionExpired');
  }
  return t('auth.genericError');
}
