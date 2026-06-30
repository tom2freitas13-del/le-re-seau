import { Home, Users, MessageCircle, Briefcase, User, Map } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: Home, label: 'Accueil', path: '/' },
  { icon: Users, label: 'Commu.', path: '/social' },
  { icon: Map, label: 'Carte', path: '/map' },
  { icon: MessageCircle, label: 'Discuss.', path: '/discussions' },
  { icon: Briefcase, label: 'Services', path: '/jobs' },
  { icon: User, label: 'Profil', path: '/profile' },
];

export default function BottomNav() {
  const location = useLocation();

  return (
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
                'p-1.5 rounded-xl transition-all duration-200',
                active ? 'bg-ocean-light' : 'bg-transparent'
              )}>
                <Icon className={cn('h-[18px] w-[18px]', active ? 'stroke-primary' : '')} strokeWidth={active ? 2 : 1.5} />
              </div>
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
