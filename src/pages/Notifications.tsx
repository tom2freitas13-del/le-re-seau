import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell, MessageCircle, Image as ImageIcon, Heart, MessageSquare, CheckCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { formatMessageTime } from '@/lib/constants';
import BottomNav from '@/components/BottomNav';

interface Notification {
  id: string;
  type: 'new_message' | 'new_group_message' | 'new_post' | 'post_liked' | 'post_commented';
  title: string;
  body: string | null;
  link: string;
  read: boolean;
  created_at: string;
}

const TYPE_ICON: Record<Notification['type'], typeof Bell> = {
  new_message: MessageCircle,
  new_group_message: MessageCircle,
  new_post: ImageIcon,
  post_liked: Heart,
  post_commented: MessageSquare,
};

// Historique persistant, volontairement limité aux interactions directes
// (nouveau message, nouvelle publication, like/commentaire sur SA
// publication — voir migration 064) : pas les relances génériques du type
// digest hebdo ou rappel d'activité, qui restent des push ponctuelles.
export default function Notifications() {
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[] | null>(null);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);
    setNotifications(data || []);
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/auth'); return; }
    loadNotifications();

    const channel = supabase
      .channel(`notifications-page-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...(prev || [])]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, authLoading, navigate, loadNotifications]);

  const handleOpen = async (n: Notification) => {
    if (!n.read) {
      setNotifications(prev => (prev || []).map(x => x.id === n.id ? { ...x, read: true } : x));
      await supabase.from('notifications').update({ read: true }).eq('id', n.id);
    }
    navigate(n.link);
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    setNotifications(prev => (prev || []).map(x => ({ ...x, read: true })));
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
  };

  const hasUnread = (notifications || []).some(n => !n.read);

  if (authLoading) return null;

  return (
    <div className="min-h-screen pb-28 bg-background">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-ocean-light flex items-center justify-center">
              <Bell className="h-5 w-5 text-primary" strokeWidth={1.5} />
            </div>
            <h1 className="font-display text-2xl font-semibold">{t('notifications.title')}</h1>
          </div>
          {hasUnread && (
            <button onClick={handleMarkAllRead}
              className="text-xs font-medium text-primary hover:underline flex items-center gap-1 flex-shrink-0">
              <CheckCheck className="h-3.5 w-3.5" /> {t('notifications.markAllRead')}
            </button>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4">
        {notifications === null ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="rounded-2xl bg-muted animate-pulse h-16" />)}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🔔</div>
            <h3 className="font-display text-xl mb-2">{t('notifications.emptyTitle')}</h3>
            <p className="text-sm text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif' }}>
              {t('notifications.emptyDesc')}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map(n => {
              const Icon = TYPE_ICON[n.type];
              return (
                <button key={n.id} onClick={() => handleOpen(n)}
                  className={`w-full text-left rounded-2xl p-4 flex items-start gap-3 transition-colors ${n.read ? 'bg-card border border-border/50' : 'bg-ocean-light border border-primary/10'}`}>
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 ${n.read ? 'bg-secondary text-muted-foreground' : 'bg-primary text-white'}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${n.read ? 'font-medium' : 'font-semibold'}`} style={{ fontFamily: 'Jost, sans-serif' }}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5" style={{ fontFamily: 'Jost, sans-serif' }}>
                        {n.body}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1" style={{ fontFamily: 'Jost, sans-serif' }}>
                      {formatMessageTime(n.created_at, t)}
                    </p>
                  </div>
                  {!n.read && <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
