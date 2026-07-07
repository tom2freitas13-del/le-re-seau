import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';

interface PresenceContextType {
  onlineUserIds: Set<string>;
  onlineCount: number;
  isOnline: (userId: string) => boolean;
}

const PresenceContext = createContext<PresenceContextType>({
  onlineUserIds: new Set(),
  onlineCount: 0,
  isOnline: () => false,
});

export const usePresence = () => useContext(PresenceContext);

const HEARTBEAT_MS = 60_000;

export function PresenceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) { setOnlineUserIds(new Set()); return; }

    const channel = supabase.channel('online-users', {
      config: { presence: { key: user.id } },
    });

    const syncState = () => {
      const state = channel.presenceState();
      setOnlineUserIds(new Set(Object.keys(state)));
    };

    channel
      .on('presence', { event: 'sync' }, syncState)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    const touchLastSeen = () => {
      supabase.from('profiles').update({ last_seen: new Date().toISOString() }).eq('user_id', user.id).then();
    };
    const heartbeat = setInterval(touchLastSeen, HEARTBEAT_MS);

    return () => {
      clearInterval(heartbeat);
      touchLastSeen();
      supabase.removeChannel(channel);
    };
  }, [user]);

  const value: PresenceContextType = {
    onlineUserIds,
    onlineCount: onlineUserIds.size,
    isOnline: (userId: string) => onlineUserIds.has(userId),
  };

  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>;
}
