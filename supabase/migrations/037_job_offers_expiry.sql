-- Le champ "date" des offres d'emploi était du texte libre ("Ce week-end",
-- "Lundi matin"...), impossible à comparer automatiquement à aujourd'hui —
-- une annonce pour un jour précis restait affichée indéfiniment, identique
-- à une annonce neuve. On ajoute une vraie date pour les nouvelles offres ;
-- l'ancien champ texte reste pour l'historique (les annonces existantes
-- n'ont pas de date exploitable et ne seront donc jamais auto-expirées).
alter table public.job_offers add column if not exists needed_date date;

create index if not exists idx_job_offers_needed_date on public.job_offers (needed_date);

-- Les demandes de service (job_requests) n'ont qu'une disponibilité en
-- texte libre ("le week-end", "tous les matins"...) : pas de date précise
-- à expirer, donc on se base sur l'ancienneté de publication à la place.
create or replace function public.expire_old_job_ads()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  -- Offres avec une date passée depuis plus de 3 jours (grâce de
  -- visibilité pendant laquelle l'annonce reste affichée, marquée "Expiré").
  delete from public.job_offers
  where needed_date is not null and needed_date < current_date - interval '3 days';

  -- Demandes de plus de 60 jours (+ 3 jours de grâce après le seuil
  -- d'affichage "Expiré" côté app).
  delete from public.job_requests
  where created_at < now() - interval '63 days';
end;
$$;

-- Chaque nuit à 3h UTC.
select cron.schedule('expire-job-ads-daily', '0 3 * * *', $$select public.expire_old_job_ads();$$);
