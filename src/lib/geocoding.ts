// Recherche d'adresse via l'API officielle du gouvernement français (IGN/Géoplateforme).
// Gratuite, sans clé API, pas de limite pour un usage normal.
// Doc : https://data.geopf.fr/geocodage/

export interface GeocodingResult {
  label: string;
  latitude: number;
  longitude: number;
  city: string | null;
}

// On limite la recherche à l'Île de Ré en biaisant les résultats autour de ses
// coordonnées centrales, pour éviter d'avoir des résultats d'ailleurs en France
// pour des noms de lieux ambigus (ex: "La Couarde" pourrait exister ailleurs).
const ILE_DE_RE_LAT = 46.1833;
const ILE_DE_RE_LON = -1.4167;

export async function searchAddress(query: string): Promise<GeocodingResult[]> {
  if (!query || query.trim().length < 3) return [];

  const url = new URL('https://data.geopf.fr/geocodage/search');
  url.searchParams.set('q', query.trim());
  url.searchParams.set('limit', '5');
  url.searchParams.set('lat', String(ILE_DE_RE_LAT));
  url.searchParams.set('lon', String(ILE_DE_RE_LON));

  try {
    const res = await fetch(url.toString());
    if (!res.ok) return [];
    const data = await res.json();
    if (!data?.features) return [];

    return data.features.map((f: any) => ({
      label: f.properties?.label || query,
      latitude: f.geometry?.coordinates?.[1],
      longitude: f.geometry?.coordinates?.[0],
      city: f.properties?.city || null,
    })).filter((r: GeocodingResult) => r.latitude && r.longitude);
  } catch {
    return [];
  }
}
