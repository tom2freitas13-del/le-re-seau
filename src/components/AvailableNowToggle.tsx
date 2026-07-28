import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Zap } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';

const AVAILABLE_NOW_HOURS = 2;

// Statut éphémère "Disponible maintenant" — contrairement à la Disponibilité
// (weekend/semaine/été/année, une préférence durable), ça sert à signaler
// "là, tout de suite, je suis dispo pour un café/surf/discuter" pendant 2h.
// Prend effet immédiatement (pas besoin du bouton "Enregistrer mon profil"),
// donc composant à part avec son propre appel Supabase.
export default function AvailableNowToggle() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [until, setUntil] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [, forceTick] = useState(0);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('profiles').select('available_now_until').eq('user_id', user.id).single();
    setUntil(data?.available_now_until || null);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Pour que le compte à rebours (et la disparition automatique du badge une
  // fois expiré) se mette à jour sans recharger la page.
  useEffect(() => {
    const id = setInterval(() => forceTick(t => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const isActive = !!until && new Date(until).getTime() > Date.now();

  const handleToggle = async () => {
    if (!user) return;
    setLoading(true);
    const newValue = isActive ? null : new Date(Date.now() + AVAILABLE_NOW_HOURS * 3_600_000).toISOString();
    const { error } = await supabase.from('profiles').update({ available_now_until: newValue }).eq('user_id', user.id);
    setLoading(false);
    if (error) { toast.error(t('profile.availableNowError')); return; }
    setUntil(newValue);
    toast.success(isActive ? t('profile.availableNowDisabled') : t('profile.availableNowEnabled'));
  };

  const minutesLeft = isActive && until ? Math.max(1, Math.round((new Date(until).getTime() - Date.now()) / 60_000)) : 0;

  return (
    <div className="card-premium p-5">
      <div className="flex items-center gap-3">
        <div className={isActive ? 'h-10 w-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0' : 'h-10 w-10 rounded-full bg-secondary flex items-center justify-center flex-shrink-0'}>
          <Zap className={isActive ? 'h-5 w-5 text-white' : 'h-5 w-5 text-muted-foreground'} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-lg font-semibold">{t('profile.availableNowTitle')}</h3>
          <p className="text-xs text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif' }}>
            {isActive ? t('profile.availableNowCountdown', { count: minutesLeft }) : t('profile.availableNowDesc')}
          </p>
        </div>
        <button onClick={handleToggle} disabled={loading}
          className={isActive
            ? 'flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium bg-secondary text-muted-foreground disabled:opacity-50'
            : 'flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium btn-ocean disabled:opacity-50'}>
          {isActive ? t('profile.availableNowStop') : t('profile.availableNowStart')}
        </button>
      </div>
    </div>
  );
}
