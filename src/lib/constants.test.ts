import { describe, it, expect } from 'vitest';
import { avatarFallbackInitial, MIN_AGE, MAX_AGE } from './constants';

describe('avatarFallbackInitial', () => {
  it('retourne la première lettre en majuscule', () => {
    expect(avatarFallbackInitial('thomas')).toBe('T');
  });

  it('ignore les espaces de début', () => {
    expect(avatarFallbackInitial('  Camille')).toBe('C');
  });

  it('retourne "?" si le nom est vide, null ou undefined', () => {
    expect(avatarFallbackInitial('')).toBe('?');
    expect(avatarFallbackInitial(null)).toBe('?');
    expect(avatarFallbackInitial(undefined)).toBe('?');
    expect(avatarFallbackInitial('   ')).toBe('?');
  });
});

describe('MIN_AGE / MAX_AGE', () => {
  // Ces valeurs doivent rester cohérentes avec la contrainte SQL sur
  // profiles.age et avec le texte des CGU — un décalage ici est un vrai
  // risque (mineur non protégé, ou inscription bloquée à tort).
  it('MIN_AGE est un nombre positif raisonnable', () => {
    expect(MIN_AGE).toBeGreaterThanOrEqual(13);
    expect(MIN_AGE).toBeLessThan(MAX_AGE);
  });
});
