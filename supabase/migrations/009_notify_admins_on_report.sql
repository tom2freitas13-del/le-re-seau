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
