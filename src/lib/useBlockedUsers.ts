import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

/**
 * Hook centralisant la liste des utilisateurs bloqués par la personne connectée.
 * Permet de filtrer facilement le contenu d'un utilisateur bloqué dans
 * n'importe quelle page (Communauté, Chat, Forum, Activités, Services...).
 */
export function useBlockedUsers() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase.from('blocked_users').select('blocked_id').eq('blocker_id', user.id);
    setBlockedIds(new Set((data || []).map(b => b.blocked_id)));
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const blockUser = useCallback(async (targetUserId: string) => {
    if (!user) return;
    const { error } = await supabase.from('blocked_users').insert({ blocker_id: user.id, blocked_id: targetUserId });
    if (error) { toast.error(t('blockedUsers.blockError')); return; }
    setBlockedIds(prev => new Set(prev).add(targetUserId));
    toast.success(t('blockedUsers.blockedSuccess'));
  }, [user, t]);

  const unblockUser = useCallback(async (targetUserId: string) => {
    if (!user) return;
    const { error } = await supabase.from('blocked_users').delete().eq('blocker_id', user.id).eq('blocked_id', targetUserId);
    if (error) { toast.error(t('blockedUsers.unblockError')); return; }
    setBlockedIds(prev => { const s = new Set(prev); s.delete(targetUserId); return s; });
    toast.success(t('blockedUsers.unblockedSuccess'));
  }, [user, t]);

  const isBlocked = useCallback((targetUserId: string) => blockedIds.has(targetUserId), [blockedIds]);

  return { blockedIds, loading, blockUser, unblockUser, isBlocked, reload: load };
}
