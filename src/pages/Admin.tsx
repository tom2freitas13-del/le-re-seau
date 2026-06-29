import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, Check, X, Ban, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';
import { REPORT_REASONS } from '@/lib/constants';
import { cn } from '@/lib/utils';

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

const TARGET_TYPE_LABELS: Record<string, string> = {
  profile: 'Profil',
  message: 'Message privé',
  group_message: 'Message de groupe',
  salon_message: 'Message de salon',
  forum_post: 'Post du forum',
  forum_comment: 'Commentaire',
  job_offer: "Offre d'emploi",
  job_request: 'Demande de service',
  activity: 'Activité',
};

/**
 * Espace de modération réservé aux admins (is_admin = true dans profiles).
 * Permet de voir les signalements en attente, de bannir un utilisateur,
 * ou de classer un signalement sans suite.
 */
export default function Admin() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [reporterNames, setReporterNames] = useState<Record<string, string>>({});
  const [targetNames, setTargetNames] = useState<Record<string, string>>({});
  const [bannedStatus, setBannedStatus] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState<'pending' | 'reviewed' | 'dismissed' | 'all'>('pending');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/auth'); return; }
    if (!isAdmin) { navigate('/'); return; }
    loadReports();
  }, [user, isAdmin, authLoading, filter]);

  const loadReports = async () => {
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
        (profiles || []).forEach(p => { names[p.user_id] = p.name || 'Utilisateur'; banned[p.user_id] = p.is_banned; });
        setReporterNames(names);
        setTargetNames(names);
        setBannedStatus(banned);
      }
    }
    setLoading(false);
  };

  const updateStatus = async (reportId: string, status: 'reviewed' | 'dismissed') => {
    if (!user) return;
    const { error } = await supabase.from('reports').update({ status, reviewed_at: new Date().toISOString(), reviewed_by: user.id }).eq('id', reportId);
    if (error) { toast.error('Erreur lors de la mise à jour.'); return; }
    setReports(prev => prev.filter(r => r.id !== reportId));
    toast.success(status === 'reviewed' ? 'Signalement traité.' : 'Signalement classé sans suite.');
  };

  const toggleBan = async (targetUserId: string) => {
    const currentlyBanned = bannedStatus[targetUserId];
    const { error } = await supabase.from('profiles').update({ is_banned: !currentlyBanned }).eq('user_id', targetUserId);
    if (error) { toast.error('Erreur lors de la mise à jour du statut.'); return; }
    setBannedStatus(prev => ({ ...prev, [targetUserId]: !currentlyBanned }));
    toast.success(currentlyBanned ? 'Utilisateur débanni.' : 'Utilisateur banni.');
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
            <h1 className="font-display text-2xl font-semibold">Modération</h1>
            <p className="text-xs text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif' }}>Espace réservé aux admins</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6">
        {/* Filtres */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {([
            { id: 'pending', label: 'À traiter' },
            { id: 'reviewed', label: 'Traités' },
            { id: 'dismissed', label: 'Classés' },
            { id: 'all', label: 'Tous' },
          ] as const).map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={cn('rounded-full px-4 py-2 text-sm font-medium transition-all flex-shrink-0',
                filter === f.id ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-secondary text-muted-foreground')}
              style={{ fontFamily: 'Jost, sans-serif' }}>
              {f.label}
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
            <h3 className="font-display text-xl mb-2">Rien à signaler</h3>
            <p className="text-sm text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif' }}>
              Aucun signalement dans cette catégorie.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map(report => {
              const reasonLabel = REPORT_REASONS.find(r => r.value === report.reason)?.label || report.reason;
              const isBanned = report.target_user_id ? bannedStatus[report.target_user_id] : false;
              return (
                <div key={report.id} className="card-premium p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="pill bg-ocean-light text-primary mb-1.5 inline-block">
                        {TARGET_TYPE_LABELS[report.target_type] || report.target_type}
                      </span>
                      <h3 className="font-display text-lg font-semibold">{reasonLabel}</h3>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0" style={{ fontFamily: 'Jost, sans-serif' }}>
                      {new Date(report.created_at).toLocaleDateString('fr-FR')}
                    </span>
                  </div>

                  {report.details && (
                    <p className="text-sm text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif', lineHeight: 1.6 }}>
                      « {report.details} »
                    </p>
                  )}

                  <div className="text-xs text-muted-foreground space-y-0.5" style={{ fontFamily: 'Jost, sans-serif' }}>
                    <p>Signalé par : <span className="font-medium text-foreground">{reporterNames[report.reporter_id] || '...'}</span></p>
                    {report.target_user_id && (
                      <p>Concerne : <span className="font-medium text-foreground">{targetNames[report.target_user_id] || '...'}</span>
                        {isBanned && <span className="ml-2 pill bg-destructive/10 text-destructive">Banni</span>}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {report.status === 'pending' && (
                      <>
                        <button onClick={() => updateStatus(report.id, 'reviewed')}
                          className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-full bg-pine-light text-pine">
                          <Check className="h-3.5 w-3.5" /> Marquer traité
                        </button>
                        <button onClick={() => updateStatus(report.id, 'dismissed')}
                          className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-full bg-secondary text-muted-foreground">
                          <X className="h-3.5 w-3.5" /> Classer sans suite
                        </button>
                      </>
                    )}
                    {report.target_user_id && (
                      <button onClick={() => toggleBan(report.target_user_id!)}
                        className={cn('flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-full',
                          isBanned ? 'bg-secondary text-muted-foreground' : 'bg-destructive/10 text-destructive')}>
                        {isBanned ? <ShieldOff className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                        {isBanned ? 'Débannir' : "Bannir l'utilisateur"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
