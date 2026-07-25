-- email_exists (migration 035) n'avait aucune limite de débit : n'importe
-- qui pouvait l'appeler en boucle pour énumérer les emails inscrits.
-- On journalise chaque appel par IP (transmise par le gateway Supabase dans
-- request.headers) et on bloque au-delà de 10 appels/minute — largement
-- suffisant pour l'usage légitime (un seul appel par tentative de connexion
-- ratée), pas pour du scraping.
create table if not exists public.email_exists_calls (
  ip text not null,
  called_at timestamptz not null default now()
);

create index if not exists idx_email_exists_calls_ip_time on public.email_exists_calls (ip, called_at);

alter table public.email_exists_calls enable row level security;
-- Pas de policy select/insert : la table n'est touchée que par la fonction
-- security definer ci-dessous, jamais directement par un client.

create or replace function public.email_exists(check_email text)
returns boolean
language plpgsql
security definer set search_path = public, auth
as $$
declare
  caller_ip text;
  recent_calls int;
begin
  caller_ip := coalesce(
    split_part(current_setting('request.headers', true)::json->>'x-forwarded-for', ',', 1),
    'unknown'
  );

  delete from public.email_exists_calls where called_at < now() - interval '1 hour';

  select count(*) into recent_calls
  from public.email_exists_calls
  where ip = caller_ip and called_at > now() - interval '1 minute';

  if recent_calls >= 10 then
    raise exception 'Trop de tentatives, réessaie dans une minute.';
  end if;

  insert into public.email_exists_calls (ip) values (caller_ip);

  return exists (select 1 from auth.users where lower(email) = lower(check_email));
end;
$$;

revoke all on function public.email_exists(text) from public;
grant execute on function public.email_exists(text) to anon, authenticated;
