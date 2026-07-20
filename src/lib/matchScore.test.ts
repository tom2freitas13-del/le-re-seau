import { describe, it, expect } from 'vitest';
import { computeMatchScore } from './matchScore';

describe('computeMatchScore', () => {
  it('donne 0 si je n\'ai aucun centre d\'intérêt', () => {
    const me = { interests: [], status: null, availability: null };
    const other = { interests: ['plage', 'surf'], status: null, availability: null };
    expect(computeMatchScore(me, other)).toBe(0);
  });

  it('donne 0 si aucun intérêt en commun', () => {
    const me = { interests: ['plage'], status: null, availability: null };
    const other = { interests: ['tennis'], status: null, availability: null };
    expect(computeMatchScore(me, other)).toBe(0);
  });

  // Régression du bug corrigé : mêmes centres d'intérêt mais statut différent
  // ne doit plus plafonner à 70%.
  it('donne 99 (quasi 100) pour les mêmes centres d\'intérêt, même avec un statut différent', () => {
    const interests = ['plage', 'vélo', 'surf', 'apéro', 'bateau'];
    const me = { interests, status: 'resident', availability: 'year' };
    const other = { interests: [...interests], status: 'vacation', availability: null };
    expect(computeMatchScore(me, other)).toBe(99);
  });

  it('ajoute un bonus quand le statut correspond aussi', () => {
    const me = { interests: ['plage', 'surf'], status: 'resident', availability: null };
    const otherSameStatus = { interests: ['plage'], status: 'resident', availability: null };
    const otherDifferentStatus = { interests: ['plage'], status: 'vacation', availability: null };
    expect(computeMatchScore(me, otherSameStatus)).toBeGreaterThan(computeMatchScore(me, otherDifferentStatus));
  });

  it('ne dépasse jamais 99', () => {
    const interests = ['plage', 'surf'];
    const me = { interests, status: 'resident', availability: 'year' };
    const other = { interests, status: 'resident', availability: 'year' };
    expect(computeMatchScore(me, other)).toBeLessThanOrEqual(99);
  });

  it('gère un profil sans intérêts en face', () => {
    const me = { interests: ['plage'], status: null, availability: null };
    const other = { interests: null, status: null, availability: null };
    expect(computeMatchScore(me, other)).toBe(0);
  });
});
