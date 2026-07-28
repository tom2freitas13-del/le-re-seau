// Données (pas de texte affiché) pour les pages publiques SEO par commune —
// un slug par ville de ILE_DE_RE_CITIES (src/lib/constants.ts). Les noms de
// villages restent identiques en français et en anglais (noms propres, pas
// de traduction officielle) — seuls le slogan et la description passent par
// i18next (clés cityVillages.<slug>.tagline/.description, voir CityPage.tsx),
// pour que la bascule de langue les traduise comme le reste de l'appli.
export interface CityContent {
  slug: string;
  name: string;
  emoji: string;
}

export const CITY_CONTENT: CityContent[] = [
  { slug: 'rivedoux-plage', name: 'Rivedoux-Plage', emoji: '🌉' },
  { slug: 'la-flotte', name: 'La Flotte', emoji: '⛵' },
  { slug: 'sainte-marie-de-re', name: 'Sainte-Marie-de-Ré', emoji: '🍇' },
  { slug: 'saint-martin-de-re', name: 'Saint-Martin-de-Ré', emoji: '🏰' },
  { slug: 'le-bois-plage-en-re', name: 'Le Bois-Plage-en-Ré', emoji: '🏖️' },
  { slug: 'la-couarde-sur-mer', name: 'La Couarde-sur-Mer', emoji: '🎉' },
  { slug: 'ars-en-re', name: 'Ars-en-Ré', emoji: '⚫' },
  { slug: 'loix', name: 'Loix', emoji: '🦪' },
  { slug: 'les-portes-en-re', name: 'Les Portes-en-Ré', emoji: '🌲' },
  { slug: 'saint-clement-des-baleines', name: 'Saint-Clément-des-Baleines', emoji: '🗼' },
];

export function findCityBySlug(slug: string): CityContent | undefined {
  return CITY_CONTENT.find(c => c.slug === slug);
}
