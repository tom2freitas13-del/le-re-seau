// Contenu réel (pas de placeholder) pour les pages publiques SEO par
// commune — un slug par ville de ILE_DE_RE_CITIES (src/lib/constants.ts).
// Descriptions courtes et factuelles, basées sur des éléments connus et
// vérifiables de chaque village, pas du remplissage marketing.
export interface CityContent {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  emoji: string;
}

export const CITY_CONTENT: CityContent[] = [
  {
    slug: 'rivedoux-plage',
    name: 'Rivedoux-Plage',
    tagline: "La porte d'entrée de l'île",
    description: "Premier village en arrivant par le pont, Rivedoux-Plage est une commune familiale avec ses plages de sable fin, son casino et sa proximité immédiate avec le continent — l'endroit idéal pour découvrir l'île sans s'enfoncer trop loin.",
    emoji: '🌉',
  },
  {
    slug: 'la-flotte',
    name: 'La Flotte',
    tagline: 'Un des Plus Beaux Villages de France',
    description: 'Port de pêche pittoresque classé parmi Les Plus Beaux Villages de France, La Flotte séduit avec ses ruelles à arcades, son marché couvert réputé et son quai animé bordé de restaurants.',
    emoji: '⛵',
  },
  {
    slug: 'sainte-marie-de-re',
    name: 'Sainte-Marie-de-Ré',
    tagline: 'Plages et vignoble',
    description: "Entre La Flotte et Le Bois-Plage, Sainte-Marie-de-Ré offre une longue plage de sable fin (Les Grenettes, spot de surf accessible aux débutants) et s'étend sur une partie du vignoble de l'île.",
    emoji: '🍇',
  },
  {
    slug: 'saint-martin-de-re',
    name: 'Saint-Martin-de-Ré',
    tagline: "La capitale historique de l'île",
    description: "Chef-lieu de l'île, Saint-Martin-de-Ré est connue pour sa citadelle Vauban classée au patrimoine mondial de l'UNESCO et son port fortifié, aujourd'hui animé de restaurants, bars et boutiques.",
    emoji: '🏰',
  },
  {
    slug: 'le-bois-plage-en-re',
    name: 'Le Bois-Plage-en-Ré',
    tagline: "Le plus grand village de l'île",
    description: "Village le plus peuplé de l'île, Le Bois-Plage-en-Ré combine de longues plages (Les Gollandières), un marché animé et une partie du vignoble local — un bon équilibre entre vie de village et farniente.",
    emoji: '🏖️',
  },
  {
    slug: 'la-couarde-sur-mer',
    name: 'La Couarde-sur-Mer',
    tagline: 'Ambiance jeune et festive',
    description: "Réputée pour son ambiance estivale animée, La Couarde-sur-Mer attire une clientèle plutôt jeune avec ses dunes, sa plage du Peu Ragot et La Pergola, discothèque historique de l'île ouverte depuis 1936.",
    emoji: '🎉',
  },
  {
    slug: 'ars-en-re',
    name: 'Ars-en-Ré',
    tagline: 'Le clocher noir et blanc, repère des marins',
    description: "Reconnaissable à son clocher peint en noir et blanc (un amer historique pour les marins), Ars-en-Ré est entourée des marais salants du Fier d'Ars et de la réserve naturelle de Lilleau des Niges, un paradis pour les oiseaux et les balades à vélo.",
    emoji: '⚫',
  },
  {
    slug: 'loix',
    name: 'Loix',
    tagline: "Le plus petit village, entre marais et huîtres",
    description: "Presqu'île à l'écart de l'agitation touristique, Loix est le plus petit village de l'île, entouré de marais salants et de parcs à huîtres — une étape authentique pour qui cherche du calme.",
    emoji: '🦪',
  },
  {
    slug: 'les-portes-en-re',
    name: 'Les Portes-en-Ré',
    tagline: "La nature sauvage du nord de l'île",
    description: "Village le plus au nord de l'île, Les Portes-en-Ré séduit par sa nature préservée — forêt de pins, dunes, et la plage de Trousse-Chemise, rendue célèbre par la chanson de Charles Aznavour.",
    emoji: '🌲',
  },
  {
    slug: 'saint-clement-des-baleines',
    name: 'Saint-Clément-des-Baleines',
    tagline: "La pointe de l'île et son phare emblématique",
    description: "À l'extrémité nord-ouest de l'île, Saint-Clément-des-Baleines abrite le célèbre Phare des Baleines et la Conche des Baleines, l'une des plus belles plages de l'île avec ses couchers de soleil réputés.",
    emoji: '🗼',
  },
];

export function findCityBySlug(slug: string): CityContent | undefined {
  return CITY_CONTENT.find(c => c.slug === slug);
}
