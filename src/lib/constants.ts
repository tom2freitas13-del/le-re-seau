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
  { value: 'restaurants', emoji: '🍽️' },
  { value: 'animaux', emoji: '🐾' },
] as const;

// Catégories des posts du forum — stockées dans forum_posts.tag (texte libre,
// sans contrainte en base). 'general' reste la valeur par défaut historique
// des posts créés avant l'ajout de ce sélecteur ; on l'affiche comme
// "Discussion" au même titre qu'une valeur absente/inconnue.
export const FORUM_CATEGORIES = [
  { value: 'question', emoji: '❓' },
  { value: 'info', emoji: 'ℹ️' },
  { value: 'bon_plan', emoji: '🎁' },
  { value: 'entraide', emoji: '🤝' },
  { value: 'discussion', emoji: '💬' },
] as const;

export function normalizeForumTag(tag: string | null | undefined): string {
  return tag && FORUM_CATEGORIES.some(c => c.value === tag) ? tag : 'discussion';
}

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

// Les 10 communes de l'Île de Ré — noms exacts utilisés tels quels (pas de
// clé i18n, ce sont des noms propres) pour repérer une activité "proche de
// chez soi" : on cherche si ce nom apparaît dans l'adresse de l'activité
// (ex: "Rue de la Plage, 17590 Ars-en-Ré").
export const ILE_DE_RE_CITIES = [
  'Rivedoux-Plage',
  'La Flotte',
  'Sainte-Marie-de-Ré',
  'Saint-Martin-de-Ré',
  'Le Bois-Plage-en-Ré',
  'La Couarde-sur-Mer',
  'Ars-en-Ré',
  'Loix',
  'Les Portes-en-Ré',
  'Saint-Clément-des-Baleines',
] as const;

// Nombre d'amis invités (referral_count) pour débloquer le badge Ambassadeur
export const AMBASSADOR_REFERRAL_THRESHOLD = 3;

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

// Formate "en ligne il y a Xmin/Xh" ou une heure/date pour l'affichage
// hors-ligne (présence). Prend `t` en paramètre (plutôt qu'un hook) car
// utilisé hors composants React. Distinct de formatReadAt ci-dessous, qui
// porte sur la lecture d'un message et non la présence.
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

// Formate "vu il y a Xmin/Xh" pour l'horodatage de lecture d'un message
// (chat.seen* — sous le dernier message lu, façon Instagram). Même
// découpage temporel que formatLastSeen mais des clés dédiées, pour garder
// "vu" réservé à la lecture d'un message plutôt qu'à la présence en ligne.
export function formatReadAt(readAt: string | null | undefined, t: TFunc): string {
  if (!readAt) return '';
  const diffMs = Date.now() - new Date(readAt).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return t('chat.seenJustNow');
  if (diffMin < 60) return t('chat.seenMinAgo', { count: diffMin });
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return t('chat.seenHoursAgo', { count: diffH });
  const diffDays = Math.floor(diffH / 24);
  if (diffDays === 1) return t('chat.seenYesterday');
  if (diffDays < 7) return t('chat.seenDaysAgo', { count: diffDays });
  return t('chat.seenOnDate', { date: new Date(readAt).toLocaleDateString() });
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

// Format fixe JJ/MM/AAAA HH:mm (indépendant de la langue du navigateur,
// contrairement à toLocaleDateString() par défaut) pour un affichage
// prévisible des messages anciens, façon Instagram/Snapchat.
function formatAbsoluteDateTime(date: Date): string {
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

// Horodatage des messages (chat privé, groupes, salons, forum) façon
// Instagram/Snapchat : relatif et qui se met à jour tout seul tant que le
// message est récent (voir useTimeTick), puis bascule sur une date absolue
// passé un certain âge.
export function formatMessageTime(iso: string, t: TFunc): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return t('common.messageTimeJustNow');
  if (diffMin < 60) return t('common.messageTimeMinAgo', { count: diffMin });
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return t('common.messageTimeHoursAgo', { count: diffH });
  const diffDays = Math.floor(diffH / 24);
  if (diffDays === 1) return t('common.messageTimeYesterday');
  if (diffDays < 7) return t('common.messageTimeDaysAgo', { count: diffDays });
  if (diffDays < 14) return t('common.messageTimeLastWeek');
  if (diffDays < 30) return t('common.messageTimeWeeksAgo', { count: Math.floor(diffDays / 7) });
  return t('common.messageTimeOnDate', { date: formatAbsoluteDateTime(date) });
}
