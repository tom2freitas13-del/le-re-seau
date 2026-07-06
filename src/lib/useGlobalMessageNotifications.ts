import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

export function useGlobalMessageNotifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useRef(location.pathname);
  const nameCache = useRef<Record<string, string>>({});

  useEffect(() => { locationRef.current = location.pathname; }, [location.pathname]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`global-notify-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` }, async (payload) => {
        const m = payload.new as { sender_id: string; content: string };
        if (locationRef.current === `/chat/${m.sender_id}`) return;
        let senderName = nameCache.current[m.sender_id];
        if (!senderName) {
          const { data } = await supabase.from('profiles').select('name').eq('user_id', m.sender_id).single();
          senderName = data?.name || 'Quelqu\'un';
          nameCache.current[m.sender_id] = senderName;
        }
        toast(`💬 ${senderName}`, {
          description: m.content.length > 60 ? m.content.slice(0, 60) + '…' : m.content,
          action: { label: 'Voir', onClick: () => navigate(`/chat/${m.sender_id}`) },
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, navigate]);
}
