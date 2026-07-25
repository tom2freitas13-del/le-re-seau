-- Lacune de modération trouvée dans Admin.tsx : le panneau de signalements
-- n'affichait jamais le contenu réellement signalé (juste le commentaire du
-- signaleur), et pire — pour les messages privés et de groupe, la policy
-- RLS bloque même un admin d'y accéder, puisqu'elle ne vérifie que
-- "auth.uid() = sender_id/receiver_id" ou l'appartenance au groupe, sans
-- exception pour la modération. Un admin ne pouvait donc pas vérifier le
-- contenu d'un message privé signalé entre deux autres membres.
drop policy if exists "On ne voit que ses propres conversations" on public.messages;
create policy "On ne voit que ses propres conversations"
  on public.messages for select
  to authenticated
  using (auth.uid() = sender_id or auth.uid() = receiver_id or public.is_admin_user(auth.uid()));

drop policy if exists "Seuls les membres voient les messages du groupe" on public.chat_group_messages;
create policy "Seuls les membres voient les messages du groupe"
  on public.chat_group_messages for select
  to authenticated
  using (
    public.is_admin_user(auth.uid())
    or exists (
      select 1 from public.chat_group_members m
      where m.group_id = chat_group_messages.group_id and m.user_id = auth.uid()
    )
  );
