-- Aligne la contrainte d'âge en base avec l'âge minimum légal (15 ans, cf. MIN_AGE
-- dans src/lib/constants.ts et les Conditions d'utilisation).
alter table public.profiles drop constraint if exists profiles_age_check;
alter table public.profiles add constraint profiles_age_check check (age is null or (age >= 15 and age <= 120));
