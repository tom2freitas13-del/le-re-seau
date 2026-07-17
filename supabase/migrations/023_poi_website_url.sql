-- Lien vers le site officiel de l'établissement, quand il existe (sinon on
-- laisse l'utilisateur chercher lui-même via un lien Google généré côté app).
alter table public.points_of_interest add column if not exists website_url text;

update public.points_of_interest set website_url = 'https://lapergola-iledere.com/' where name = 'La Pergola';
update public.points_of_interest set website_url = 'https://www.lebastioniledere.com/' where name = 'Le Bastion';
update public.points_of_interest set website_url = 'https://lajavadesbaleines.fr/' where name = 'La Java des Baleines';
update public.points_of_interest set website_url = 'https://retennisclub.fr/' where name = 'Ré Tennis Club';
update public.points_of_interest set website_url = 'https://www.tennisiledere.fr/clubs/la-couarde-mer/' where name = 'Tennis des Pertuis';
update public.points_of_interest set website_url = 'https://www.saint-martin-de-re.fr/service/complexe-sportif-marcel-gaillard/' where name = 'Complexe Marcel Gaillard';
update public.points_of_interest set website_url = 'https://www.iledere.com/organiser-activites-et-loisirs/sport-et-sensation/ecoles-clubs-associations/city-stade-dars-en-re-ars-en-re-fr-3682167/' where name = 'City-Stade d''Ars-en-Ré';
