import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { getCommunityLevel } from '@/lib/gamification';

// Les points (migration 059) sont attribués côté serveur par des triggers,
// souvent suite à l'action de quelqu'un d'autre (avis reçu, quelqu'un
// rejoint mon activité, parrainage abouti) — donc invisibles pour
// l'utilisateur sans écouter le insert en temps réel, contrairement à une
// action qu'il vient de faire lui-même.
export function useGlobalPointsNotifications() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const totalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user) { totalRef.current = null; return; }
    let cancelled = false;
    supabase.from('user_points_summary').select('total_points').eq('user_id', user.id).maybeSingle().then(({ data }) => {
      if (!cancelled) totalRef.current = data?.total_points ?? 0;
    });

    const channel = supabase
      .channel(`points-notify-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_points_ledger', filter: `user_id=eq.${user.id}` }, (payload) => {
        const row = payload.new as { points: number };
        const prevTotal = totalRef.current ?? 0;
        const newTotal = prevTotal + row.points;
        totalRef.current = newTotal;
        const prevLevel = getCommunityLevel(prevTotal);
        const newLevel = getCommunityLevel(newTotal);
        if (newLevel.key !== prevLevel.key) {
          toast.success(t('gamificationInfo.levelUpToast', { points: row.points, emoji: newLevel.emoji, level: t(`communityLevels.${newLevel.key}`) }));
        } else {
          toast.success(t('gamificationInfo.pointsToast', { points: row.points }));
        }
      })
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [user, t]);
}
