// Niveaux communautaires (gamification, migration 059) — chaque palier a une
// icône liée à l'île de Ré plutôt que des badges génériques. Les libellés
// viennent de i18n (clés communityLevels.<key>), voir CommunityLevelBadge.tsx.
export interface CommunityLevel {
  key: string;
  emoji: string;
  minPoints: number;
}

export const COMMUNITY_LEVELS: CommunityLevel[] = [
  { key: 'newcomer', emoji: '🌱', minPoints: 0 },
  { key: 'cyclist', emoji: '🚲', minPoints: 10 },
  { key: 'regular', emoji: '🌿', minPoints: 30 },
  { key: 'seasoned', emoji: '⚓', minPoints: 60 },
  { key: 'pillar', emoji: '🌳', minPoints: 100 },
  { key: 'lighthouse', emoji: '🗼', minPoints: 200 },
];

export function getCommunityLevel(totalPoints: number): CommunityLevel {
  let current = COMMUNITY_LEVELS[0];
  for (const level of COMMUNITY_LEVELS) {
    if (totalPoints >= level.minPoints) current = level;
  }
  return current;
}

export function getNextCommunityLevel(totalPoints: number): CommunityLevel | null {
  return COMMUNITY_LEVELS.find(level => level.minPoints > totalPoints) || null;
}

// Actions qui rapportent des points (doit rester en phase avec les triggers
// de la migration 059_gamification.sql) — utilisé pour l'afficher aux
// membres via GamificationInfoModal, clés de libellé gamificationInfo.actions.<reason>.
export interface PointAction {
  reason: string;
  points: number;
  emoji: string;
}

export const POINT_ACTIONS: PointAction[] = [
  { reason: 'activity_created', points: 5, emoji: '📅' },
  { reason: 'activity_first_participant', points: 10, emoji: '🎉' },
  { reason: 'review_received', points: 2, emoji: '🤝' },
  { reason: 'question_answered', points: 1, emoji: '💬' },
  { reason: 'referral_joined', points: 5, emoji: '🌊' },
];
