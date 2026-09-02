-- ============================================================================
-- Corrections §1 côté base
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. messages_lock_immutable_fields : verrouiller AUSSI les pièces jointes
-- ----------------------------------------------------------------------------
-- La policy UPDATE de messages (migration 048) autorise le destinataire à
-- modifier n'importe quelle colonne de la ligne (RLS ne restreint pas par
-- colonne) ; un trigger limite les champs modifiables au seul suivi de
-- lecture. Mais ce trigger (048) ne couvrait pas attachment_url /
-- attachment_type (ajoutés en 008) : un destinataire pouvait donc réécrire
-- l'URL ou le type de la pièce jointe d'un message reçu.
--
-- Au passage : on remplace `<>` par `is distinct from`. `<>` renvoie NULL
-- (et non false) quand une des deux valeurs est NULL — inoffensif sur les 4
-- colonnes NOT NULL d'origine, mais faux sur attachment_url qui est
-- nullable, ce qui laisserait passer une modification NULL -> valeur.
create or replace function public.messages_lock_immutable_fields()
returns trigger
language plpgsql
as $$
begin
  if new.content is distinct from old.content
     or new.sender_id is distinct from old.sender_id
     or new.receiver_id is distinct from old.receiver_id
     or new.created_at is distinct from old.created_at
     or new.attachment_url is distinct from old.attachment_url
     or new.attachment_type is distinct from old.attachment_type then
    raise exception 'Seuls les champs de lecture (read, read_at) peuvent être modifiés sur un message existant';
  end if;
  return new;
end;
$$;

-- Le trigger lui-même est inchangé (déjà créé en 048), on ne recrée que la
-- fonction.
