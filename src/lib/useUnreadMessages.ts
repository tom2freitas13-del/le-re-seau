import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';

export function useUnreadMessages() {
  const { user } = useAuth();
  const [hasUnread, setHasUnread] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const checkUnread = useCallback(async () => {
    if (!user) { setHasUnread(false); setUnreadCount(0); return; }
    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .eq('read', false);
    setUnreadCount(count || 0);
    setHasUnread((count || 0) > 0);
  }, [user]);

  useEffect(() => {
    checkUnread();
    if (!user) return;
    const channel = supabase
      .channel(`unread-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` }, () => checkUnread())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` }, () => checkUnread())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, checkUnread]);

  return { hasUnread, unreadCount, refresh: checkUnread };
}
