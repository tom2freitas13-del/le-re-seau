-- Le fil photo (feed_posts/feed_comments, migration 026) a ajouté un bouton
-- "signaler" avec target_type 'feed_post' / 'feed_comment' (ReportModal.tsx),
-- mais la contrainte de la table reports n'a jamais été mise à jour pour les
-- autoriser : signaler un post ou un commentaire du fil échoue silencieusement
-- côté base (violation de check constraint).
alter table public.reports drop constraint if exists reports_target_type_check;

alter table public.reports add constraint reports_target_type_check
  check (target_type in (
    'profile', 'message', 'group_message', 'salon_message',
    'forum_post', 'forum_comment', 'job_offer', 'job_request', 'activity',
    'feed_post', 'feed_comment'
  ));
