-- "Pointe de Grignon" était enregistré avec l'adresse et les coordonnées
-- d'un lieu-dit du Bois-Plage-en-Ré, en pleine forêt. Le vrai spot de
-- surf de la Pointe de Grignon se trouve au sud-ouest d'Ars-en-Ré
-- (source : office de tourisme de l'Île de Ré).
update public.points_of_interest
set address = 'Route de la Pointe de Grignon, 17590 Ars-en-Ré', latitude = 46.202271, longitude = -1.530801
where name = 'Pointe de Grignon';
