-- Préférence de langue du visiteur (fr/en), pour que le choix fait dans
-- les réglages du profil suive le compte d'un appareil à l'autre.
-- Les visiteurs non connectés gardent leur préférence en localStorage
-- uniquement (pas de ligne profile à mettre à jour).

alter table public.profiles add column if not exists language text not null default 'fr'
  check (language in ('fr', 'en'));
