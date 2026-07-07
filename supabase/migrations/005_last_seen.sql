-- "Vu à HH:mm" quand un membre n'est pas en ligne — le statut "en ligne
-- maintenant" lui-même est géré en mémoire via Supabase Realtime Presence,
-- il n'a pas besoin de colonne.
alter table public.profiles add column if not exists last_seen timestamptz;
