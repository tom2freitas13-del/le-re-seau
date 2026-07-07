-- Table manquante référencée par src/lib/push-notifications.ts : sans elle,
-- l'abonnement aux notifications push échoue silencieusement à chaque tentative.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_user on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "Un utilisateur ne voit que ses propres abonnements push"
  on public.push_subscriptions for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Un utilisateur ne peut créer un abonnement qu'en son propre nom"
  on public.push_subscriptions for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Un utilisateur peut mettre à jour ses propres abonnements"
  on public.push_subscriptions for update
  to authenticated
  using (auth.uid() = user_id);

create policy "Un utilisateur peut supprimer ses propres abonnements"
  on public.push_subscriptions for delete
  to authenticated
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Déclenche l'envoi d'une notification push à la réception d'un message privé.
-- Le secret partagé vit dans Supabase Vault (vault.create_secret, posé une
-- seule fois manuellement après déploiement) — jamais commité en clair ici.
-- ALTER DATABASE ... SET n'est pas autorisé sur Postgres managé Supabase,
-- d'où le choix de Vault plutôt qu'un simple current_setting().
-- ----------------------------------------------------------------------------
create extension if not exists pg_net;

create or replace function public.notify_new_message()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  sender_name text;
  shared_secret text;
begin
  select name into sender_name from public.profiles where user_id = new.sender_id;
  select decrypted_secret into shared_secret from vault.decrypted_secrets where name = 'webhook_secret';
  perform net.http_post(
    url := 'https://bsfrshupdimoumvqyamx.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', shared_secret
    ),
    body := jsonb_build_object(
      'receiver_id', new.receiver_id,
      'title', coalesce(sender_name, 'Quelqu''un'),
      'body', left(new.content, 120),
      'url', '/chat/' || new.sender_id::text
    )
  );
  return new;
end;
$$;

-- Supprime un doublon issu d'une tentative précédente et incomplète de cette
-- même fonctionnalité (même fonction, autre nom de trigger) — sans ça, chaque
-- message déclenchait deux appels à l'Edge Function et deux push en double.
drop trigger if exists on_new_message_notify on public.messages;

drop trigger if exists on_message_created_notify on public.messages;
create trigger on_message_created_notify
  after insert on public.messages
  for each row execute procedure public.notify_new_message();
