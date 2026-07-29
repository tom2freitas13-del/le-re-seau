-- Traduction anglaise des descriptions de points d'intérêt (jusqu'ici du
-- texte français brut, sans i18n, contrairement au reste de l'appli) —
-- affichées sur les pages villes, la carte et la fiche POI. Colonne
-- nullable avec repli sur `description` (FR) si jamais un futur POI n'a pas
-- encore sa traduction.
alter table public.points_of_interest add column if not exists description_en text;

update public.points_of_interest set description_en = 'On the port of Saint-Martin, an eclectic musical vibe, two terraces and an indoor patio for cocktails, wines and craft beers.' where id = 'b55c7fa9-1b02-4373-bd54-f9032fc81b52';
update public.points_of_interest set description_en = 'A seasonal community-run open-air bar (late May to late August): bar, dance floor, concerts and food trucks under a marquee, a different program every evening.' where id = '27909ebd-6917-4206-9d85-271c2ca24dd8';
update public.points_of_interest set description_en = 'THE island''s historic nightclub, open since 1936. An unmissable bar-restaurant-club, retro 80s vibe mixed with current sounds, themed nights in summer.' where id = '8fca9a8f-c2c6-4651-b21d-bba44de9f345';
update public.points_of_interest set description_en = 'Perched atop the Vauban citadel (a UNESCO World Heritage site), with a stunning ocean view. Restaurant-bar by day, club from 11pm with a DJ on weekends.' where id = '3963ef73-27d5-4840-b2f1-fa5ca4ca0a6b';
update public.points_of_interest set description_en = 'A new concept that took over from the bar "Le 120", a fixture in the north of the island known for its concerts and friendly atmosphere.' where id = 'c755454d-e895-4adf-8a16-d4d2c947b07f';
update public.points_of_interest set description_en = 'A laid-back beach bar right on the sand, holiday vibes all day long.' where id = 'f5e134d5-79a4-4ada-aaac-2ad144b17ffb';
update public.points_of_interest set description_en = 'Considered by connoisseurs to be the island''s most beautiful beach: 3km of fine sand and one of the coast''s finest sunsets.' where id = '54f444d5-4faa-4e36-b286-263899b3597d';
update public.points_of_interest set description_en = 'One of the island''s busiest beaches, a wide stretch of fine sand facing due south, with lifeguard supervision in season.' where id = 'f2452693-bcde-4ad2-a95d-a998de4bce2f';
update public.points_of_interest set description_en = 'A wild beach lined with dunes, popular with surfers, walkers and families looking for peace and quiet.' where id = '62bd434c-6f11-4137-a19d-0eecb625f37b';
update public.points_of_interest set description_en = 'A legendary beach made famous by Charles Aznavour''s song, reachable on foot through the forest, in an unspoiled natural setting.' where id = 'e59aace5-1437-49f1-baf5-3360f67d84ba';
update public.points_of_interest set description_en = 'A free-access football and basketball pitch with a running track around it, near the harbour.' where id = '551fec7e-c7ad-4445-9770-16496f3c5aff';
update public.points_of_interest set description_en = 'The island''s main sports complex: an official football pitch with stands, an athletics track and a multi-sport gymnasium.' where id = '94debead-812f-4231-a6ab-6d5e38be9b33';
update public.points_of_interest set description_en = '7 outdoor courts and 2 indoor courts (usable year-round), plus 2 floodlit padel courts.' where id = '89bcab89-94ba-490d-b8e9-c5c21a6b076f';
update public.points_of_interest set description_en = '7 tennis courts, 3 padel courts and 1 pickleball court, just steps from La Couarde beach.' where id = '6c2cbd4f-41aa-46c0-804c-7d5c31a5c00c';
update public.points_of_interest set description_en = 'The island''s most accessible and well-known spot, fairly gentle waves over a rocky reef bottom. Great for beginners, but very crowded in summer.' where id = 'c7ce71cc-5fe8-47f3-b756-6143e2f731f2';
update public.points_of_interest set description_en = 'Surrounded by pine forests, away from the tourist crowds. Powerful, fast waves that can reach 3 metres, for experienced surfers only.' where id = 'bf81f631-1cf4-4f0b-b395-01a33467d96c';
update public.points_of_interest set description_en = 'A spot favoured by locals, with good-quality but not very powerful waves year-round. Only rideable at high tide.' where id = 'f611f3a9-6476-42e3-ae19-e4848dcf80de';
update public.points_of_interest set description_en = 'Fully exposed to the swell with no shelter at all, considered one of the island''s best spots, popular with experienced surfers.' where id = '205c071a-e95d-4416-8848-11844b4acd59';
update public.points_of_interest set description_en = 'At the island''s north-western tip, this spot takes the swell head-on: powerful, hollow waves, especially during autumn or winter swells.' where id = 'e9a9a5b6-4e3c-4563-954a-c3de62200660';
update public.points_of_interest set description_en = 'A gentle coastal route with views over the Pertuis Breton strait. La Flotte is ranked among the Most Beautiful Villages of France.' where id = '69eed7fc-f44e-4409-8f26-6b8deb745887';
update public.points_of_interest set description_en = 'A route through the heart of the salt marshes, with some paths reserved for bikes. Ars-en-Ré, Loix and La Couarde are the best starting points.' where id = '90fa7659-321d-423a-a819-fdd18c5a69f6';
update public.points_of_interest set description_en = 'Heading to the island''s northernmost tip to reach the iconic Phare des Baleines lighthouse.' where id = '17116675-d324-454e-a0c7-a0e4b33766db';
update public.points_of_interest set description_en = '82km through the island''s 10 villages, doable in a single day for experienced cyclists or over two days as a family. Starting from the bridge is recommended.' where id = 'a7271465-0dae-4abb-a9d5-1c438f12dc83';
