-- BUG FIX : le marché nocturne de La Flotte (066) était placé en pleine mer
-- au lieu du Cours Félix Faure, signalé par capture d'écran de la carte.
update public.points_of_interest
set latitude = 46.18740, longitude = -1.32330
where id = 'ba9ae406-fbc8-40b8-9c86-bfaa896af7dd';
