-- Nettoyage d'un avis de test créé pendant la vérification de la migration
-- 057 (aucun moyen de le supprimer autrement : la suppression d'un avis est
-- volontairement réservée aux admins, voir 057).
delete from public.user_reviews where id = '3d7a9bbd-e921-4eed-8a98-7c32f026d490';
