-- Location de matériel nautique (TEX', La Flotte) demandée en retour
-- utilisateur — réutilise la catégorie 'bateau' déjà existante côté
-- activités (ACTIVITY_CATEGORIES, clé i18n activityCategories.bateau ⛵),
-- ajoutée ici aux points_of_interest. Infos vérifiées par recherche web.
alter table public.points_of_interest drop constraint if exists points_of_interest_category_check;
alter table public.points_of_interest add constraint points_of_interest_category_check
  check (category in ('plage', 'velo', 'surf', 'apero', 'sport', 'marche', 'festival', 'bateau'));

insert into public.points_of_interest (name, category, description, description_en, address, latitude, longitude) values
('TEX'' équipements', 'bateau',
 'Location de bateaux avec ou sans permis au départ de La Flotte, mais aussi canoë, paddle et bouée tractée : de quoi explorer les environs du Fort Boyard et les plages de l''île à son rythme.',
 'Boat rental with or without a licence departing from La Flotte, plus canoe, paddleboard and towable rides: explore the waters around Fort Boyard and the island''s beaches at your own pace.',
 'Port de La Flotte, 17630 La Flotte', 46.18880, -1.32350);
