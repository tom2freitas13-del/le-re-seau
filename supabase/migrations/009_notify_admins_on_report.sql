-- La table "reports" (signalements) existe en production depuis le début du
-- projet mais n'avait jamais été créée par une migration committée : 009
-- (ce fichier) et 032 la supposaient déjà présente, et son schéma réel n'a
-- été capturé qu'en 050. Résultat : impossible de rejouer 001→… sur une base
-- neuve (échec ici, à la création du trigger).
--
-- Correctif §1 : on (re)crée la table AVANT le trigger, de façon idempotente
-- (`create table if not exists` + `drop policy if exists`). Sur la prod, où
-- tout existe déjà, ces instructions ne changent rien. 050 reste la
-- description complète et fait la même (re)déclaration idempotente.
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in (
    'profile', 'message', 'group_message', 'salon_message',
    'forum_post', 'forum_comment', 'job_offer', 'job_request', 'activity',
    'feed_post', 'feed_comment'
  )),
  target_id uuid not null,
  target_user_id uuid references auth.users(id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id)
);

alter table public.reports enable row level security;

drop policy if exists "On peut signaler en son propre nom" on public.reports;
create policy "On peut signaler en son propre nom"
  on public.reports for insert to authenticated
  with check (auth.uid() = reporter_id);

drop policy if exists "On voit ses propres signalements envoyés" on public.reports;
create policy "On voit ses propres signalements envoyés"
  on public.reports for select to authenticated
  using (auth.uid() = reporter_id);

drop policy if exists "Les admins voient tous les signalements" on public.reports;
create policy "Les admins voient tous les signalements"
  on public.reports for select to authenticated
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true));

drop policy if exists "Les admins peuvent traiter les signalements" on public.reports;
create policy "Les admins peuvent traiter les signalements"
  on public.reports for update to authenticated
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.is_admin = true));

-- ----------------------------------------------------------------------------
-- Notifie tous les admins (push) dès qu'un nouveau signalement est créé,
-- en réutilisant l'Edge Function send-push déjà en place pour les messages
-- (même secret partagé stocké dans Vault, voir migration 004).
create or replace function public.notify_admins_new_report()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  admin_row record;
  shared_secret text;
begin
  select decrypted_secret into shared_secret from vault.decrypted_secrets where name = 'webhook_secret';
  for admin_row in select user_id from public.profiles where is_admin = true loop
    perform net.http_post(
      url := 'https://bsfrshupdimoumvqyamx.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-webhook-secret', shared_secret
      ),
      body := jsonb_build_object(
        'receiver_id', admin_row.user_id,
        'title', '🚩 Nouveau signalement',
        'body', 'Motif : ' || new.reason,
        'url', '/admin'
      )
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists on_report_created_notify on public.reports;
create trigger on_report_created_notify
  after insert on public.reports
  for each row execute procedure public.notify_admins_new_report();
