import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, ArrowLeft, Check, X, Ban, ShieldOff, Store, Search, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { REPORT_REASONS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import AdminStatsPanel from '@/components/AdminStatsPanel';

interface Report {
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  target_user_id: string | null;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
}

interface ProSearchResult {
  user_id: string;
  name: string | null;
  photo_url: string | null;
  is_pro: boolean;
}

/**
 * Espace de modération réservé aux admins (is_admin = true dans profiles).
 * Permet de voir les signalements en attente, de bannir un utilisateur,
 * ou de classer un signalement sans suite.
 */
export default function Admin() {
  const { t } = useTranslation();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [reporterNames, setReporterNames] = useState<Record<string, string>>({});
  const [targetNames, setTargetNames] = useState<Record<string, string>>({});
  const [bannedStatus, setBannedStatus] = useState<Record<string, boolean>>({});
  // BUG FIX : le panneau n'affichait jamais le contenu réellement signalé,
  // seulement le commentaire du signaleur — un admin ne pouvait pas
  // vérifier par lui-même de quoi il s'agissait sans quitter la page.
  const [reportedContent, setReportedContent] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<'pending' | 'reviewed' | 'dismissed' | 'all'>('pending');
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<'reports' | 'pro' | 'stats'>('reports');
  const [proQuery, setProQuery] = useState('');
  const [proResults, setProResults] = useState<ProSearchResult[]>([]);
  const [proSearching, setProSearching] = useState(false);
  const [proUpdatingId, setProUpdatingId] = useState<string | null>(null);

  // Récupère un aperçu du contenu signalé, table par table selon target_type.
  // 'profile' n'a pas besoin d'aperçu, le nom de la personne suffit.
  const loadReportedContent = useCallback(async (targetsByType: Record<string, string[]>) => {
    const content: Record<string, string> = {};
    const fetchers: PromiseLike<void>[] = [];

    if (targetsByType.message?.length) {
      fetchers.push(supabase.from('messages').select('id, content').in('id', targetsByType.message)
        .then(({ data }) => (data || []).forEach(r => { content[r.id] = r.content; })));
    }
    if (targetsByType.group_message?.length) {
      fetchers.push(supabase.from('chat_group_messages').select('id, content').in('id', targetsByType.group_message)
        .then(({ data }) => (data || []).forEach(r => { content[r.id] = r.content; })));
    }
    if (targetsByType.salon_message?.length) {
      fetchers.push(supabase.from('salon_messages').select('id, content').in('id', targetsByType.salon_message)
        .then(({ data }) => (data || []).forEach(r => { content[r.id] = r.content; })));
    }
    if (targetsByType.forum_post?.length) {
      fetchers.push(supabase.from('forum_posts').select('id, content').in('id', targetsByType.forum_post)
        .then(({ data }) => (data || []).forEach(r => { content[r.id] = r.content; })));
    }
    if (targetsByType.forum_comment?.length) {
      fetchers.push(supabase.from('forum_comments').select('id, content').in('id', targetsByType.forum_comment)
        .then(({ data }) => (data || []).forEach(r => { content[r.id] = r.content; })));
    }
    if (targetsByType.job_offer?.length) {
      fetchers.push(supabase.from('job_offers').select('id, title').in('id', targetsByType.job_offer)
        .then(({ data }) => (data || []).forEach(r => { content[r.id] = r.title; })));
    }
    if (targetsByType.job_request?.length) {
      fetchers.push(supabase.from('job_requests').select('id, title').in('id', targetsByType.job_request)
        .then(({ data }) => (data || []).forEach(r => { content[r.id] = r.title; })));
    }
    if (targetsByType.activity?.length) {
      fetchers.push(supabase.from('activities').select('id, title').in('id', targetsByType.activity)
        .then(({ data }) => (data || []).forEach(r => { content[r.id] = r.title; })));
    }
    if (targetsByType.feed_post?.length) {
      fetchers.push(supabase.from('feed_posts').select('id, caption').in('id', targetsByType.feed_post)
        .then(({ data }) => (data || []).forEach(r => { content[r.id] = r.caption || t('admin.feedPostNoCaption'); })));
    }
    if (targetsByType.feed_comment?.length) {
      fetchers.push(supabase.from('feed_comments').select('id, content').in('id', targetsByType.feed_comment)
        .then(({ data }) => (data || []).forEach(r => { content[r.id] = r.content; })));
    }

    await Promise.all(fetchers);
    setReportedContent(content);
  }, [t]);

  const loadReports = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('reports').select('*').order('created_at', { ascending: false });
    if (filter !== 'all') query = query.eq('status', filter);
    const { data } = await query;
    if (data) {
      setReports(data);
      const userIds = Array.from(new Set([
        ...data.map(r => r.reporter_id),
        ...data.map(r => r.target_user_id).filter(Boolean) as string[],
      ]));
      if (userIds.length) {
        const { data: profiles } = await supabase.from('profiles').select('user_id, name, is_banned').in('user_id', userIds);
        const names: Record<string, string> = {};
        const banned: Record<string, boolean> = {};
        (profiles || []).forEach(p => { names[p.user_id] = p.name || t('admin.defaultUser'); banned[p.user_id] = p.is_banned; });
        setReporterNames(names);
        setTargetNames(names);
        setBannedStatus(banned);
      }

      const targetsByType: Record<string, string[]> = {};
      data.forEach(r => { (targetsByType[r.target_type] ||= []).push(r.target_id); });
      loadReportedContent(targetsByType);
    }
    setLoading(false);
  }, [filter, t, loadReportedContent]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/auth'); return; }
    if (!isAdmin) { navigate('/'); return; }
    loadReports();
  }, [user, isAdmin, authLoading, navigate, loadReports]);

  const updateStatus = async (reportId: string, status: 'reviewed' | 'dismissed') => {
    if (!user) return;
    const { error } = await supabase.from('reports').update({ status, reviewed_at: new Date().toISOString(), reviewed_by: user.id }).eq('id', reportId);
    if (error) { toast.error(t('admin.updateError')); return; }
    setReports(prev => prev.filter(r => r.id !== reportId));
    toast.success(status === 'reviewed' ? t('admin.reportReviewed') : t('admin.reportDismissed'));
  };

  const toggleBan = async (targetUserId: string) => {
    const currentlyBanned = bannedStatus[targetUserId];
    const { error } = await supabase.from('profiles').update({ is_banned: !currentlyBanned }).eq('user_id', targetUserId);
    if (error) { toast.error(t('admin.banStatusError')); return; }
    setBannedStatus(prev => ({ ...prev, [targetUserId]: !currentlyBanned }));
    toast.success(currentlyBanned ? t('admin.userUnbanned') : t('admin.userBanned'));
  };

  const searchPro = async (query: string) => {
    setProQuery(query);
    if (query.trim().length < 2) { setProResults([]); return; }
    setProSearching(true);
    const { data } = await supabase.from('profiles').select('user_id, name, photo_url, is_pro').ilike('name', `%${query.trim()}%`).limit(10);
    setProSearching(false);
    setProResults(data || []);
  };

  const togglePro = async (target: ProSearchResult) => {
    setProUpdatingId(target.user_id);
    const { error } = await supabase.from('profiles').update({ is_pro: !target.is_pro }).eq('user_id', target.user_id);
    setProUpdatingId(null);
    if (error) { toast.error(t('admin.proStatusError')); return; }
    setProResults(prev => prev.map(p => p.user_id === target.user_id ? { ...p, is_pro: !p.is_pro } : p));
    toast.success(target.is_pro ? t('admin.userRemovedPro') : t('admin.userMadePro'));
  };

  if (authLoading || !isAdmin) return null;

  return (
    <div className="min-h-screen pb-16 bg-background">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/50">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="h-10 w-10 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-destructive" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold">{t('admin.title')}</h1>
            <p className="text-xs text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif' }}>{t('admin.subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6">
        {/* Sections */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setSection('reports')}
            className={cn('flex-1 rounded-full px-4 py-2.5 text-sm font-medium transition-all',
              section === 'reports' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-secondary text-muted-foreground')}
            style={{ fontFamily: 'Jost, sans-serif' }}>
            {t('admin.title')}
          </button>
          <button onClick={() => setSection('pro')}
            className={cn('flex-1 rounded-full px-4 py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-1.5',
              section === 'pro' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-secondary text-muted-foreground')}
            style={{ fontFamily: 'Jost, sans-serif' }}>
            <Store className="h-3.5 w-3.5" /> {t('admin.proTitle')}
          </button>
          <button onClick={() => setSection('stats')}
            className={cn('flex-1 rounded-full px-4 py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-1.5',
              section === 'stats' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-secondary text-muted-foreground')}
            style={{ fontFamily: 'Jost, sans-serif' }}>
            <BarChart3 className="h-3.5 w-3.5" /> {t('admin.statsTitle')}
          </button>
        </div>

        {section === 'stats' && <AdminStatsPanel />}

        {section === 'pro' && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input value={proQuery} onChange={e => searchPro(e.target.value)}
                placeholder={t('admin.proSearchPlaceholder')}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
                style={{ fontFamily: 'Jost, sans-serif' }} />
            </div>

            {proQuery.trim().length < 2 ? (
              <p className="text-center text-sm text-muted-foreground py-8" style={{ fontFamily: 'Jost, sans-serif' }}>{t('admin.proSearchHint')}</p>
            ) : proSearching ? (
              <div className="space-y-3">
                {[1, 2].map(i => <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse" />)}
              </div>
            ) : proResults.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8" style={{ fontFamily: 'Jost, sans-serif' }}>{t('admin.proNoResults')}</p>
            ) : (
              proResults.map(p => (
                <div key={p.user_id} className="card-premium p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-ocean-light flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {p.photo_url ? <img src={p.photo_url} alt="" className="h-full w-full object-cover" /> : <Store className="h-4 w-4 text-primary" />}
                  </div>
                  <span className="flex-1 text-sm font-medium truncate" style={{ fontFamily: 'Jost, sans-serif' }}>
                    {p.name || t('admin.defaultUser')}
                  </span>
                  <button onClick={() => togglePro(p)} disabled={proUpdatingId === p.user_id}
                    className={cn('flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-full flex-shrink-0 disabled:opacity-50',
                      p.is_pro ? 'bg-secondary text-muted-foreground' : 'bg-gradient-to-r from-sky-400 to-blue-600 text-white')}>
                    <Store className="h-3.5 w-3.5" /> {p.is_pro ? t('admin.removePro') : t('admin.makePro')}
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {section === 'reports' && <>
        {/* Filtres */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {([
            { id: 'pending', labelKey: 'admin.filterPending' },
            { id: 'reviewed', labelKey: 'admin.filterReviewed' },
            { id: 'dismissed', labelKey: 'admin.filterDismissed' },
            { id: 'all', labelKey: 'admin.filterAll' },
          ] as const).map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={cn('rounded-full px-4 py-2 text-sm font-medium transition-all flex-shrink-0',
                filter === f.id ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-secondary text-muted-foreground')}
              style={{ fontFamily: 'Jost, sans-serif' }}>
              {t(f.labelKey)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-2xl bg-muted animate-pulse" />)}
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">✅</div>
            <h3 className="font-display text-xl mb-2">{t('admin.nothingToReport')}</h3>
            <p className="text-sm text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif' }}>
              {t('admin.noReportsInCategory')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map(report => {
              const reasonLabel = REPORT_REASONS.find(r => r.value === report.reason) ? t(`reportReasons.${report.reason}`) : report.reason;
              const isBanned = report.target_user_id ? bannedStatus[report.target_user_id] : false;
              return (
                <div key={report.id} className="card-premium p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="pill bg-ocean-light text-primary mb-1.5 inline-block">
                        {t(`admin.targetType.${report.target_type}`, { defaultValue: report.target_type })}
                      </span>
                      <h3 className="font-display text-lg font-semibold">{reasonLabel}</h3>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0" style={{ fontFamily: 'Jost, sans-serif' }}>
                      {new Date(report.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {reportedContent[report.target_id] && (
                    <div className="rounded-xl bg-secondary/60 px-3 py-2.5">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1" style={{ fontFamily: 'Jost, sans-serif' }}>
                        {t('admin.reportedContentLabel')}
                      </p>
                      <p className="text-sm" style={{ fontFamily: 'Jost, sans-serif', lineHeight: 1.6 }}>
                        {reportedContent[report.target_id]}
                      </p>
                    </div>
                  )}

                  {report.details && (
                    <p className="text-sm text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif', lineHeight: 1.6 }}>
                      « {report.details} »
                    </p>
                  )}

                  <div className="text-xs text-muted-foreground space-y-0.5" style={{ fontFamily: 'Jost, sans-serif' }}>
                    <p>{t('admin.reportedBy')} <span className="font-medium text-foreground">{reporterNames[report.reporter_id] || '...'}</span></p>
                    {report.target_user_id && (
                      <p>{t('admin.concerns')} <span className="font-medium text-foreground">{targetNames[report.target_user_id] || '...'}</span>
                        {isBanned && <span className="ml-2 pill bg-destructive/10 text-destructive">{t('admin.banned')}</span>}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {report.status === 'pending' && (
                      <>
                        <button onClick={() => updateStatus(report.id, 'reviewed')}
                          className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-full bg-pine-light text-pine">
                          <Check className="h-3.5 w-3.5" /> {t('admin.markReviewed')}
                        </button>
                        <button onClick={() => updateStatus(report.id, 'dismissed')}
                          className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-full bg-secondary text-muted-foreground">
                          <X className="h-3.5 w-3.5" /> {t('admin.dismiss')}
                        </button>
                      </>
                    )}
                    {report.target_user_id && (
                      <button onClick={() => toggleBan(report.target_user_id!)}
                        className={cn('flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-full',
                          isBanned ? 'bg-secondary text-muted-foreground' : 'bg-destructive/10 text-destructive')}>
                        {isBanned ? <ShieldOff className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                        {isBanned ? t('admin.unban') : t('admin.ban')}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </>}
      </div>
    </div>
  );
}
