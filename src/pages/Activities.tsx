import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import BottomNav from '@/components/BottomNav';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Calendar, MapPin, Users, Trash2, Map as MapIcon, MessageCircle, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { ACTIVITY_CATEGORIES, avatarFallbackInitial } from '@/lib/constants';
import { cn } from '@/lib/utils';
import LocalImage from '@/components/LocalImage';
import { shareToWhatsApp } from '@/lib/share';
import { setPostAuthRedirect } from '@/lib/postAuthRedirect';

interface Participant {
  user_id: string;
  name: string | null;
  photo_url: string | null;
}

interface Activity {
  id: string;
  author_id: string;
  title: string;
  description: string | null;
  category: string | null;
  location: string | null;
  activity_date: string | null;
  activity_time: string | null;
  min_age: number | null;
  max_participants: number | null;
  photo_url: string | null;
  group_id: string | null;
}

// BUG FIX : l'ancien fallback utilisait de fausses photos stock (dont un portrait
// de visage affiché comme "photo plage"). Priorité d'affichage pour chaque activité :
// 1) la photo uploadée par l'organisateur (activity.photo_url)
// 2) une photo locale par défaut si tu en mets une dans public/images/activities/
// 3) sinon un visuel emoji + couleur (toujours fiable, jamais cassé)
const CATEGORY_STYLE: Record<string, { bg: string; emoji: string; defaultPhoto: string }> = {
  plage: { bg: 'bg-ocean-light', emoji: '🏖️', defaultPhoto: '/images/activities/plage.jpg' },
  velo: { bg: 'bg-pine-light', emoji: '🚲', defaultPhoto: '/images/activities/velo.jpg' },
  surf: { bg: 'bg-ocean-light', emoji: '🏄', defaultPhoto: '/images/activities/surf.jpg' },
  apero: { bg: 'bg-sand-light', emoji: '🍷', defaultPhoto: '/images/activities/apero.jpg' },
  bateau: { bg: 'bg-ocean-light', emoji: '⛵', defaultPhoto: '/images/activities/bateau.jpg' },
  randonnee: { bg: 'bg-pine-light', emoji: '🥾', defaultPhoto: '/images/activities/randonnee.jpg' },
  sport: { bg: 'bg-sand-light', emoji: '🏃', defaultPhoto: '/images/activities/sport.jpg' },
  autre: { bg: 'bg-muted', emoji: '✨', defaultPhoto: '/images/activities/autre.jpg' },
};

