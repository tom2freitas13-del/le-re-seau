-- BUG : le "min_age" affiché sur une activité (18+, 16+...) n'était qu'une
-- étiquette décorative — jamais vérifié ni côté client ni côté base.
-- N'importe qui pouvait rejoindre n'importe quelle activité quel que soit
-- son âge réel. Corrigé côté app (Activities.tsx) et ici en défense en
-- profondeur : un profil sans âge renseigné est traité comme insuffisant
-- dès que l'activité impose un minimum (fail-safe plutôt que de laisser
-- passer par défaut).
drop policy if exists "On peut s'inscrire soi-même à une activité" on public.activity_participants;
create policy "On peut s'inscrire soi-même à une activité"
  on public.activity_participants for insert to authenticated
  with check (
    auth.uid() = user_id
    and not exists (
      select 1 from public.activities a
      where a.id = activity_participants.activity_id
        and a.min_age is not null
        and a.min_age > 0
        and coalesce((select age from public.profiles where user_id = auth.uid()), 0) < a.min_age
    )
  );
