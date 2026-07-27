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
//
// BUG FIX #2 : un "return 0" précoce dès que MES intérêts étaient vides
// annulait aussi les bonus statut/dispo — un profil qui n'avait pas encore
// rempli ses centres d'intérêt (ou en face) voyait 0% pour absolument tout
// le monde, même avec un statut/une disponibilité identiques. Les bonus
// s'appliquent désormais indépendamment de la présence de centres d'intérêt.
export function computeMatchScore(me: MatchableProfile, other: MatchableProfile): number {
  const myInterests = me.interests || [];
  const otherInterests = other.interests || [];
  let score = 0;
  if (myInterests.length > 0 && otherInterests.length > 0) {
    const mySet = new Set(myInterests);
    const common = otherInterests.filter(i => mySet.has(i)).length;
    const total = Math.max(myInterests.length, otherInterests.length);
    score = Math.round((common / total) * 100);
  }
  if (me.status && other.status === me.status) score = Math.min(score + 5, 100);
  if (me.availability && other.availability === me.availability) score = Math.min(score + 5, 100);
  return Math.min(score, 99);
}
