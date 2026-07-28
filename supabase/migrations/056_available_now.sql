-- Statut éphémère "Disponible maintenant" (2h) : contrairement à
-- availability (weekend/semaine/été/année, une préférence durable), ça sert
-- à signaler "là, tout de suite, je suis dispo pour un café/surf/discuter" —
-- pas besoin de RLS particulière, c'est son propre profil, déjà couvert par
-- la policy UPDATE existante (et hors des colonnes protégées par 052, qui ne
-- concerne que is_admin/is_banned/is_pro).
alter table public.profiles add column if not exists available_now_until timestamptz;
