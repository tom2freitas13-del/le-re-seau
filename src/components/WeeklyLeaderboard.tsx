import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trophy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
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
const TOP_SIZE = 5;

// Composant autonome (charge ses propres données) — affiché sur Communauté,
// classement "membres les plus utiles de la semaine" basé sur user_points_summary
// (vue agrégée alimentée par les triggers de la migration 059). En plus du
// top 5, affiche le rang personnel de l'utilisateur connecté s'il a des
// points cette semaine et n'est pas déjà visible dans le top 5.
export default function WeeklyLeaderboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [ranked, setRanked] = useState<LeaderboardEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Classement complet (pas de limit) pour pouvoir calculer le rang
      // personnel même hors du top 5 — la table reste petite pour l'instant.
      const { data: summary } = await supabase
        .from('user_points_summary')
        .select('user_id, points_this_week, total_points')
        .gt('points_this_week', 0)
        .order('points_this_week', { ascending: false });
      if (!summary || summary.length === 0) { if (!cancelled) setRanked([]); return; }
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name, photo_url')
        .in('user_id', summary.map(s => s.user_id));
      const map = new Map((profiles || []).map(p => [p.user_id, p]));
      if (!cancelled) {
        setRanked(summary.map(s => ({ ...s, name: map.get(s.user_id)?.name || null, photo_url: map.get(s.user_id)?.photo_url || null })));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!ranked || ranked.length === 0) return null;

  const entries = ranked.slice(0, TOP_SIZE);
  const myIndex = user ? ranked.findIndex(e => e.user_id === user.id) : -1;
  const myEntry = myIndex >= TOP_SIZE ? ranked[myIndex] : null;

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
        {myEntry && (
          <div className="flex items-center gap-2.5 pt-2 mt-1 border-t border-border/50">
            <span className="w-5 text-center text-xs font-medium text-primary flex-shrink-0">#{myIndex + 1}</span>
            <div className="h-8 w-8 rounded-full bg-ocean-light flex items-center justify-center flex-shrink-0 overflow-hidden">
              {myEntry.photo_url ? (
                <img src={myEntry.photo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs font-semibold text-primary">{avatarFallbackInitial(myEntry.name)}</span>
              )}
            </div>
            <span className="text-sm font-medium truncate flex-1 text-primary" style={{ fontFamily: 'Jost, sans-serif' }}>
              {t('leaderboard.you')}
            </span>
            <CommunityLevelBadge totalPoints={myEntry.total_points} compact />
            <span className="text-xs text-muted-foreground flex-shrink-0" style={{ fontFamily: 'Jost, sans-serif' }}>
              {t('leaderboard.points', { count: myEntry.points_this_week })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
