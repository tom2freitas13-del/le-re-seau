import { Users, Map, MessageCircle, Briefcase, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useUnreadMessages } from '@/lib/useUnreadMessages';

const navItems = [
  { icon: Users, label: 'Communauté', path: '/social' },
  { icon: Map, label: 'Carte', path: '/map' },
  { icon: MessageCircle, label: 'Discussions', path: '/discussions' },
  { icon: Briefcase, label: 'Services', path: '/jobs' },
  { icon: User, label: 'Profil', path: '/profile' },
];

/**
 * Barre de navigation mobile — icônes seules (sans texte) pour rester lisible
 * sur petit écran. L'état actif est indiqué par un fond coloré bien visible.
 * Un point rouge apparaît sur Discussions quand il y a des messages non lus.
 */
export default function BottomNav() {
  const location = useLocation();
  const { hasUnread } = useUnreadMessages();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom"
      style={{ background: 'rgba(255,253,248,0.95)', backdropFilter: 'blur(20px)', borderTop: '1px solid hsl(42 20% 88%)' }}>
      <div className="flex items-center justify-around py-2 max-w-lg mx-auto px-2">
        {navItems.map(({ icon: Icon, label, path }) => {
          const active = location.pathname === path || (path !== '/' && location.pathname.startsWith(path + '/'));
          const showBadge = path === '/discussions' && hasUnread;
          return (
            <Link
              key={path}
              to={path}
              aria-label={label}
              title={label}
              className="flex items-center justify-center">
              <div className={cn(
                'h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-200 relative',
                active ? 'bg-primary' : 'hover:bg-secondary'
              )}>
                <Icon
                  className={cn('h-[22px] w-[22px] transition-colors duration-200', active ? 'text-white' : 'text-muted-foreground')}
                  strokeWidth={active ? 2.2 : 1.75}
                />
                {showBadge && (
                  <span
                    className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-destructive"
                    style={{ boxShadow: '0 0 0 2px rgba(255,253,248,0.95)' }}
                  />
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
