import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trophy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { avatarFallbackInitial } from '@/lib/constants';
import CommunityLevelBadge from '@/components/CommunityLevelBadge';

interface LeaderboardEntry {
  user_id: string;
  points_this_week: number;
  total_points: number;
  name: string | null;
  photo_url: string | null;
}

const RANK_EMOJI = ['🥇', '🥈', '🥉'];

// Composant autonome (charge ses propres données) — affiché sur Communauté,
// classement "membres les plus utiles de la semaine" basé sur user_points_summary
// (vue agrégée alimentée par les triggers de la migration 059).
export default function WeeklyLeaderboard() {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: summary } = await supabase
        .from('user_points_summary')
        .select('user_id, points_this_week, total_points')
        .gt('points_this_week', 0)
        .order('points_this_week', { ascending: false })
        .limit(5);
      if (!summary || summary.length === 0) { if (!cancelled) setEntries([]); return; }
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name, photo_url')
        .in('user_id', summary.map(s => s.user_id));
      const map = new Map((profiles || []).map(p => [p.user_id, p]));
      if (!cancelled) {
        setEntries(summary.map(s => ({ ...s, name: map.get(s.user_id)?.name || null, photo_url: map.get(s.user_id)?.photo_url || null })));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!entries || entries.length === 0) return null;

  return (
    <div className="card-premium p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="h-4 w-4 text-gold flex-shrink-0" />
        <h3 className="text-sm font-semibold" style={{ fontFamily: 'Jost, sans-serif' }}>{t('leaderboard.title')}</h3>
      </div>
      <div className="space-y-2.5">
        {entries.map((entry, i) => (
          <div key={entry.user_id} className="flex items-center gap-2.5">
            <span className="w-5 text-center text-sm flex-shrink-0">{RANK_EMOJI[i] || `#${i + 1}`}</span>
            <div className="h-8 w-8 rounded-full bg-ocean-light flex items-center justify-center flex-shrink-0 overflow-hidden">
              {entry.photo_url ? (
                <img src={entry.photo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs font-semibold text-primary">{avatarFallbackInitial(entry.name)}</span>
              )}
            </div>
            <span className="text-sm font-medium truncate flex-1" style={{ fontFamily: 'Jost, sans-serif' }}>
              {entry.name || t('groupChat.defaultUser')}
            </span>
            <CommunityLevelBadge totalPoints={entry.total_points} compact />
            <span className="text-xs text-muted-foreground flex-shrink-0" style={{ fontFamily: 'Jost, sans-serif' }}>
              {t('leaderboard.points', { count: entry.points_this_week })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
