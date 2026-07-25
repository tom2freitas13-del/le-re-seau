-- BUG (même famille que le min_age corrigé en 044) : max_participants
-- n'était vérifié que côté client (bouton désactivé une fois le compteur
-- local à jour) — la policy INSERT n'imposait qu'un simple
-- auth.uid() = user_id. Le compteur affiché est un instantané chargé une
-- fois au montage de la page, jamais resynchronisé en temps réel : deux
-- personnes voyant chacune "3/4 places" en même temps pouvaient toutes
-- les deux rejoindre, dépassant la capacité fixée par l'organisateur.
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
    and not exists (
      select 1 from public.activities a
      where a.id = activity_participants.activity_id
        and a.max_participants is not null
        and (select count(*) from public.activity_participants p where p.activity_id = a.id) >= a.max_participants
    )
  );
