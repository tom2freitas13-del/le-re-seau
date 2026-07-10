import { useEffect, useState } from 'react';
import { Home, Users, MessageCircle, Calendar, User, Map, Bell, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { useUnreadMessages } from '@/lib/unread-context';
import { getPushPermissionState, isPushSupported, subscribeToPush } from '@/lib/push-notifications';

const navItems = [
  { icon: Home, label: 'Accueil', path: '/' },
  { icon: Users, label: 'Commu.', path: '/social' },
  { icon: Map, label: 'Carte', path: '/map' },
  { icon: MessageCircle, label: 'Discuss.', path: '/discussions' },
  { icon: Calendar, label: 'Activités', path: '/activities' },
  { icon: User, label: 'Profil', path: '/profile' },
];

export default function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();
  const { unreadTotal } = useUnreadMessages();
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const check = async () => {
      if (!user) return;
      if (sessionStorage.getItem('push-prompt-dismissed') === '1') return;
      const supported = await isPushSupported();
      if (!supported) return;
      const permission = await getPushPermissionState();
      if (permission === 'default') setShowPrompt(true);
    };
    check();
  }, [user]);

  const handleEnable = async () => {
    if (!user) return;
    const ok = await subscribeToPush(user.id);
    setShowPrompt(false);
    if (!ok) sessionStorage.setItem('push-prompt-dismissed', '1');
  };

  // Volontairement en sessionStorage (pas localStorage) : on veut redemander
  // à chaque nouvelle visite plutôt que de renoncer définitivement dès le
  // premier "plus tard", tant que la communauté est petite et qu'on cherche
  // à maximiser l'activation des notifications.
  const handleDismiss = () => {
    sessionStorage.setItem('push-prompt-dismissed', '1');
    setShowPrompt(false);
  };

  return (
    <>
      {showPrompt && (
        <div className="fixed bottom-[64px] left-0 right-0 z-40 px-4 pb-2">
          <div className="max-w-lg mx-auto bg-primary text-white rounded-2xl px-4 py-3 flex items-center gap-3 shadow-lg">
            <Bell className="h-5 w-5 flex-shrink-0" />
            <p className="flex-1 text-xs" style={{ fontFamily: 'Jost, sans-serif' }}>
              Active les notifications pour ne rater aucun message
            </p>
            <button onClick={handleEnable} className="text-xs font-semibold bg-white/20 px-3 py-1.5 rounded-full flex-shrink-0">
              Activer
            </button>
            <button onClick={handleDismiss} className="flex-shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom"
        style={{ background: 'rgba(255,253,248,0.92)', backdropFilter: 'blur(20px)', borderTop: '1px solid hsl(42 20% 88%)' }}>
        <div className="flex items-center justify-around py-1.5 max-w-lg mx-auto overflow-x-auto">
          {navItems.map(({ icon: Icon, label, path }) => {
            const active = location.pathname === path || (path !== '/' && location.pathname.startsWith(path));
            return (
              <Link key={path} to={path}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-xl transition-all duration-200 text-[10px] font-medium flex-shrink-0',
                  active
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                style={{ fontFamily: 'Jost, sans-serif' }}>
                <div className={cn(
                  'relative p-1.5 rounded-xl transition-all duration-200',
                  active ? 'bg-ocean-light' : 'bg-transparent'
                )}>
                  <Icon className={cn('h-[18px] w-[18px]', active ? 'stroke-primary' : '')} strokeWidth={active ? 2 : 1.5} />
                  {path === '/discussions' && unreadTotal > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-semibold flex items-center justify-center">
                      {unreadTotal > 9 ? '9+' : unreadTotal}
                    </span>
                  )}
                </div>
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
