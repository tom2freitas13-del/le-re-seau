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
