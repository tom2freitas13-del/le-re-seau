-- Rappel push la veille d'une activité, envoyé à l'organisateur et à tous
-- les participants, via une tâche planifiée quotidienne (pg_cron).
alter table public.activities add column if not exists reminder_sent boolean not null default false;

create or replace function public.send_activity_reminders()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  activity_row record;
  recipient record;
  shared_secret text;
begin
  select decrypted_secret into shared_secret from vault.decrypted_secrets where name = 'webhook_secret';

  for activity_row in
    select id, title, activity_time, author_id
    from public.activities
    where activity_date = (current_date + interval '1 day')::date
      and reminder_sent = false
  loop
    for recipient in
      select user_id from (
        select author_id as user_id from public.activities where id = activity_row.id
        union
        select user_id from public.activity_participants where activity_id = activity_row.id
      ) as people
    loop
      perform net.http_post(
        url := 'https://bsfrshupdimoumvqyamx.supabase.co/functions/v1/send-push',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-webhook-secret', shared_secret
        ),
        body := jsonb_build_object(
          'receiver_id', recipient.user_id,
          'title', '📅 Rappel : ' || activity_row.title,
          'body', 'C''est demain' || (case when activity_row.activity_time is not null then ' à ' || activity_row.activity_time else '' end) || ' !',
          'url', '/activities'
        )
      );
    end loop;

    update public.activities set reminder_sent = true where id = activity_row.id;
  end loop;
end;
$$;

-- Tous les jours à 18h UTC (19-20h en France selon la saison) — cron.schedule
-- remplace le job existant s'il porte déjà ce nom, donc rejouable sans risque.
select cron.schedule('activity-reminders-daily', '0 18 * * *', $$select public.send_activity_reminders();$$);
