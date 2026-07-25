-- BUG : contrairement à messages (1:1) et salon_messages, chat_group_messages
-- n'avait aucune policy DELETE — personne ne pouvait supprimer un message de
-- groupe, même le sien. Ajouté à l'occasion de la suppression par appui
-- long dans les 3 discussions (privé, groupe, salon).
create policy "On peut supprimer ses propres messages de groupe"
  on public.chat_group_messages for delete to authenticated
  using (auth.uid() = sender_id);

-- Cohérent avec la modération déjà en place sur salon_messages/forum_posts/
-- job_offers... : un admin peut aussi supprimer n'importe quel message de
-- groupe.
create policy "Les admins peuvent supprimer n'importe quel message de groupe"
  on public.chat_group_messages for delete to authenticated
  using (public.is_admin_user(auth.uid()));
