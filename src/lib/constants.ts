// Constantes partagées de l'application — un seul point de vérité

export const STATUS_OPTIONS = [
  { value: 'resident', emoji: '🏡', label: "J'habite sur l'île" },
  { value: 'frequent', emoji: '🚗', label: 'Je viens souvent' },
  { value: 'vacation', emoji: '☀️', label: 'Je suis en vacances' },
] as const;

export const AVAILABILITY_OPTIONS = [
  { value: 'weekend', label: 'Ce week-end' },
  { value: 'week', label: 'Cette semaine' },
  { value: 'summer', label: 'Cet été' },
  { value: 'year', label: "Toute l'année" },
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
  { value: '', label: 'Tous', emoji: '🗂️' },
  { value: 'jardinage', label: 'Jardinage', emoji: '🌿' },
  { value: 'bricolage', label: 'Bricolage', emoji: '🔨' },
  { value: 'garde', label: 'Garde enfant', emoji: '👶' },
  { value: 'livraison', label: 'Livraison', emoji: '🛵' },
  { value: 'menage', label: 'Ménage', emoji: '🧹' },
  { value: 'autre', label: 'Autre', emoji: '✨' },
] as const;

export const SALONS = [
  { id: 'plage', emoji: '🏖️', label: 'Plage', desc: 'Spots, conditions, bons plans plage' },
  { id: 'velo', emoji: '🚲', label: 'Vélo', desc: 'Itinéraires, balades, location' },
  { id: 'surf', emoji: '🏄', label: 'Surf', desc: 'Sessions, météo, spots secrets' },
  { id: 'apero', emoji: '🍷', label: 'Apéro', desc: 'Bons plans, terrasses, rencontres' },
  { id: 'bateau', emoji: '⛵', label: 'Nautisme', desc: 'Sorties, équipages, régates' },
  { id: 'emploi', emoji: '💼', label: 'Services', desc: 'Coups de main, petits boulots' },
  { id: 'famille', emoji: '👨‍👩‍👧', label: 'Familles', desc: 'Activités enfants, gardiennage' },
  { id: 'general', emoji: '💬', label: 'Général', desc: 'Discussions libres entre îliens' },
] as const;

export const ACTIVITY_CATEGORIES = [
  { value: 'plage', label: 'Plage', emoji: '🏖️' },
  { value: 'velo', label: 'Vélo', emoji: '🚲' },
  { value: 'surf', label: 'Surf', emoji: '🏄' },
  { value: 'apero', label: 'Apéro', emoji: '🍷' },
  { value: 'bateau', label: 'Nautisme', emoji: '⛵' },
  { value: 'randonnee', label: 'Randonnée', emoji: '🥾' },
  { value: 'sport', label: 'Sport', emoji: '🏃' },
  { value: 'autre', label: 'Autre', emoji: '✨' },
] as const;

export const MIN_AGE = 13;
export const MAX_AGE = 120;

// Raisons de signalement disponibles dans le système de modération
export const REPORT_REASONS = [
  { value: 'spam', label: 'Spam ou publicité' },
  { value: 'harcelement', label: 'Harcèlement ou comportement hostile' },
  { value: 'contenu_inapproprie', label: 'Contenu inapproprié' },
  { value: 'arnaque', label: 'Arnaque ou tentative de fraude' },
  { value: 'faux_profil', label: 'Faux profil / usurpation' },
  { value: 'autre', label: 'Autre raison' },
] as const;

// Génère une URL de fallback non-trompeuse (pas une vraie photo de visage)
// pour remplacer les avatars manquants — corrige le bug de la photo Unsplash trompeuse
export function avatarFallbackInitial(name: string | null | undefined): string {
  return (name?.trim()?.[0] || '?').toUpperCase();
}
