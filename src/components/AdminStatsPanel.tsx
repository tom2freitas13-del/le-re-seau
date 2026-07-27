import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LineChart, Line, XAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Users, UserCheck, Wifi, UserPlus, MessageSquare, Flag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePresence } from '@/lib/presence-context';

const CONTENT_TABLES = ['forum_posts', 'feed_posts', 'salon_messages', 'activities', 'job_offers', 'job_requests'] as const;
const TREND_DAYS = 14;

interface DayBucket { date: string; count: number; }

// Clé "AAAA-MM-JJ" en heure LOCALE (pas UTC) : created_at est stocké en UTC
// en base, donc découper la chaîne ISO brute (created_at.slice(0, 10))
// décale certains posts sur le mauvais jour local selon l'heure et le fuseau
// (ex: un post à 23h30 en France peut déjà être le lendemain en UTC).
function localDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function bucketByDay(rows: { created_at: string }[], days: number): DayBucket[] {
  const buckets = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    buckets.set(localDayKey(d), 0);
  }
  rows.forEach(r => {
    const key = localDayKey(new Date(r.created_at));
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) || 0) + 1);
  });
  return Array.from(buckets.entries()).map(([date, count]) => ({ date, count }));
}

// `date` est une clé "AAAA-MM-JJ" locale (voir localDayKey) — on la reconstruit
// en Date locale plutôt que new Date("AAAA-MM-JJ"), que le JS interprète en
// UTC et qui peut donc afficher le jour précédent/suivant selon le fuseau.
function formatDayKey(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function StatTile({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number | string; color: string }) {
  return (
    <div className="card-premium p-4 text-center">
      <Icon className={`h-4 w-4 mx-auto mb-1.5 ${color}`} strokeWidth={1.5} />
      <p className="font-display text-2xl font-semibold">{value}</p>
      <p className="text-[11px] text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif' }}>{label}</p>
    </div>
  );
}

function SparklineCard({ title, total, data, color }: { title: string; total: number; data: DayBucket[]; color: string }) {
  const { t } = useTranslation();
  return (
    <div className="card-premium p-4">
      <div className="flex items-baseline justify-between mb-0.5">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider" style={{ fontFamily: 'Jost, sans-serif' }}>{title}</h4>
        <span className="font-display text-lg font-semibold">{total}</span>
      </div>
      {data.length > 0 && (
        <p className="text-[10px] text-muted-foreground mb-2" style={{ fontFamily: 'Jost, sans-serif' }}>
          {formatDayKey(data[0].date)} → {formatDayKey(data[data.length - 1].date)}
        </p>
      )}
      <div className="h-16">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
            <XAxis dataKey="date" hide />
            <Tooltip
              formatter={(value: number) => [value, t('admin.statsPerDay')]}
              labelFormatter={(label: string) => formatDayKey(label)}
              contentStyle={{ fontSize: 12, fontFamily: 'Jost, sans-serif', borderRadius: 8 }}
            />
            <Line type="monotone" dataKey="count" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function AdminStatsPanel() {
  const { t } = useTranslation();
  const { onlineCount } = usePresence();
  const [loading, setLoading] = useState(true);
  const [totalMembers, setTotalMembers] = useState(0);
  const [activeToday, setActiveToday] = useState(0);
  const [activeWeek, setActiveWeek] = useState(0);
  const [newThisWeek, setNewThisWeek] = useState(0);
  const [postsThisWeek, setPostsThisWeek] = useState(0);
  const [reportCounts, setReportCounts] = useState({ pending: 0, reviewed: 0, dismissed: 0 });
  const [signupTrend, setSignupTrend] = useState<DayBucket[]>([]);
  const [postsTrend, setPostsTrend] = useState<DayBucket[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const now = Date.now();
      const since1d = new Date(now - 1 * 86_400_000).toISOString();
      const since7d = new Date(now - 7 * 86_400_000).toISOString();
      const since14d = new Date(now - TREND_DAYS * 86_400_000).toISOString();

      const [
        totalRes, activeTodayRes, activeWeekRes, newWeekRes,
        signupsRes,
        ...contentRes
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).not('name', 'is', null),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_banned', false).gte('last_seen', since1d),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_banned', false).gte('last_seen', since7d),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', since7d),
        supabase.from('profiles').select('created_at').gte('created_at', since14d),
        ...CONTENT_TABLES.map(table => supabase.from(table).select('created_at').gte('created_at', since14d)),
      ]);

      setTotalMembers(totalRes.count || 0);
      setActiveToday(activeTodayRes.count || 0);
      setActiveWeek(activeWeekRes.count || 0);
      setNewThisWeek(newWeekRes.count || 0);
      setSignupTrend(bucketByDay(signupsRes.data || [], TREND_DAYS));

      const allContentRows = contentRes.flatMap(r => r.data || []);
      setPostsTrend(bucketByDay(allContentRows, TREND_DAYS));
      const since7dTs = new Date(since7d).getTime();
      setPostsThisWeek(allContentRows.filter(r => new Date(r.created_at).getTime() >= since7dTs).length);

      const [pendingRes, reviewedRes, dismissedRes] = await Promise.all([
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'reviewed'),
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'dismissed'),
      ]);
      setReportCounts({ pending: pendingRes.count || 0, reviewed: reviewedRes.count || 0, dismissed: dismissedRes.count || 0 });

      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatTile icon={Users} label={t('admin.statsTotalMembers')} value={totalMembers} color="text-primary" />
        <StatTile icon={UserCheck} label={t('admin.statsActiveToday')} value={activeToday} color="text-pine" />
        <StatTile icon={Wifi} label={t('admin.statsOnlineNow')} value={onlineCount} color="text-green-500" />
        <StatTile icon={UserCheck} label={t('admin.statsActiveWeek')} value={activeWeek} color="text-pine" />
        <StatTile icon={UserPlus} label={t('admin.statsNewWeek')} value={newThisWeek} color="text-gold" />
        <StatTile icon={MessageSquare} label={t('admin.statsPostsWeek')} value={postsThisWeek} color="text-primary" />
      </div>

      <SparklineCard title={t('admin.statsSignupTrend')} total={signupTrend.reduce((s, d) => s + d.count, 0)} data={signupTrend} color="hsl(var(--primary))" />
      <SparklineCard title={t('admin.statsPostsTrend')} total={postsTrend.reduce((s, d) => s + d.count, 0)} data={postsTrend} color="hsl(var(--pine))" />

      <div className="card-premium p-4">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5" style={{ fontFamily: 'Jost, sans-serif' }}>
          <Flag className="h-3.5 w-3.5" /> {t('admin.statsReportsTitle')}
        </h4>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="font-display text-xl font-semibold text-destructive">{reportCounts.pending}</p>
            <p className="text-[11px] text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif' }}>{t('admin.filterPending')}</p>
          </div>
          <div>
            <p className="font-display text-xl font-semibold text-pine">{reportCounts.reviewed}</p>
            <p className="text-[11px] text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif' }}>{t('admin.filterReviewed')}</p>
          </div>
          <div>
            <p className="font-display text-xl font-semibold text-muted-foreground">{reportCounts.dismissed}</p>
            <p className="text-[11px] text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif' }}>{t('admin.filterDismissed')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
