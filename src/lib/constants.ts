// Constantes partagées de l'application — un seul point de vérité
// NOTE i18n : `value`/`id` sont les identifiants stockés en base (ne pas traduire,
// ne pas changer). Les libellés affichés se traduisent via i18next, avec des clés
// nommées d'après `value`/`id` (ex: t('statusOptions.' + value)) — voir Profile.tsx,
// ProfileCard.tsx, Discussions.tsx, Activities.tsx, NewActivity.tsx, MapView.tsx,
// ReportModal.tsx, Admin.tsx pour les points d'utilisation.

export const STATUS_OPTIONS = [
  { value: 'resident', emoji: '🏡' },
  { value: 'frequent', emoji: '🚗' },
  { value: 'vacation', emoji: '☀️' },
] as const;

export const AVAILABILITY_OPTIONS = [
  { value: 'weekend' },
  { value: 'week' },
  { value: 'summer' },
  { value: 'year' },
] as const;

export const INTEREST_OPTIONS = [
  { value: 'plage', emoji: '🏖️' },
  { value: 'vélo', emoji: '🚲' },
  { value: 'tennis', emoji: '🎾' },
  { value: 'surf', emoji: '🏄' },
  { value: 'apéro', emoji: '🍷' },
  { value: 'bateau', emoji: '⛵' },
  { value: 'running', emoji: '🏃' },
  { value: 'pêche', emoji: '🎣' },
  { value: 'yoga', emoji: '🧘' },
  { value: 'randonnée', emoji: '🥾' },
] as const;

export const JOB_CATEGORIES = [
  { value: '', emoji: '🗂️' },
  { value: 'jardinage', emoji: '🌿' },
  { value: 'bricolage', emoji: '🔨' },
  { value: 'garde', emoji: '👶' },
  { value: 'livraison', emoji: '🛵' },
  { value: 'menage', emoji: '🧹' },
  { value: 'autre', emoji: '✨' },
] as const;

export const SALONS = [
  { id: 'plage', emoji: '🏖️' },
  { id: 'velo', emoji: '🚲' },
  { id: 'surf', emoji: '🏄' },
  { id: 'apero', emoji: '🍷' },
  { id: 'bateau', emoji: '⛵' },
  { id: 'emploi', emoji: '💼' },
  { id: 'famille', emoji: '👨‍👩‍👧' },
  { id: 'general', emoji: '💬' },
] as const;

export const ACTIVITY_CATEGORIES = [
  { value: 'plage', emoji: '🏖️' },
  { value: 'velo', emoji: '🚲' },
  { value: 'surf', emoji: '🏄' },
  { value: 'apero', emoji: '🍷' },
  { value: 'bateau', emoji: '⛵' },
  { value: 'randonnee', emoji: '🥾' },
  { value: 'sport', emoji: '🏃' },
  { value: 'autre', emoji: '✨' },
] as const;

export const MIN_AGE = 15;
export const MAX_AGE = 120;

// Raisons de signalement disponibles dans le système de modération
export const REPORT_REASONS = [
  { value: 'spam' },
  { value: 'harcelement' },
  { value: 'contenu_inapproprie' },
  { value: 'arnaque' },
  { value: 'faux_profil' },
  { value: 'autre' },
] as const;

// Génère une URL de fallback non-trompeuse (pas une vraie photo de visage)
// pour remplacer les avatars manquants — corrige le bug de la photo Unsplash trompeuse
export function avatarFallbackInitial(name: string | null | undefined): string {
  return (name?.trim()?.[0] || '?').toUpperCase();
}

type TFunc = (key: string, options?: Record<string, unknown>) => string;

// Formate "vu il y a Xmin/Xh" ou une heure/date pour l'affichage hors-ligne.
// Prend `t` en paramètre (plutôt qu'un hook) car utilisé hors composants React.
export function formatLastSeen(lastSeen: string | null | undefined, t: TFunc): string {
  if (!lastSeen) return t('common.offline');
  const diffMs = Date.now() - new Date(lastSeen).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return t('common.lastSeenJustNow');
  if (diffMin < 60) return t('common.lastSeenMinAgo', { count: diffMin });
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return t('common.lastSeenHoursAgo', { count: diffH });
  const diffDays = Math.floor(diffH / 24);
  if (diffDays === 1) return t('common.lastSeenYesterday');
  if (diffDays < 7) return t('common.lastSeenDaysAgo', { count: diffDays });
  return t('common.lastSeenOnDate', { date: new Date(lastSeen).toLocaleDateString() });
}
