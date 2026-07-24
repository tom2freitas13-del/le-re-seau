-- Troisième et dernière passe : la migration précédente (030) utilisait le
-- centre de la bounding box des plages OpenStreetMap, qui tombe hors du
-- polygone réel pour une côte courbe (ex: Conche des Baleines atterrissait
-- en pleine mer). Cette fois les coordonnées viennent d'un vrai calcul de
-- centroïde de polygone (ou, si le centroïde tombait hors forme, du sommet
-- du contour le plus proche), vérifié par test point-dans-polygone.
--
-- Ajoute aussi Plage de Gouillaud et Sous le Phare des Baleines, repérés
-- par l'utilisateur comme étant en pleine forêt / sur le parking au lieu
-- d'être sur le sable.

update public.points_of_interest set latitude = 46.245470, longitude = -1.538490 where name = 'Conche des Baleines';
update public.points_of_interest set latitude = 46.235222, longitude = -1.475562 where name = 'Trousse-Chemise';
update public.points_of_interest set latitude = 46.256847, longitude = -1.516243 where name = 'Plage du Lizay';
update public.points_of_interest set latitude = 46.180196, longitude = -1.402586 where name = 'Les Gollandières';
update public.points_of_interest set latitude = 46.204271, longitude = -1.535704 where name = 'Pointe de Grignon';
update public.points_of_interest set latitude = 46.167915, longitude = -1.371565 where name = 'Plage de Gouillaud';
update public.points_of_interest set latitude = 46.244906, longitude = -1.559249 where name = 'Sous le Phare des Baleines';
