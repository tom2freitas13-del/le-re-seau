import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { searchAddress, reverseGeocode } from './geocoding';

describe('searchAddress', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('ne fait aucun appel réseau pour une requête trop courte', async () => {
    const result = await searchAddress('ab');
    expect(result).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('retourne les résultats avec des coordonnées valides', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [
          { properties: { label: 'Plage de la Conche, Ars-en-Ré', city: 'Ars-en-Ré' }, geometry: { coordinates: [-1.51, 46.21] } },
        ],
      }),
    });
    const result = await searchAddress('Plage de la Conche');
    expect(result).toEqual([
      { label: 'Plage de la Conche, Ars-en-Ré', latitude: 46.21, longitude: -1.51, city: 'Ars-en-Ré' },
    ]);
  });

  it('filtre les résultats sans coordonnées', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [
          { properties: { label: 'Sans coordonnées' }, geometry: { coordinates: [null, null] } },
        ],
      }),
    });
    const result = await searchAddress('quelque chose');
    expect(result).toEqual([]);
  });

  it('retourne un tableau vide si l\'API répond en erreur', async () => {
    (fetch as any).mockResolvedValue({ ok: false });
    const result = await searchAddress('quelque chose');
    expect(result).toEqual([]);
  });

  it('retourne un tableau vide si le réseau échoue', async () => {
    (fetch as any).mockRejectedValue(new Error('network down'));
    const result = await searchAddress('quelque chose');
    expect(result).toEqual([]);
  });
});

describe('reverseGeocode', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('retourne le label du premier résultat', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ features: [{ properties: { label: 'Le Bois-Plage-en-Ré' } }] }),
    });
    const result = await reverseGeocode(46.18, -1.39);
    expect(result).toBe('Le Bois-Plage-en-Ré');
  });

  it('retourne null si aucun résultat (ex: en pleine mer)', async () => {
    (fetch as any).mockResolvedValue({ ok: true, json: async () => ({ features: [] }) });
    const result = await reverseGeocode(46.5, -2.0);
    expect(result).toBeNull();
  });

  it('retourne null si le réseau échoue', async () => {
    (fetch as any).mockRejectedValue(new Error('network down'));
    const result = await reverseGeocode(46.18, -1.39);
    expect(result).toBeNull();
  });
});
