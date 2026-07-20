export interface MatchableProfile {
  interests: string[] | null;
  status: string | null;
  availability: string | null;
}

// BUG FIX : les centres d'intérêt ne comptaient que pour 70 points max, les 30
// restants venant du statut/dispo — deux profils avec exactement les mêmes
// centres d'intérêt plafonnaient à 70% si leur statut différait. Les intérêts
// sont maintenant le facteur dominant (jusqu'à 100), statut/dispo ne sont plus
// que de petits bonus.
export function computeMatchScore(me: MatchableProfile, other: MatchableProfile): number {
  if (!me.interests?.length) return 0;
  const mySet = new Set(me.interests);
  const common = (other.interests || []).filter(i => mySet.has(i)).length;
  const total = Math.max(me.interests.length, (other.interests || []).length, 1);
  let score = Math.round((common / total) * 100);
  if (me.status && other.status === me.status) score = Math.min(score + 5, 100);
  if (me.availability && other.availability === me.availability) score = Math.min(score + 5, 100);
  return Math.min(score, 99);
}