export default function Activities() {
  const { t, i18n } = useTranslation();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { id: sharedActivityId } = useParams<{ id?: string }>();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [participantCounts, setParticipantCounts] = useState<Record<string, number>>({});
  const [participantsByActivity, setParticipantsByActivity] = useState<Record<string, Participant[]>>({});
  const [myParticipations, setMyParticipations] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [groupUnread, setGroupUnread] = useState<Record<string, number>>({});
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  // BUG FIX : la page chargeait TOUTES les activités jamais créées, triées
  // par date croissante — au bout de quelques mois, les activités passées
  // s'accumulaient en haut de la liste, avant celles à venir. On sépare
  // maintenant à venir / passées avec un bascule, comme Jobs et Social ont
  // déjà une recherche/filtre.
  const [showPast, setShowPast] = useState(false);
  const isPast = useCallback((a: Activity) => {
    if (!a.activity_date) return false;
    const today = new Date().toISOString().slice(0, 10);
    return a.activity_date < today;
  }, []);
  const visibleActivities = useMemo(() => {
    const filtered = activities.filter(a => showPast ? isPast(a) : !isPast(a));
    // Les activités passées sont chargées triées par date croissante (le
    // tri de la requête) ; on inverse pour voir la plus récente d'abord.
    return showPast ? [...filtered].reverse() : filtered;
  }, [activities, showPast, isPast]);

  const loadActivities = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('activities').select('*').order('activity_date', { ascending: true });
    if (data) {
      setActivities(data);
      const { data: parts } = await supabase.from('activity_participants').select('activity_id, user_id');
      if (parts) {
        const counts: Record<string, number> = {};
        const mine = new Set<string>();
        parts.forEach(p => {
          counts[p.activity_id] = (counts[p.activity_id] || 0) + 1;
          if (p.user_id === user?.id) mine.add(p.activity_id);
        });
        setParticipantCounts(counts);
        setMyParticipations(mine);

        const userIds = Array.from(new Set(parts.map(p => p.user_id)));
        if (userIds.length) {
          const { data: profiles } = await supabase.from('profiles').select('user_id, name, photo_url').in('user_id', userIds);
          const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
          const byActivity: Record<string, Participant[]> = {};
          parts.forEach(p => {
            const profile = profileMap.get(p.user_id);
            (byActivity[p.activity_id] ||= []).push({ user_id: p.user_id, name: profile?.name || null, photo_url: profile?.photo_url || null });
          });
          setParticipantsByActivity(byActivity);
        }
      }
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) {
      if (sharedActivityId) setPostAuthRedirect(`/activities/${sharedActivityId}`);
      navigate('/auth');
      return;
    }
    loadActivities();
  }, [user, navigate, loadActivities, sharedActivityId]);

  // Lien partagé (WhatsApp, etc.) vers une activité précise : une fois la
  // liste chargée, on la fait défiler jusqu'à cette carte et on la surligne
  // brièvement pour que la personne repère tout de suite laquelle c'est.
  useEffect(() => {
    if (loading || !sharedActivityId) return;
    const target = activities.find(a => a.id === sharedActivityId);
    if (!target) {
      toast.error(t('activities.sharedNotFound'));
      navigate('/activities', { replace: true });
      return;
    }
    // Un lien partagé peut pointer vers une activité désormais passée —
    // on bascule l'onglet plutôt que de dire "introuvable" à tort.
    if (isPast(target) !== showPast) { setShowPast(isPast(target)); return; }
    const el = document.getElementById(`activity-${sharedActivityId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightedId(sharedActivityId);
    const timeout = setTimeout(() => setHighlightedId(null), 3000);
    return () => clearTimeout(timeout);
  }, [loading, sharedActivityId, activities, navigate, t, isPast, showPast]);

  const loadGroupUnread = useCallback(async () => {
    if (!user) return;
    const relevantGroupIds = activities
      .filter(a => a.group_id && (a.author_id === user.id || myParticipations.has(a.id)))
      .map(a => a.group_id as string);
    if (!relevantGroupIds.length) { setGroupUnread({}); return; }

    const { data: reads } = await supabase.from('group_reads').select('group_id, last_read_at').eq('user_id', user.id).in('group_id', relevantGroupIds);
    const lastRead: Record<string, string> = {};
    (reads || []).forEach(r => { lastRead[r.group_id] = r.last_read_at; });

    const { data: msgs } = await supabase
      .from('chat_group_messages')
      .select('group_id, created_at')
      .in('group_id', relevantGroupIds)
      .neq('sender_id', user.id)
      .order('created_at', { ascending: false })
      .limit(500);

    const counts: Record<string, number> = {};
    (msgs || []).forEach(m => {
      const threshold = lastRead[m.group_id];
      if (!threshold || new Date(m.created_at) > new Date(threshold)) {
        counts[m.group_id] = (counts[m.group_id] || 0) + 1;
      }
    });
    setGroupUnread(counts);
  }, [user, activities, myParticipations]);

  useEffect(() => {
    if (!user || activities.length === 0) return;
    loadGroupUnread();
  }, [user, activities, loadGroupUnread]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`activity-group-unread-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_group_messages' }, () => loadGroupUnread())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, loadGroupUnread]);

  const toggleParticipation = async (activityId: string) => {
    if (!user) return;
    const isJoined = myParticipations.has(activityId);
    if (isJoined) {
      await supabase.from('activity_participants').delete().eq('activity_id', activityId).eq('user_id', user.id);
      setMyParticipations(prev => { const s = new Set(prev); s.delete(activityId); return s; });
      setParticipantCounts(prev => ({ ...prev, [activityId]: Math.max((prev[activityId] || 1) - 1, 0) }));
    } else {
      const { error } = await supabase.from('activity_participants').insert({ activity_id: activityId, user_id: user.id });
      if (!error) {
        setMyParticipations(prev => new Set(prev).add(activityId));
        setParticipantCounts(prev => ({ ...prev, [activityId]: (prev[activityId] || 0) + 1 }));
        toast.success(t('activities.joinConfirmed'));
      }
    }
  };

  // BUG FIX (#6) : suppression de sa propre activité désormais possible.
  // Les admins peuvent aussi supprimer n'importe quelle activité (modération) —
  // la policy RLS l'autorise, donc on ne filtre pas sur author_id ici pour
  // ne pas bloquer silencieusement la suppression par un admin.
  const handleDelete = async (id: string) => {
    if (!user) return;
    setDeletingId(id);
    const { error } = await supabase.from('activities').delete().eq('id', id);
    if (error) toast.error(t('activities.deleteError'));
    else {
      toast.success(t('activities.deleted'));
      setActivities(prev => prev.filter(a => a.id !== id));
    }
    setDeletingId(null);
  };

  const formatDate = (d: string | null) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  const handleShareActivity = (activity: Activity) => {
    const when = [formatDate(activity.activity_date), activity.activity_time, activity.location ? `📍 ${activity.location}` : null]
      .filter(Boolean).join(' · ');
    const message = t('activities.shareMessage', {
      title: activity.title,
      when: when || t('activities.shareMessageNoDate'),
      link: `${window.location.origin}/activities/${activity.id}`,
    });
    shareToWhatsApp(message);
  };

  return (
    <div className="min-h-screen pb-28 bg-background">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-pine-light flex items-center justify-center">
              <Calendar className="h-5 w-5 text-pine" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="font-display text-2xl font-semibold">{t('activities.title')}</h1>
              <p className="text-xs text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif' }}>{t('activities.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/map')} title={t('activities.viewOnMap')}
              className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-ocean-light hover:text-primary transition-colors">
              <MapIcon className="h-4 w-4" />
            </button>
            <button onClick={() => navigate('/activities/new')} className="btn-ocean flex items-center gap-1.5 py-2.5">
              <Plus className="h-4 w-4" /> {t('activities.create')}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6">
        {!loading && (
          <div className="flex gap-2 mb-5">
            <button onClick={() => setShowPast(false)}
              className={cn(
                'flex-1 rounded-full py-2.5 text-sm font-medium transition-all duration-200 border',
                !showPast
                  ? 'border-primary bg-primary text-white shadow-md shadow-primary/20'
                  : 'border-border bg-background hover:bg-secondary text-foreground'
              )}
              style={{ fontFamily: 'Jost, sans-serif' }}>
              {t('activities.upcomingTab')}
            </button>
            <button onClick={() => setShowPast(true)}
              className={cn(
                'flex-1 rounded-full py-2.5 text-sm font-medium transition-all duration-200 border',
                showPast
                  ? 'border-primary bg-primary text-white shadow-md shadow-primary/20'
                  : 'border-border bg-background hover:bg-secondary text-foreground'
              )}
              style={{ fontFamily: 'Jost, sans-serif' }}>
              {t('activities.pastTab')}
            </button>
          </div>
        )}
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-44 rounded-2xl bg-muted animate-pulse" />)}
          </div>
        ) : visibleActivities.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">{showPast ? '🗓️' : '📅'}</div>
            <h3 className="font-display text-xl mb-2">{showPast ? t('activities.noPastActivities') : t('activities.noneScheduled')}</h3>
            {!showPast && (
              <>
                <p className="text-sm text-muted-foreground mb-6" style={{ fontFamily: 'Jost, sans-serif' }}>
                  {t('activities.beFirst')}
                </p>
                <button onClick={() => navigate('/activities/new')} className="btn-ocean">{t('activities.createOne')}</button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {visibleActivities.map(activity => {
              const cat = ACTIVITY_CATEGORIES.find(c => c.value === activity.category);
              const isMine = activity.author_id === user?.id;
              const canDelete = isMine || isAdmin;
              const joined = myParticipations.has(activity.id);
              const style = CATEGORY_STYLE[activity.category || 'autre'];
              return (
                <div
                  key={activity.id}
                  id={`activity-${activity.id}`}
                  className={cn(
                    'card-premium overflow-hidden transition-shadow duration-500',
                    highlightedId === activity.id && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                  )}>
                  <div className={`relative aspect-[16/9] overflow-hidden ${style.bg} flex items-center justify-center`}>
                    {activity.photo_url ? (
                      <img src={activity.photo_url} alt={activity.title} className="h-full w-full object-cover" />
                    ) : (
                      <LocalImage
                        src={style.defaultPhoto}
                        alt={activity.title}
                        fallbackEmoji={style.emoji}
                        fallbackBg={style.bg}
                        className="w-full h-full"
                      />
                    )}
                    {cat && (
                      <span className="absolute top-3 left-3 pill glass">{cat.emoji} {t(`activityCategories.${cat.value}`)}</span>
                    )}
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      <button
                        onClick={() => handleShareActivity(activity)}
                        title={t('activities.shareWhatsApp')}
                        className="h-9 w-9 rounded-full glass flex items-center justify-center text-[#25D366] hover:bg-[#25D366]/10 transition-colors">
                        <Share2 className="h-4 w-4" />
                      </button>
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(activity.id)}
                          disabled={deletingId === activity.id}
                          title={isMine ? t('activities.deleteMine') : t('activities.deleteModeration')}
                          className="h-9 w-9 rounded-full glass flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="p-5 space-y-3">
                    <h3 className="font-display text-xl font-semibold">{activity.title}</h3>
                    {activity.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2" style={{ fontFamily: 'Jost, sans-serif', lineHeight: 1.6 }}>
                        {activity.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 text-xs">
                      {activity.activity_date && (
                        <span className="pill bg-ocean-light text-primary flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {formatDate(activity.activity_date)}{activity.activity_time ? ` · ${activity.activity_time}` : ''}
                        </span>
                      )}
                      {activity.location && (
                        <span className="pill bg-muted text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {activity.location}
                        </span>
                      )}
                      {activity.min_age != null && activity.min_age > 0 && (
                        <span className="pill bg-sand-light text-sand-dark">{t('activities.minAge', { age: activity.min_age })}</span>
                      )}
                      <span className="pill bg-pine-light text-pine flex items-center gap-1">
                        <Users className="h-3 w-3" /> {participantCounts[activity.id] || 0}
                        {activity.max_participants ? ` / ${activity.max_participants}` : ''}
                      </span>
                    </div>
                    {(participantsByActivity[activity.id]?.length || 0) > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2 flex-shrink-0">
                          {participantsByActivity[activity.id].slice(0, 4).map(p => (
                            <div key={p.user_id} title={p.name || t('admin.defaultUser')}
                              className="h-7 w-7 rounded-full bg-ocean-light border-2 border-card overflow-hidden flex items-center justify-center">
                              {p.photo_url ? (
                                <img src={p.photo_url} alt={p.name || ''} className="h-full w-full object-cover" />
                              ) : (
                                <span className="font-display text-xs text-primary/60">{avatarFallbackInitial(p.name)}</span>
                              )}
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground truncate" style={{ fontFamily: 'Jost, sans-serif' }}>
                          {(() => {
                            const names = participantsByActivity[activity.id].map(p => p.name || t('activities.someone'));
                            if (names.length <= 2) return names.join(` ${t('activities.and')} `);
                            return `${names.slice(0, 2).join(', ')} ${t('activities.andOthers', { count: names.length - 2 })}`;
                          })()}
                        </p>
                      </div>
                    )}
                    {isMine ? (
                      <div className="space-y-2">
                        <p className="text-xs text-center text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif' }}>
                          {t('activities.itsYours')}
                        </p>
                        {activity.group_id && (
                          <button onClick={() => navigate(`/groups/${activity.group_id}`)}
                            className="btn-ghost w-full flex items-center justify-center gap-2 relative">
                            <MessageCircle className="h-4 w-4" /> {t('activities.discuss')}
                            {activity.group_id && groupUnread[activity.group_id] > 0 && (
                              <span className="absolute top-1 right-3 h-5 min-w-[20px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
                                {groupUnread[activity.group_id] > 9 ? '9+' : groupUnread[activity.group_id]}
                              </span>
                            )}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <button
                          onClick={() => toggleParticipation(activity.id)}
                          disabled={!!activity.max_participants && !joined && (participantCounts[activity.id] || 0) >= activity.max_participants}
                          className={joined ? 'btn-ghost w-full disabled:opacity-50' : 'btn-ocean w-full disabled:opacity-50'}>
                          {joined ? t('activities.leave') : t('activities.join')}
                        </button>
                        {joined && activity.group_id && (
                          <button onClick={() => navigate(`/groups/${activity.group_id}`)}
                            className="btn-ghost w-full flex items-center justify-center gap-2 relative">
                            <MessageCircle className="h-4 w-4" /> {t('activities.discuss')}
                            {groupUnread[activity.group_id] > 0 && (
                              <span className="absolute top-1 right-3 h-5 min-w-[20px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
                                {groupUnread[activity.group_id] > 9 ? '9+' : groupUnread[activity.group_id]}
                              </span>
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
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
