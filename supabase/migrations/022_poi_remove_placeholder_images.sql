-- Retire les images génériques (réutilisées depuis les catégories d'activité) :
-- chaque point d'intérêt aura sa propre vraie photo, ajoutée séparément.
update public.points_of_interest set image_url = null;
