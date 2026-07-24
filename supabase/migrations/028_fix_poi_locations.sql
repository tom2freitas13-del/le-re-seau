-- Corrige des points d'intérêt mal placés sur la carte (adresse/coordonnées
-- vérifiées auprès de l'office de tourisme de l'Île de Ré et d'OpenStreetMap).

-- Les Grenettes : code postal incohérent (17580 correspond au Bois-Plage,
-- pas à Sainte-Marie-de-Ré qui est en 17740). Coordonnées déjà correctes,
-- légèrement affinées.
update public.points_of_interest
set address = 'Les Grenettes, 17740 Sainte-Marie-de-Ré', latitude = 46.162291, longitude = -1.363410
where name = 'Les Grenettes';

-- Petit Bec & Diamond Head : pin à ~3 km du vrai spot, en zone inhabitée.
-- Le spot réel est sur la côte à la Pointe du Lizay, Les Portes-en-Ré.
update public.points_of_interest
set address = 'Route du Petit Bec, 17880 Les Portes-en-Ré', latitude = 46.252440, longitude = -1.523045
where name = 'Petit Bec & Diamond Head';

-- Plage du Lizay : pin à ~2,4 km de la vraie plage, dans la mauvaise commune
-- (Saint-Clément-des-Baleines au lieu de Les Portes-en-Ré).
update public.points_of_interest
set address = 'Route du Lizay, 17880 Les Portes-en-Ré', latitude = 46.256333, longitude = -1.517441
where name = 'Plage du Lizay';

-- City-Stade d'Ars-en-Ré : décalé d'environ 750 m, mauvaise rue.
update public.points_of_interest
set address = 'Quai de la Criée, 17590 Ars-en-Ré', latitude = 46.213313, longitude = -1.509527
where name = 'City-Stade d''Ars-en-Ré';
