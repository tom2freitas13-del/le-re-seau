-- Le toast "+X points" (useGlobalPointsNotifications, App.tsx) écoute les
-- inserts sur user_points_ledger via Realtime, mais la table n'avait jamais
-- été ajoutée à la publication supabase_realtime (comme messages,
-- chat_group_messages, salon_messages en 001_init.sql) — sans ça, aucun
-- événement postgres_changes n'est jamais diffusé, le toast ne se déclenche donc jamais.
alter publication supabase_realtime add table public.user_points_ledger;
