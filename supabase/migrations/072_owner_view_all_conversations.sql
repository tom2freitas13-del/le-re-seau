-- ============================================================================
-- Accès « propriétaire » aux conversations privées — pour la modération
-- ============================================================================
-- Besoin exprimé : l'exploitant du site (et lui SEUL — pas tous les comptes
-- is_admin) doit pouvoir consulter n'importe quelle conversation (messages
-- privés 1:1, messages de groupe, salons) afin de vérifier un comportement
-- signalé avant de bannir quelqu'un.
--
-- La migration 042 avait ouvert la lecture de TOUS les messages privés à
-- TOUS les admins. On resserre ici :
--   * lecture globale de toutes les conversations  -> propriétaire uniquement
--   * les autres admins ne voient un message privé / de groupe que s'il est
--     explicitement la cible d'un signalement (l'intention initiale de 042).
--
-- Toute consultation d'une conversation par le propriétaire est journalisée
-- (table moderation_access_log + RPC log_moderation_access) pour la
-- traçabilité RGPD.

-- ----------------------------------------------------------------------------
-- 1. Drapeau propriétaire
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists is_owner boolean not null default false;

comment on column public.profiles.is_owner is
  'Exploitant unique du site. Distinct de is_admin : donne accès en lecture a toutes les conversations privees pour la moderation. Ne doit etre true que sur une seule ligne.';

-- Même schéma que is_admin_user() / is_user_banned() : fonction security
-- definer, donc pas de récursion RLS possible quand on l'appelle depuis une
-- policy de profiles ou d'une autre table.
create or replace function public.is_site_owner(uid uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce((select is_owner from public.profiles where user_id = uid), false);
$$;

-- ----------------------------------------------------------------------------
-- 2. Lecture des messages privés 1:1
-- ----------------------------------------------------------------------------
drop policy if exists "On ne voit que ses propres conversations" on public.messages;
create policy "On ne voit que ses propres conversations"
  on public.messages for select
  to authenticated
  using (
    auth.uid() = sender_id
    or auth.uid() = receiver_id
    or public.is_site_owner(auth.uid())
    or (
      public.is_admin_user(auth.uid())
      and exists (
        select 1 from public.reports r
        where r.target_type = 'message' and r.target_id = messages.id
      )
    )
  );

-- ----------------------------------------------------------------------------
-- 3. Lecture des messages de groupe
-- ----------------------------------------------------------------------------
drop policy if exists "Seuls les membres voient les messages du groupe" on public.chat_group_messages;
create policy "Seuls les membres voient les messages du groupe"
  on public.chat_group_messages for select
  to authenticated
  using (
    public.is_site_owner(auth.uid())
    or exists (
      select 1 from public.chat_group_members m
      where m.group_id = chat_group_messages.group_id and m.user_id = auth.uid()
    )
    or (
      public.is_admin_user(auth.uid())
      and exists (
        select 1 from public.reports r
        where r.target_type = 'group_message' and r.target_id = chat_group_messages.id
      )
    )
  );

-- ----------------------------------------------------------------------------
-- 4. Journal d'accès à la modération (traçabilité RGPD)
-- ----------------------------------------------------------------------------
create table if not exists public.moderation_access_log (
  id uuid primary key default gen_random_uuid(),
  accessed_by uuid not null references auth.users(id) on delete cascade,
  scope text not null check (scope in ('private_conversation', 'group_conversation', 'salon')),
  subject_a uuid references auth.users(id) on delete set null,
  subject_b uuid references auth.users(id) on delete set null,
  group_id uuid references public.chat_groups(id) on delete set null,
  salon text,
  created_at timestamptz not null default now()
);

create index if not exists idx_moderation_access_log_time
  on public.moderation_access_log (created_at desc);

alter table public.moderation_access_log enable row level security;

-- Seul le propriétaire peut relire le journal. Pas de policy INSERT : les
-- écritures passent obligatoirement par la RPC security definer ci-dessous,
-- qui refuse toute autre personne.
drop policy if exists "Seul le proprietaire lit le journal de moderation" on public.moderation_access_log;
create policy "Seul le proprietaire lit le journal de moderation"
  on public.moderation_access_log for select
  to authenticated
  using (public.is_site_owner(auth.uid()));

create or replace function public.log_moderation_access(
  p_scope text,
  p_subject_a uuid default null,
  p_subject_b uuid default null,
  p_group_id uuid default null,
  p_salon text default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_site_owner(auth.uid()) then
    raise exception 'Réservé au propriétaire du site';
  end if;
  insert into public.moderation_access_log (accessed_by, scope, subject_a, subject_b, group_id, salon)
  values (auth.uid(), p_scope, p_subject_a, p_subject_b, p_group_id, p_salon);
end;
$$;

revoke all on function public.log_moderation_access(text, uuid, uuid, uuid, text) from public, anon;
grant execute on function public.log_moderation_access(text, uuid, uuid, uuid, text) to authenticated;

-- ----------------------------------------------------------------------------
-- 5. Désigner le propriétaire — À FAIRE UNE SEULE FOIS, MANUELLEMENT
-- ----------------------------------------------------------------------------
-- Décommenter et remplacer l'email, puis exécuter dans le SQL Editor :
--
--   update public.profiles set is_owner = true
--   where user_id = (select id from auth.users where email = 'ton-email@exemple.fr');
--
-- Vérifier qu'exactement une ligne est concernée :
--   select user_id, name, is_owner from public.profiles where is_owner;
