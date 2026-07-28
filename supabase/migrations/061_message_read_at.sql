-- Horodatage de lecture des messages privés, pour afficher "Vu il y a ..."
-- sous le dernier message lu (façon Instagram), en plus du système de
-- coches déjà en place qui ne portait qu'un booléen sans horodatage.
alter table public.messages add column if not exists read_at timestamptz;
