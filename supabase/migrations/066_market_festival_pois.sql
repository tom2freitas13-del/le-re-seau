-- Marchés nocturnes et festivals réels de l'île, en réponse à un retour
-- utilisateur : "Activités" n'affichait que les sorties créées par les
-- membres, jamais les incontournables déjà présents sur la carte
-- (points_of_interest) — voir aussi l'ajout de l'onglet "Incontournables"
-- côté client. Infos vérifiées (recherche web, juillet 2026) : La Flotte,
-- Saint-Martin-de-Ré, Rivedoux-Plage, Ars-en-Ré (marchés nocturnes),
-- Musique en Ré, Jazz au Phare, Jazz en Ré (festivals). Dates volontairement
-- formulées en général ("fin juillet", "de juin à septembre") plutôt qu'un
-- jour précis 2026, pour rester globalement juste d'une année sur l'autre.
alter table public.points_of_interest drop constraint if exists points_of_interest_category_check;
alter table public.points_of_interest add constraint points_of_interest_category_check
  check (category in ('plage', 'velo', 'surf', 'apero', 'sport', 'marche', 'festival'));

insert into public.points_of_interest (name, category, description, description_en, address, latitude, longitude, website_url) values
('Marché nocturne de La Flotte', 'marche',
 'Tous les soirs en juillet-août (sauf deux dates), de 19h à 23h sur le Cours Félix Faure : artisanat, produits locaux, mode et décoration au cœur d''un des Plus Beaux Villages de France.',
 'Every evening in July and August (except two dates), from 7pm to 11pm on Cours Félix Faure: crafts, local produce, fashion and homeware in the heart of one of the Most Beautiful Villages of France.',
 'Cours Félix Faure, 17630 La Flotte', 46.1897, -1.32250, null),
('Marché nocturne de Saint-Martin-de-Ré', 'marche',
 'Tous les soirs de juillet, jusqu''à 23h, au Passage de l''Îlot dans la capitale de l''île : artisans et créateurs locaux à deux pas du port et de la citadelle Vauban.',
 'Every evening in July, until 11pm, at Passage de l''Îlot in the island''s capital: local artisans and creators just steps from the harbour and the Vauban citadel.',
 'Passage de l''Îlot, 17410 Saint-Martin-de-Ré', 46.20480, -1.37050, null),
('Marché nocturne de Rivedoux-Plage', 'marche',
 'De juin à septembre, à partir de 19h : premier marché nocturne de l''île en arrivant du pont, ambiance familiale et bords de mer.',
 'From June to September, from 7pm: the island''s first night market as you arrive from the bridge, family-friendly and by the sea.',
 'Avenue de la Plage, 17940 Rivedoux-Plage', 46.15950, -1.27000, null),
('Marché nocturne des créateurs d''Ars-en-Ré', 'marche',
 'Certains mardis soir de l''été, de 18h à 23h, sur la place de l''église (au pied du célèbre clocher noir et blanc) : coin créateurs, artisanat, mode et bijoux fantaisie.',
 'On selected Tuesday evenings in summer, from 6pm to 11pm, on the church square (beneath the famous black-and-white steeple): a creators'' corner with crafts, fashion and costume jewellery.',
 'Place Carnot, 17590 Ars-en-Ré', 46.20750, -1.51400, 'https://www.arsenre.fr/agenda/marche-nocturne-des-createurs/'),
('Festival Musique en Ré', 'festival',
 'Fin juillet-début août : concerts symphoniques dans les églises, musique de chambre et soirées en plein air à travers les villages de l''île, de Saint-Martin-de-Ré à Les Portes-en-Ré.',
 'Late July to early August: symphonic concerts in churches, chamber music and open-air evenings across the island''s villages, from Saint-Martin-de-Ré to Les Portes-en-Ré.',
 'Cours Pasteur, 17410 Saint-Martin-de-Ré', 46.20520, -1.37290, 'https://www.musique-en-re.com/'),
('Jazz au Phare', 'festival',
 'Fin juillet, quatre soirs de jazz, blues, soul et funk au pied du Phare des Baleines — concerts en plein air à la tombée de la nuit, phare illuminé en toile de fond.',
 'Late July, four evenings of jazz, blues, soul and funk at the foot of the Phare des Baleines — open-air concerts at dusk, with the illuminated lighthouse as a backdrop.',
 'Allée du Phare, 17590 Saint-Clément-des-Baleines', 46.24490, -1.55920, 'https://jazzauphare.com/'),
('Jazz en Ré', 'festival',
 'Fin juillet-début août, le temps d''un week-end : concerts gratuits de jazz, swing et blues sur le port de Saint-Martin-de-Ré, capitale animée de l''île.',
 'Late July to early August, over a weekend: free jazz, swing and blues concerts on the port of Saint-Martin-de-Ré, the island''s lively capital.',
 'Quai de la Poithevinière, 17410 Saint-Martin-de-Ré', 46.20510, -1.36960, null);
