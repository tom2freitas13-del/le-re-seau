-- Bloquer quelqu'un ne faisait que le cacher visuellement (filtré côté
-- app dans Discussions.tsx/Chat.tsx) : la personne bloquée pouvait
-- toujours envoyer des messages en 1:1 — la ligne s'insérait sans
-- problème (aucune vérification de blocked_users dans la policy INSERT),
-- et le trigger notify_new_message() ne vérifie pas non plus les blocages,
-- donc le destinataire continuait de recevoir des notifications push
-- pour des messages d'une personne qu'il avait spécifiquement bloquée.
-- Tout l'intérêt de bloquer quelqu'un (arrêter d'être contacté) n'était
-- donc pas rempli.
--
-- Corrigé au niveau de la policy INSERT plutôt que dans le trigger : si
-- l'insertion échoue, le trigger de notification ne se déclenche jamais,
-- donc ce seul changement règle les deux problèmes (message ET
-- notification push). Uniquement sur les messages 1:1 — pas de sens
-- équivalent pour les groupes/salons, qui sont des espaces partagés où
-- un blocage individuel ne doit pas empêcher les autres membres.
drop policy if exists "On ne peut envoyer qu'en son propre nom" on public.messages;
create policy "On ne peut envoyer qu'en son propre nom"
  on public.messages for insert to authenticated
  with check (
    auth.uid() = sender_id
    and not public.is_user_banned(auth.uid())
    and not exists (
      select 1 from public.blocked_users
      where (blocker_id = receiver_id and blocked_id = sender_id)
         or (blocker_id = sender_id and blocked_id = receiver_id)
    )
  );
