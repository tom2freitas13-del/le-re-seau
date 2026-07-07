import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';

interface UnreadContextType {
  unreadTotal: number;
}

const UnreadContext = createContext<UnreadContextType>({ unreadTotal: 0 });

export const useUnreadMessages = () => useContext(UnreadContext);

export function UnreadProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unreadTotal, setUnreadTotal] = useState(0);

  useEffect(() => {
    if (!user) { setUnreadTotal(0); return; }

    const loadUnreadTotal = async () => {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('read', false);
      setUnreadTotal(count || 0);
    };
    loadUnreadTotal();

    const channel = supabase
      .channel(`unread-total-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` }, loadUnreadTotal)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return <UnreadContext.Provider value={{ unreadTotal }}>{children}</UnreadContext.Provider>;
}
