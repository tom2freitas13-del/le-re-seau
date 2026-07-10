-- Permet aux admins de supprimer n'importe quelle activité (modération),
-- en plus de l'auteur qui pouvait déjà supprimer la sienne.

drop policy if exists "L'auteur peut supprimer son activité" on public.activities;
drop policy if exists "Les admins peuvent supprimer n'importe quelle activité" on public.activities;

create policy "L'auteur ou un admin peut supprimer une activité"
  on public.activities for delete to authenticated
  using (
    auth.uid() = author_id
    or exists (select 1 from public.profiles where user_id = auth.uid() and is_admin = true)
  );
