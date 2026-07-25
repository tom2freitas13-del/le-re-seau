import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import BottomNav from '@/components/BottomNav';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, MapPin, Clock, Euro, MessageCircle, Briefcase, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useBlockedUsers } from '@/lib/useBlockedUsers';

interface JobItem {
  id: string;
  author_id: string;
  title: string;
  description: string | null;
  location?: string | null;
  date?: string | null;
  needed_date?: string | null;
  availability?: string | null;
  pay?: string | null;
  created_at: string;
}

// Demandes de service : pas de date précise (juste "le week-end", "tous les
// matins"...), donc on se base sur l'ancienneté de publication. Doit rester
// cohérent avec le seuil de suppression de la migration 037
// (63 jours = 60 + 3 jours de grâce "Expiré").
const JOB_REQUEST_STALE_DAYS = 60;

export default function Jobs() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { isBlocked } = useBlockedUsers();
  const navigate = useNavigate();
  const [offers, setOffers] = useState<JobItem[]>([]);
  const [requests, setRequests] = useState<JobItem[]>([]);
  const [activeTab, setActiveTab] = useState<'offers' | 'requests'>('offers');
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    loadData();
  }, [user, navigate]);

  const loadData = async () => {
    const [o, r] = await Promise.all([
      supabase.from('job_offers').select('*').order('created_at', { ascending: false }),
      supabase.from('job_requests').select('*').order('created_at', { ascending: false }),
    ]);
    if (o.data) setOffers(o.data);
    if (r.data) setRequests(r.data);
  };

  // BUG FIX (#7) : suppression de ses propres annonces, désormais possible.
  // La policy RLS côté Supabase garantit déjà qu'on ne peut supprimer
  // que ses propres lignes (author_id = auth.uid()), même si ce check
  // côté client était contourné.
  const handleDelete = async (id: string, table: 'job_offers' | 'job_requests') => {
    if (!user) return;
    setDeletingId(id);
    const { error } = await supabase.from(table).delete().eq('id', id).eq('author_id', user.id);
    if (error) {
      toast.error(t('jobs.deleteError'));
    } else {
      toast.success(t('jobs.deleted'));
      if (table === 'job_offers') setOffers(prev => prev.filter(o => o.id !== id));
      else setRequests(prev => prev.filter(r => r.id !== id));
    }
    setDeletingId(null);
  };

  const currentList = (activeTab === 'offers' ? offers : requests)
    .filter(item => !isBlocked(item.author_id))
    .filter(item => !search || item.title?.toLowerCase().includes(search.toLowerCase()) || item.description?.toLowerCase().includes(search.toLowerCase()));

  // Offre : expirée si sa date précise est passée. Demande : pas de date
  // exploitable, donc expirée par ancienneté de publication à la place.
  const isExpired = (item: JobItem, table: 'offers' | 'requests') => {
    if (table === 'offers') {
      return !!item.needed_date && item.needed_date < new Date().toISOString().slice(0, 10);
    }
    const ageDays = (Date.now() - new Date(item.created_at).getTime()) / 86400000;
    return ageDays > JOB_REQUEST_STALE_DAYS;
  };

  const formatNeededDate = (d: string) =>
    new Date(d).toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <div className="min-h-screen pb-28 bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-sand-light flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-gold" strokeWidth={1.5} />
              </div>
              <div>
                <h1 className="font-display text-2xl font-semibold">{t('jobs.title')}</h1>
                <p className="text-xs text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif' }}>{t('jobs.subtitle')}</p>
              </div>
            </div>
            <button onClick={() => navigate('/jobs/new')} className="btn-ocean flex items-center gap-1.5 py-2.5">
              <Plus className="h-4 w-4" /> {t('jobs.publish')}
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('jobs.searchPlaceholder')}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
              style={{ fontFamily: 'Jost, sans-serif' }}
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <button onClick={() => setActiveTab('offers')}
              className={cn('flex-1 rounded-full py-2 text-sm font-medium transition-all', activeTab === 'offers' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-secondary text-muted-foreground')}
              style={{ fontFamily: 'Jost, sans-serif' }}>
              {t('jobs.offers', { count: offers.length })}
            </button>
            <button onClick={() => setActiveTab('requests')}
              className={cn('flex-1 rounded-full py-2 text-sm font-medium transition-all', activeTab === 'requests' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-secondary text-muted-foreground')}
              style={{ fontFamily: 'Jost, sans-serif' }}>
              {t('jobs.requests', { count: requests.length })}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6">
        {currentList.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">{activeTab === 'offers' ? '💼' : '🙋'}</div>
            <h3 className="font-display text-xl mb-2">
              {search ? t('jobs.noResults') : t('jobs.noneYet')}
            </h3>
            <p className="text-sm text-muted-foreground mb-6" style={{ fontFamily: 'Jost, sans-serif' }}>
              {search ? t('jobs.tryOtherKeyword') : t('jobs.beFirstToPublish')}
            </p>
            {!search && (
              <button onClick={() => navigate('/jobs/new')} className="btn-ocean">
                {t('jobs.publishAd')}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {currentList.map(item => {
              const isMine = item.author_id === user?.id;
              const table = activeTab === 'offers' ? 'job_offers' : 'job_requests';
              const expired = isExpired(item, activeTab);
              return (
                <div key={item.id} className={cn('card-premium p-5 space-y-3', expired && 'opacity-60')}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h3 className="font-display text-lg font-semibold mb-1">{item.title}</h3>
                      {item.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2" style={{ fontFamily: 'Jost, sans-serif', lineHeight: 1.6 }}>
                          {item.description}
                        </p>
                      )}
                    </div>
                    {isMine && (
                      <button
                        onClick={() => handleDelete(item.id, table)}
                        disabled={deletingId === item.id}
                        title={t('jobs.deleteMine')}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded-lg hover:bg-destructive/10 disabled:opacity-50 flex-shrink-0">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {expired && (
                      <span className="pill bg-destructive/10 text-destructive font-semibold">{t('jobs.expired')}</span>
                    )}
                    {isMine && (
                      <span className="pill bg-pine-light text-pine">{t('jobs.yourAd')}</span>
                    )}
                    {item.location && (
                      <span className="pill bg-ocean-light text-primary flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {item.location}
                      </span>
                    )}
                    {(item.needed_date || item.date || item.availability) && (
                      <span className="pill bg-muted text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {item.needed_date ? formatNeededDate(item.needed_date) : (item.date || item.availability)}
                      </span>
                    )}
                    {item.pay && (
                      <span className="pill bg-sand-light text-sand-dark flex items-center gap-1 font-semibold">
                        <Euro className="h-3 w-3" /> {item.pay}
                      </span>
                    )}
                  </div>

                  {!isMine && (
                    <button
                      onClick={() => navigate(`/chat/${item.author_id}`)}
                      className="btn-ghost w-full flex items-center justify-center gap-2 py-2.5">
                      <MessageCircle className="h-4 w-4" />
                      {activeTab === 'offers' ? t('jobs.replyToOffer') : t('jobs.contact')}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
