-- Les 5 MB (MAX_PHOTO_SIZE_MB) n'étaient vérifiés que côté client avant
-- l'upload — aucune des 5 buckets Storage n'a de file_size_limit, donc un
-- appel direct à l'API (en contournant l'appli) pouvait uploader un fichier
-- de n'importe quelle taille, dans la limite du plan Supabase. Moins
-- exploitable que les bugs précédents (demande de contourner le client
-- volontairement), mais coûte rien à fermer.
update storage.buckets set file_size_limit = 5242880 where id in ('avatars', 'activity-photos', 'chat-images', 'feed-photos'); -- 5 MB
update storage.buckets set file_size_limit = 10485760 where id = 'chat-audio'; -- 10 MB, un message vocal peut peser plus qu'une photo compressée
