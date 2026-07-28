import { useCallback, useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import BottomNav from '@/components/BottomNav';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MessageCircle, Send, ArrowLeft, Heart, MessageSquare, Mail, Mic, Square, Image as ImageIcon, X, Plus, Users, Check, Briefcase, Search, Sparkles, Trash2 } from 'lucide-react';
import { computeMatchScore } from '@/lib/matchScore';
import { SALONS } from '@/lib/constants';
import { toast } from 'sonner';
import { avatarFallbackInitial, formatMessageTime, FORUM_CATEGORIES, normalizeForumTag } from '@/lib/constants';
import { useTimeTick } from '@/lib/useTimeTick';
import { cn } from '@/lib/utils';
import { ReportButton } from '@/components/ReportModal';
import { useBlockedUsers } from '@/lib/useBlockedUsers';
import { usePresence } from '@/lib/presence-context';
import { useUnreadMessages } from '@/lib/unread-context';
import { MAX_PHOTO_SIZE_MB, pickAudioMimeType, uploadVoiceMessage, uploadPhoto } from '@/lib/attachments';
import { useMessageLikesAndReads } from '@/lib/useMessageLikesAndReads';
import MessagePeopleModal from '@/components/MessagePeopleModal';
import MessageLikeReadRow from '@/components/MessageLikeReadRow';
import { useLongPress } from '@/lib/useLongPress';
import MiniProfileModal from '@/components/MiniProfileModal';
import ConfirmDialog from '@/components/ConfirmDialog';

interface SalonMessage {
  id: string;
  salon: string;
  user_id: string;
  content: string;
  attachment_url?: string | null;
  attachment_type?: 'audio' | 'image' | null;
  created_at: string;
}

interface ForumPost {
  id: string;
  author_id: string;
  content: string;
  tag: string | null;
  attachment_url?: string | null;
  attachment_type?: 'audio' | 'image' | null;
  created_at: string;
}

interface PrivateConversation {
  partnerId: string;
  partnerName: string;
  partnerPhoto: string | null;
  lastMessage: string;
  lastDate: string;
  unreadCount: number;
}

interface GroupItem {
  id: string;
  name: string;
  emoji: string | null;
  description: string | null;
}

interface SuggestedProfile {
  user_id: string;
  name: string | null;
  photo_url: string | null;
  score: number;
}

interface SearchedProfile {
  user_id: string;
  name: string | null;
  photo_url: string | null;
}

export default function Discussions() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<'list' | 'salon' | 'forum' | 'messages'>('list');
  const [activeSalon, setActiveSalon] = useState<string | null>(null);
  const { onlineCount } = usePresence();
  const { unreadTotal } = useUnreadMessages();
  const [salonUnread, setSalonUnread] = useState<Record<string, number>>({});
  const [forumUnread, setForumUnread] = useState(0);

  useEffect(() => { if (!user) navigate('/auth'); }, [user, navigate]);

  const loadForumUnread = useCallback(async () => {
    if (!user) return;
    const { data: read } = await supabase.from('forum_reads').select('last_read_at').eq('user_id', user.id).maybeSingle();
    let query = supabase.from('forum_posts').select('*', { count: 'exact', head: true }).neq('author_id', user.id);
    if (read) query = query.gt('created_at', read.last_read_at);
    const { count } = await query;
    setForumUnread(count || 0);
  }, [user]);

  const loadSalonUnread = useCallback(async () => {
    if (!user) return;
    const { data: reads } = await supabase.from('salon_reads').select('salon, last_read_at').eq('user_id', user.id);
    const lastRead: Record<string, string> = {};
    (reads || []).forEach(r => { lastRead[r.salon] = r.last_read_at; });

    const { data: msgs } = await supabase
      .from('salon_messages')
      .select('salon, created_at')
      .neq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(500);

    const counts: Record<string, number> = {};
    (msgs || []).forEach(m => {
      const threshold = lastRead[m.salon];
      if (!threshold || new Date(m.created_at) > new Date(threshold)) {
        counts[m.salon] = (counts[m.salon] || 0) + 1;
      }
    });
    setSalonUnread(counts);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadSalonUnread();
    const channel = supabase
      .channel(`salon-unread-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'salon_messages' }, () => loadSalonUnread())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, loadSalonUnread]);

  useEffect(() => {
    if (!user) return;
    loadForumUnread();
    const channel = supabase
      .channel(`forum-unread-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'forum_posts' }, () => loadForumUnread())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, loadForumUnread]);

  if (view === 'salon' && activeSalon) {
    return <SalonView salonId={activeSalon} onBack={() => { setView('list'); loadSalonUnread(); }} />;
  }
  if (view === 'forum') {
    return <ForumView onBack={() => { setView('list'); loadForumUnread(); }} />;
  }
  if (view === 'messages') {
    return <MessagesView onBack={() => setView('list')} />;
  }

  return (
    <div className="min-h-screen pb-28 bg-background">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-ocean-light flex items-center justify-center">
            <MessageCircle className="h-5 w-5 text-primary" strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold">{t('discussions.title')}</h1>
            {onlineCount > 0 && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5" style={{ fontFamily: 'Jost, sans-serif' }}>
                <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                {t('home.onlineCount', { count: onlineCount })}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">
        {/* Messages privés — style Insta, avec pastille de non-lus */}
        <button onClick={() => setView('messages')} className="card-premium p-5 w-full text-left flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-ocean-light flex items-center justify-center flex-shrink-0 relative">
            <Mail className="h-6 w-6 text-primary" strokeWidth={1.5} />
            {unreadTotal > 0 && (
              <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
                {unreadTotal > 9 ? '9+' : unreadTotal}
              </span>
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-display text-xl font-semibold">{t('discussions.privateMessages')}</h3>
            <p className="text-sm text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif' }}>{t('discussions.privateMessagesDesc')}</p>
          </div>
        </button>

        <button onClick={() => setView('forum')} className="card-premium p-5 w-full text-left flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-sand-light flex items-center justify-center text-2xl flex-shrink-0 relative">
            📰
            {forumUnread > 0 && (
              <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
                {forumUnread > 9 ? '9+' : forumUnread}
              </span>
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-display text-xl font-semibold">{t('discussions.forum')}</h3>
            <p className="text-sm text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif' }}>{t('discussions.forumDesc')}</p>
          </div>
        </button>

        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2" style={{ fontFamily: 'Jost, sans-serif' }}>
            {t('discussions.themedRooms')}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {SALONS.map(s => (
              <button key={s.id} onClick={() => { setActiveSalon(s.id); setView('salon'); }}
                className="card-premium p-4 text-left relative">
                {salonUnread[s.id] > 0 && (
                  <span className="absolute top-2.5 right-2.5 h-5 min-w-[20px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
                    {salonUnread[s.id] > 9 ? '9+' : salonUnread[s.id]}
                  </span>
                )}
                <div className="text-2xl mb-1.5">{s.emoji}</div>
                <h3 className="font-medium text-sm mb-0.5" style={{ fontFamily: 'Jost, sans-serif' }}>{t(`salons.${s.id}.label`)}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2" style={{ fontFamily: 'Jost, sans-serif' }}>{t(`salons.${s.id}.desc`)}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2" style={{ fontFamily: 'Jost, sans-serif' }}>
            {t('discussions.mutualAid')}
          </h2>
          <button onClick={() => navigate('/jobs')} className="card-premium p-5 w-full text-left flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-sand-light flex items-center justify-center flex-shrink-0">
              <Briefcase className="h-6 w-6 text-gold" strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <h3 className="font-display text-xl font-semibold">{t('discussions.services')}</h3>
              <p className="text-sm text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif' }}>{t('discussions.servicesDesc')}</p>
            </div>
          </button>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MESSAGES PRIVÉS — liste des conversations façon Instagram,
// avec pastille de non-lus par conversation.
// ─────────────────────────────────────────────────────────────
function MessagesView({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<PrivateConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const { isBlocked } = useBlockedUsers();
  const { isOnline } = usePresence();
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [groupUnread, setGroupUnread] = useState<Record<string, number>>({});
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedProfile[]>([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<SearchedProfile[] | null>(null);
  const [searching, setSearching] = useState(false);

  const loadGroups = useCallback(async () => {
    if (!user) return;
    const { data: memberships } = await supabase.from('chat_group_members').select('group_id').eq('user_id', user.id);
    if (!memberships?.length) return;
    const ids = memberships.map(m => m.group_id);
    const { data } = await supabase.from('chat_groups').select('*').in('id', ids);
    if (data) setGroups(data);

    const { data: reads } = await supabase.from('group_reads').select('group_id, last_read_at').eq('user_id', user.id).in('group_id', ids);
    const lastRead: Record<string, string> = {};
    (reads || []).forEach(r => { lastRead[r.group_id] = r.last_read_at; });
    const { data: msgs } = await supabase
      .from('chat_group_messages')
      .select('group_id, created_at')
      .in('group_id', ids)
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
  }, [user]);

  const loadConversations = useCallback(async () => {
    if (!user) return;
    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (!messages) { setLoading(false); return; }

    const byPartner = new Map<string, typeof messages[0]>();
    const unreadByPartner = new Map<string, number>();
    for (const m of messages) {
      const partnerId = m.sender_id === user.id ? m.receiver_id : m.sender_id;
      if (!byPartner.has(partnerId)) byPartner.set(partnerId, m);
      if (m.receiver_id === user.id && m.read === false) {
        unreadByPartner.set(partnerId, (unreadByPartner.get(partnerId) || 0) + 1);
      }
    }

    const partnerIds = Array.from(byPartner.keys());
    if (partnerIds.length === 0) { setLoading(false); return; }

    const { data: profiles } = await supabase.from('profiles').select('user_id, name, photo_url').in('user_id', partnerIds);
    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

    const convos: PrivateConversation[] = partnerIds.map(pid => {
      const m = byPartner.get(pid)!;
      const profile = profileMap.get(pid);
      return {
        partnerId: pid,
        partnerName: profile?.name || t('messagesView.defaultUser'),
        partnerPhoto: profile?.photo_url || null,
        lastMessage: m.content,
        lastDate: m.created_at,
        unreadCount: unreadByPartner.get(pid) || 0,
      };
    });

    setConversations(convos);
    setLoading(false);
  }, [user, t]);

  // Suggère les membres avec qui discuter en priorité, sur le même calcul
  // d'affinité que Social — jusqu'ici il fallait passer par Communauté pour
  // trouver quelqu'un avec qui démarrer une conversation privée.
  const loadSuggestions = useCallback(async () => {
    if (!user) return;
    const { data: mine } = await supabase.from('profiles').select('interests, status, availability').eq('user_id', user.id).single();
    if (!mine?.interests?.length) return;
    const { data: others } = await supabase.from('profiles')
      .select('user_id, name, photo_url, interests, status, availability')
      .not('name', 'is', null).neq('user_id', user.id).limit(100);
    if (!others) return;
    const scored = others
      .map(o => ({ user_id: o.user_id, name: o.name, photo_url: o.photo_url, score: computeMatchScore(mine, o) }))
      .filter(o => o.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    setSuggestions(scored);
  }, [user]);

  useEffect(() => { loadConversations(); loadGroups(); loadSuggestions(); }, [loadConversations, loadGroups, loadSuggestions]);

  // Recherche par nom pour retrouver directement quelqu'un avec qui discuter,
  // sans passer par Communauté.
  useEffect(() => {
    if (!user) return;
    const q = search.trim();
    if (!q) { setSearchResults(null); return; }
    setSearching(true);
    const handle = setTimeout(async () => {
      const { data } = await supabase.from('profiles')
        .select('user_id, name, photo_url')
        .ilike('name', `${q}%`).not('name', 'is', null).neq('user_id', user.id).limit(20);
      setSearchResults(data || []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(handle);
  }, [search, user]);

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="font-display text-lg font-semibold">{t('messagesView.title')}</h1>
          </div>
          <button onClick={() => setShowCreateGroup(true)} className="btn-ocean flex items-center gap-1.5 py-2 px-3 text-sm">
            <Plus className="h-4 w-4" /> {t('messagesView.newGroup')}
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-6 pb-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('messagesView.searchPlaceholder')}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-base outline-none focus:ring-2 focus:ring-primary/20"
            style={{ fontFamily: 'Jost, sans-serif' }}
          />
        </div>

        {search.trim() ? (
          <div className="space-y-2">
            {searching ? (
              <div className="space-y-2">
                {[1, 2].map(i => <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse" />)}
              </div>
            ) : !searchResults?.filter(p => !isBlocked(p.user_id)).length ? (
              <p className="text-sm text-muted-foreground text-center py-8" style={{ fontFamily: 'Jost, sans-serif' }}>
                {t('messagesView.noSearchResults')}
              </p>
            ) : (
              searchResults.filter(p => !isBlocked(p.user_id)).map(p => (
                <button key={p.user_id} onClick={() => navigate(`/chat/${p.user_id}`)}
                  className="card-premium p-4 flex items-center gap-3 w-full text-left">
                  <div className="h-12 w-12 rounded-full overflow-hidden bg-ocean-light flex items-center justify-center flex-shrink-0">
                    {p.photo_url ? (
                      <img src={p.photo_url} alt={p.name || ''} className="h-full w-full object-cover" />
                    ) : (
                      <span className="font-display text-lg text-primary/60">{avatarFallbackInitial(p.name)}</span>
                    )}
                  </div>
                  <h3 className="font-medium text-sm" style={{ fontFamily: 'Jost, sans-serif' }}>{p.name || t('messagesView.defaultUser')}</h3>
                </button>
              ))
            )}
          </div>
        ) : (
          <>
            {suggestions.filter(s => !isBlocked(s.user_id) && !conversations.some(c => c.partnerId === s.user_id)).length > 0 && (
              <div>
                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ fontFamily: 'Jost, sans-serif' }}>
                  <Sparkles className="h-3.5 w-3.5" /> {t('messagesView.suggestionsTitle')}
                </h2>
                <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4">
                  {suggestions.filter(s => !isBlocked(s.user_id) && !conversations.some(c => c.partnerId === s.user_id)).map(s => (
                    <button key={s.user_id} onClick={() => navigate(`/chat/${s.user_id}`)}
                      className="flex flex-col items-center gap-1.5 flex-shrink-0 w-20 text-center">
                      <div className="relative h-16 w-16 rounded-full overflow-hidden bg-ocean-light flex items-center justify-center border-2 border-primary/20">
                        {s.photo_url ? (
                          <img src={s.photo_url} alt={s.name || ''} className="h-full w-full object-cover" />
                        ) : (
                          <span className="font-display text-xl text-primary/60">{avatarFallbackInitial(s.name)}</span>
                        )}
                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 pill bg-primary text-white text-[10px] px-1.5 py-0 leading-4 whitespace-nowrap">
                          {s.score}%
                        </span>
                      </div>
                      <p className="text-xs truncate w-full mt-1" style={{ fontFamily: 'Jost, sans-serif' }}>{s.name || t('messagesView.defaultUser')}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {groups.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2" style={{ fontFamily: 'Jost, sans-serif' }}>
              {t('messagesView.myGroups')}
            </h2>
            <div className="space-y-2">
              {groups.map(g => (
                <button key={g.id} onClick={() => navigate(`/groups/${g.id}`)}
                  className="card-premium p-4 flex items-center gap-3 w-full text-left relative">
                  <div className="h-12 w-12 rounded-full bg-pine-light flex items-center justify-center text-xl flex-shrink-0">
                    {g.emoji || '💬'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm" style={{ fontFamily: 'Jost, sans-serif' }}>{g.name}</h3>
                    {g.description && (
                      <p className="text-xs text-muted-foreground truncate" style={{ fontFamily: 'Jost, sans-serif' }}>{g.description}</p>
                    )}
                  </div>
                  {groupUnread[g.id] > 0 && (
                    <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center flex-shrink-0">
                      {groupUnread[g.id] > 9 ? '9+' : groupUnread[g.id]}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2" style={{ fontFamily: 'Jost, sans-serif' }}>
          {t('messagesView.title')}
        </h2>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse" />)}
          </div>
        ) : conversations.filter(c => !isBlocked(c.partnerId)).length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">💬</div>
            <p className="text-sm text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif' }}>
              {t('messagesView.noConversations')}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.filter(c => !isBlocked(c.partnerId)).map(c => (
              <button key={c.partnerId} onClick={() => navigate(`/chat/${c.partnerId}`)}
                className="card-premium p-4 flex items-center gap-3 w-full text-left">
                <div className="relative flex-shrink-0">
                  <div className="h-12 w-12 rounded-full overflow-hidden bg-ocean-light flex items-center justify-center">
                    {c.partnerPhoto ? (
                      <img src={c.partnerPhoto} alt={c.partnerName} className="h-full w-full object-cover" />
                    ) : (
                      <span className="font-display text-lg text-primary/60">{avatarFallbackInitial(c.partnerName)}</span>
                    )}
                  </div>
                  {isOnline(c.partnerId) && (
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-400 ring-2 ring-card" title={t('common.online')} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={cn('text-sm', c.unreadCount > 0 ? 'font-semibold' : 'font-medium')} style={{ fontFamily: 'Jost, sans-serif' }}>
                    {c.partnerName}
                  </h3>
                  <p className={cn('text-xs truncate', c.unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground')} style={{ fontFamily: 'Jost, sans-serif' }}>
                    {c.lastMessage}
                  </p>
                </div>
                {c.unreadCount > 0 && (
                  <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-primary text-white text-[10px] font-semibold flex items-center justify-center flex-shrink-0">
                    {c.unreadCount > 9 ? '9+' : c.unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
        </div>
          </>
        )}
      </div>

      {showCreateGroup && (
        <CreateGroupModal
          onClose={() => setShowCreateGroup(false)}
          onCreated={(groupId) => { setShowCreateGroup(false); navigate(`/groups/${groupId}`); }}
        />
      )}
    </div>
  );
}

interface PickableMember {
  user_id: string;
  name: string | null;
  photo_url: string | null;
}

function CreateGroupModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [emoji, setEmoji] = useState('💬');
  const [loading, setLoading] = useState(false);
  const emojiOptions = ['💬', '🏖️', '🚲', '🏄', '⛵', '🍷', '🥾', '🎾'];
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState<PickableMember[] | null>(null);
  const [searchingMembers, setSearchingMembers] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<PickableMember[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = memberSearch.trim();
    if (!q) { setMemberResults(null); return; }
    setSearchingMembers(true);
    const handle = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, name, photo_url')
        .ilike('name', `${q}%`)
        .not('name', 'is', null)
        .neq('user_id', user.id)
        .limit(20);
      setMemberResults(data || []);
      setSearchingMembers(false);
    }, 300);
    return () => clearTimeout(handle);
  }, [memberSearch, user]);

  const addMember = (p: PickableMember) => {
    if (selectedMembers.some(m => m.user_id === p.user_id)) return;
    setSelectedMembers(prev => [...prev, p]);
    setMemberSearch('');
    setMemberResults(null);
  };

  const removeMember = (userId: string) => {
    setSelectedMembers(prev => prev.filter(m => m.user_id !== userId));
  };

  const handleCreate = async () => {
    if (!user) return;
    if (!name.trim()) { toast.error(t('createGroupModal.nameRequiredError')); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('chat_groups')
      .insert({ name: name.trim(), description: description.trim() || null, emoji, created_by: user.id })
      .select()
      .single();
    if (error || !data) { setLoading(false); toast.error(t('createGroupModal.createError')); return; }

    if (selectedMembers.length > 0) {
      await supabase.from('chat_group_members').insert(
        selectedMembers.map(m => ({ group_id: data.id, user_id: m.user_id }))
      );
      const names = selectedMembers.map(m => m.name || t('groupChat.defaultUser')).join(', ');
      await supabase.from('chat_group_messages').insert({
        group_id: data.id, sender_id: user.id, content: t('createGroupModal.membersAddedMessage', { names }), is_system: true,
      });
    }

    setLoading(false);
    toast.success(t('createGroupModal.createdSuccess'));
    onCreated(data.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="bg-card rounded-3xl p-6 w-full max-w-sm space-y-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> {t('createGroupModal.title')}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {emojiOptions.map(e => (
            <button key={e} onClick={() => setEmoji(e)}
              className={`h-10 w-10 rounded-full flex items-center justify-center text-lg transition-all ${emoji === e ? 'bg-ocean-light ring-2 ring-primary' : 'bg-secondary'}`}>
              {e}
            </button>
          ))}
        </div>

        <input
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={60}
          placeholder={t('createGroupModal.namePlaceholder')}
          className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
          style={{ fontFamily: 'Jost, sans-serif' }}
        />
        <input
          value={description}
          onChange={e => setDescription(e.target.value)}
          maxLength={200}
          placeholder={t('createGroupModal.descriptionPlaceholder')}
          className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
          style={{ fontFamily: 'Jost, sans-serif' }}
        />

        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block" style={{ fontFamily: 'Jost, sans-serif' }}>
            {t('createGroupModal.membersLabel')}
          </label>

          {selectedMembers.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {selectedMembers.map(m => (
                <span key={m.user_id} className="pill bg-ocean-light text-primary flex items-center gap-1.5 pr-1.5">
                  {m.name || t('groupChat.defaultUser')}
                  <button onClick={() => removeMember(m.user_id)} className="hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <input
            value={memberSearch}
            onChange={e => setMemberSearch(e.target.value)}
            placeholder={t('createGroupModal.membersSearchPlaceholder')}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
            style={{ fontFamily: 'Jost, sans-serif' }}
          />

          {memberSearch.trim() && (
            <div className="mt-1.5 max-h-40 overflow-y-auto rounded-xl border border-border/50 divide-y divide-border/50">
              {searchingMembers ? (
                <p className="text-xs text-muted-foreground text-center py-3" style={{ fontFamily: 'Jost, sans-serif' }}>{t('groupChat.loading')}</p>
              ) : !memberResults || memberResults.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3" style={{ fontFamily: 'Jost, sans-serif' }}>{t('createGroupModal.noResults')}</p>
              ) : (
                memberResults.filter(p => !selectedMembers.some(m => m.user_id === p.user_id)).map(p => (
                  <button key={p.user_id} onClick={() => addMember(p)} type="button"
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-secondary text-left">
                    <div className="h-7 w-7 rounded-full bg-ocean-light flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {p.photo_url ? (
                        <img src={p.photo_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xs font-semibold text-primary">{avatarFallbackInitial(p.name)}</span>
                      )}
                    </div>
                    <span className="text-sm" style={{ fontFamily: 'Jost, sans-serif' }}>{p.name}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <button onClick={handleCreate} disabled={loading || !name.trim()}
          className="btn-ocean w-full py-3.5 flex items-center justify-center gap-2 disabled:opacity-50">
          <Check className="h-4 w-4" /> {loading ? t('createGroupModal.creating') : t('createGroupModal.create')}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SALON — inchangé
// ─────────────────────────────────────────────────────────────
function SalonView({ salonId, onBack }: { salonId: string; onBack: () => void }) {
  const { t } = useTranslation();
  const { user, isAdmin } = useAuth();
  useTimeTick();
  const [messages, setMessages] = useState<SalonMessage[]>([]);
  const [senderNames, setSenderNames] = useState<Record<string, string>>({});
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const salon = SALONS.find(s => s.id === salonId)!;
  const { isBlocked } = useBlockedUsers();
  const bindLongPress = useLongPress();
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingMessage, setDeletingMessage] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const stopTypingTimeout = useRef<ReturnType<typeof setTimeout>>();
  const typingClearTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const {
    likesByMessage, readsByMessage, loadForMessages, markMessagesRead, toggleLike,
    applyLikeInsert, applyLikeDelete, applyReadInsert,
  } = useMessageLikesAndReads('salon_message_likes', 'salon_message_reads');
  const [peopleModal, setPeopleModal] = useState<{ title: string; userIds: string[] } | null>(null);
  const [peopleModalData, setPeopleModalData] = useState<{ user_id: string; name: string | null; photo_url: string | null }[] | null>(null);

  const ensureSenderName = useCallback(async (uid: string) => {
    setSenderNames(prev => {
      if (prev[uid]) return prev;
      supabase.from('profiles').select('name').eq('user_id', uid).single().then(({ data }) => {
        if (data) setSenderNames(p => ({ ...p, [uid]: data.name || t('salonView.defaultMember') }));
      });
      return prev;
    });
  }, [t]);

  const loadMessages = useCallback(async () => {
    // BUG FIX : ce tri était ascendant AVANT le limit(100), donc on ne
    // récupérait jamais que les 100 tout premiers messages du salon depuis
    // sa création. Passé ce seuil (n'importe quel salon un tant soit peu
    // actif), quiconque ouvrait la page se retrouvait bloqué sur l'histoire
    // ancienne, sans jamais voir les messages récents. On récupère les 100
    // plus récents (tri descendant), puis on les remet en ordre chronologique.
    const { data } = await supabase.from('salon_messages').select('*').eq('salon', salonId).order('created_at', { ascending: false }).limit(100);
    if (data) {
      const chronological = data.reverse();
      setMessages(chronological);
      Array.from(new Set(chronological.map(m => m.user_id))).forEach(ensureSenderName);
      await loadForMessages(chronological.map(m => m.id));
      if (user) markMessagesRead(chronological.filter(m => m.user_id !== user.id).map(m => m.id));
    }
  }, [salonId, ensureSenderName, loadForMessages, user, markMessagesRead]);

  useEffect(() => {
    loadMessages();
    const channel = supabase
      .channel(`salon-${salonId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'salon_messages', filter: `salon=eq.${salonId}` }, (payload) => {
        const m = payload.new as SalonMessage;
        setMessages(prev => [...prev, m]);
        ensureSenderName(m.user_id);
        if (m.user_id !== user?.id) markMessagesRead([m.id]);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'salon_message_likes' }, (payload) => {
        const { message_id, user_id } = payload.new as { message_id: string; user_id: string };
        applyLikeInsert(message_id, user_id);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'salon_message_likes' }, (payload) => {
        const { message_id, user_id } = payload.old as { message_id: string; user_id: string };
        applyLikeDelete(message_id, user_id);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'salon_message_reads' }, (payload) => {
        const { message_id, viewer_id } = payload.new as { message_id: string; viewer_id: string };
        applyReadInsert(message_id, viewer_id);
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (!payload?.userId || payload.userId === user?.id) return;
        ensureSenderName(payload.userId);
        clearTimeout(typingClearTimeouts.current[payload.userId]);
        if (payload.typing) {
          setTypingUsers(prev => new Set(prev).add(payload.userId));
          typingClearTimeouts.current[payload.userId] = setTimeout(() => {
            setTypingUsers(prev => { const s = new Set(prev); s.delete(payload.userId); return s; });
          }, 4000);
        } else {
          setTypingUsers(prev => { const s = new Set(prev); s.delete(payload.userId); return s; });
        }
      })
      .subscribe();
    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [salonId, user, loadMessages, ensureSenderName, markMessagesRead, applyLikeInsert, applyLikeDelete, applyReadInsert]);

  // Marque le salon comme lu à l'entrée et à la sortie, pour que le badge
  // de non-lus sur la liste des salons se remette bien à zéro.
  useEffect(() => {
    if (!user) return;
    const markAsRead = () => {
      supabase.from('salon_reads').upsert({ user_id: user.id, salon: salonId, last_read_at: new Date().toISOString() }, { onConflict: 'user_id,salon' }).then();
    };
    markAsRead();
    return markAsRead;
  }, [user, salonId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const openPeopleModal = async (title: string, userIds: string[]) => {
    setPeopleModal({ title, userIds });
    setPeopleModalData(null);
    if (userIds.length === 0) { setPeopleModalData([]); return; }
    const { data } = await supabase.from('profiles').select('user_id, name, photo_url').in('user_id', userIds);
    setPeopleModalData(data || []);
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!user) return;
    setDeletingMessage(true);
    // Pas de filtre .eq('user_id', ...) ici : un admin doit pouvoir
    // supprimer le message de quelqu'un d'autre (modération). La policy RLS
    // reste la vraie barrière de sécurité (auteur ou admin uniquement).
    const { error } = await supabase.from('salon_messages').delete().eq('id', messageId);
    setDeletingMessage(false);
    setConfirmDeleteId(null);
    if (error) { toast.error(t('salonView.deleteMessageError')); return; }
    setMessages(prev => prev.filter(m => m.id !== messageId));
  };

  const sendTyping = (typing: boolean) => {
    channelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { userId: user?.id, typing } });
  };

  const handleContentChange = (value: string) => {
    setContent(value);
    sendTyping(true);
    clearTimeout(stopTypingTimeout.current);
    stopTypingTimeout.current = setTimeout(() => sendTyping(false), 2000);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !content.trim() || sending) return;
    setSending(true);
    const text = content.trim();
    setContent('');
    clearTimeout(stopTypingTimeout.current);
    sendTyping(false);
    const { error } = await supabase.from('salon_messages').insert({ salon: salonId, user_id: user.id, content: text });
    if (error) setContent(text);
    setSending(false);
  };

  const handleStartRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error(t('salonView.micUnsupported'));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredType = pickAudioMimeType();
      const recorder = preferredType ? new MediaRecorder(stream, { mimeType: preferredType }) : new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const mimeType = recorder.mimeType || 'audio/webm';
        handleUploadVoice(new Blob(audioChunksRef.current, { type: mimeType }), mimeType);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      toast.error(t('salonView.micPermissionError'));
    }
  };

  const handleStopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleUploadVoice = async (blob: Blob, mimeType: string) => {
    if (!user) return;
    const url = await uploadVoiceMessage('chat-audio', user.id, blob, mimeType);
    if (!url) { toast.error(t('salonView.voiceSendError')); return; }
    await supabase.from('salon_messages').insert({
      salon: salonId, user_id: user.id, content: t('salonView.voiceMessageContent'), attachment_url: url, attachment_type: 'audio',
    });
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) { toast.error(t('salonView.photoTypeError')); return; }
    if (file.size > MAX_PHOTO_SIZE_MB * 1024 * 1024) { toast.error(t('salonView.photoSizeError', { max: MAX_PHOTO_SIZE_MB })); return; }

    setUploadingPhoto(true);
    const url = await uploadPhoto('chat-images', user.id, file);
    if (!url) { toast.error(t('salonView.photoSendError')); setUploadingPhoto(false); return; }
    await supabase.from('salon_messages').insert({
      salon: salonId, user_id: user.id, content: t('salonView.photoContent'), attachment_url: url, attachment_type: 'image',
    });
    setUploadingPhoto(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="text-xl">{salon.emoji}</span>
          <h1 className="font-display text-lg font-semibold">{t(`salons.${salon.id}.label`)}</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto max-w-lg mx-auto w-full px-4 py-4 space-y-2">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8" style={{ fontFamily: 'Jost, sans-serif' }}>
            {t('salonView.beFirst')}
          </p>
        )}
        {messages.filter(m => !isBlocked(m.user_id)).map(m => {
          const mine = m.user_id === user?.id;
          const likedByMe = user ? (likesByMessage[m.id] || []).includes(user.id) : false;
          const likeCount = (likesByMessage[m.id] || []).length;
          const readCount = (readsByMessage[m.id] || []).length;
          return (
            <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
              <div className={`flex items-end gap-1 ${mine ? 'justify-end' : 'justify-start'}`}>
                {!mine && (
                  <ReportButton
                    targetType="salon_message"
                    targetId={m.id}
                    targetUserId={m.user_id}
                    className="h-9 w-9 flex items-center justify-center text-muted-foreground/50 hover:text-destructive transition-colors flex-shrink-0 order-last"
                  />
                )}
                {m.attachment_type === 'audio' && m.attachment_url ? (
                  <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${mine ? 'bg-primary' : 'bg-secondary'}`}
                    {...((mine || isAdmin) ? bindLongPress(() => setConfirmDeleteId(m.id)) : {})}>
                    {!mine && <p className={cn('text-xs font-semibold opacity-70 mb-0.5', mine ? '' : 'text-foreground')}>{senderNames[m.user_id] || '...'}</p>}
                    <audio controls src={m.attachment_url} className="h-9 max-w-[220px]" />
                  </div>
                ) : m.attachment_type === 'image' && m.attachment_url ? (
                  <a href={m.attachment_url} target="_blank" rel="noopener noreferrer" className="block max-w-[75%] rounded-2xl overflow-hidden select-none"
                    {...((mine || isAdmin) ? bindLongPress(() => setConfirmDeleteId(m.id)) : {})}>
                    <img src={m.attachment_url} alt={t('salonView.sentPhoto')} className="max-h-64 w-auto object-cover" />
                  </a>
                ) : (
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm select-none active:opacity-70 transition-opacity ${mine ? 'bg-primary text-white' : 'bg-secondary text-foreground'}`}
                    style={{ fontFamily: 'Jost, sans-serif' }}
                    {...((mine || isAdmin) ? bindLongPress(() => setConfirmDeleteId(m.id)) : {})}>
                    {!mine && <p className="text-xs font-semibold opacity-70 mb-0.5">{senderNames[m.user_id] || '...'}</p>}
                    {m.content}
                  </div>
                )}
              </div>

              <MessageLikeReadRow
                likedByMe={likedByMe}
                likeCount={likeCount}
                readCount={readCount}
                onToggleLike={() => toggleLike(m.id)}
                onShowLikers={() => openPeopleModal(t('groupChat.likedBy'), likesByMessage[m.id] || [])}
                onShowViewers={() => openPeopleModal(t('groupChat.seenBy'), readsByMessage[m.id] || [])}
              />
              <span className="text-[10px] text-muted-foreground px-1 mt-0.5" style={{ fontFamily: 'Jost, sans-serif' }}>
                {formatMessageTime(m.created_at, t)}
              </span>
            </div>
          );
        })}
        {typingUsers.size > 0 && (
          <div className="flex flex-col gap-0.5">
            <p className="text-[11px] text-muted-foreground pl-1" style={{ fontFamily: 'Jost, sans-serif' }}>
              {t('salonView.typing', { count: typingUsers.size, names: Array.from(typingUsers).map(id => senderNames[id] || '...').join(', ') })}
            </p>
            <div className="flex justify-start">
              <div className="bg-secondary rounded-2xl px-4 py-2.5 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="sticky bottom-0 bg-background border-t border-border/50 px-4 py-3 safe-area-bottom">
        <div className="max-w-lg mx-auto flex gap-2">
          <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
          {!isRecording && (
            <button type="button" onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto}
              className="h-11 w-11 rounded-full border border-border flex items-center justify-center flex-shrink-0 text-muted-foreground hover:text-foreground disabled:opacity-50"
              title={t('salonView.sendPhoto')}>
              <ImageIcon className="h-4 w-4" />
            </button>
          )}
          <input value={content} onChange={e => handleContentChange(e.target.value)} maxLength={1000}
            placeholder={t('salonView.writeInChannel', { channel: t(`salons.${salon.id}.label`).toLowerCase() })}
            className="flex-1 px-4 py-3 rounded-full border border-border bg-background text-base outline-none focus:ring-2 focus:ring-primary/20"
            style={{ fontFamily: 'Jost, sans-serif' }} />
          {content.trim() ? (
            <button type="submit" disabled={sending}
              className="h-11 w-11 rounded-full bg-primary text-white flex items-center justify-center disabled:opacity-50 flex-shrink-0">
              <Send className="h-4 w-4" />
            </button>
          ) : (
            <button type="button" onClick={isRecording ? handleStopRecording : handleStartRecording}
              className={`h-11 w-11 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${isRecording ? 'bg-destructive text-white animate-pulse' : 'bg-primary text-white'}`}
              title={isRecording ? t('salonView.stopAndSend') : t('salonView.voiceMessage')}>
              {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
          )}
        </div>
      </form>

      {peopleModal && (
        <MessagePeopleModal
          title={peopleModal.title}
          people={peopleModalData}
          onClose={() => { setPeopleModal(null); setPeopleModalData(null); }}
        />
      )}

      {confirmDeleteId && (
        <ConfirmDialog
          message={t('salonView.confirmDeleteMessage')}
          confirming={deletingMessage}
          onCancel={() => setConfirmDeleteId(null)}
          onConfirm={() => handleDeleteMessage(confirmDeleteId)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// FORUM — inchangé
// ─────────────────────────────────────────────────────────────
function ForumView({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const { user, isAdmin } = useAuth();
  useTimeTick();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [authorNames, setAuthorNames] = useState<Record<string, string>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [likesByPost, setLikesByPost] = useState<Record<string, string[]>>({});
  const [likesModalPostId, setLikesModalPostId] = useState<string | null>(null);
  const [profileModalUserId, setProfileModalUserId] = useState<string | null>(null);
  const [myLikes, setMyLikes] = useState<Set<string>>(new Set());
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [newPost, setNewPost] = useState('');
  const [newPostTag, setNewPostTag] = useState<string>('discussion');
  const [posting, setPosting] = useState(false);
  const [openComments, setOpenComments] = useState<string | null>(null);
  const [confirmDeletePostId, setConfirmDeletePostId] = useState<string | null>(null);
  const [deletingPost, setDeletingPost] = useState(false);
  const { isBlocked } = useBlockedUsers();
  const [pendingAttachment, setPendingAttachment] = useState<{ url: string; type: 'audio' | 'image' } | null>(null);
  const [attaching, setAttaching] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Marque le forum comme lu à l'entrée, pour que le badge de la liste
  // des discussions se remette bien à zéro.
  useEffect(() => {
    if (!user) return;
    supabase.from('forum_reads').upsert({ user_id: user.id, last_read_at: new Date().toISOString() }, { onConflict: 'user_id' }).then();
  }, [user]);

  const loadPosts = useCallback(async () => {
    const { data } = await supabase.from('forum_posts').select('*').order('created_at', { ascending: false }).limit(50);
    if (!data) return;
    setPosts(data);

    const authorIds = Array.from(new Set(data.map(p => p.author_id)));
    if (authorIds.length) {
      const { data: profiles } = await supabase.from('profiles').select('user_id, name').in('user_id', authorIds);
      const map: Record<string, string> = {};
      (profiles || []).forEach(p => { map[p.user_id] = p.name || t('forumView.defaultMember'); });
      setAuthorNames(map);
    }

    const postIds = data.map(p => p.id);
    if (postIds.length) {
      const { data: likes } = await supabase.from('forum_likes').select('post_id, user_id').in('post_id', postIds);
      const counts: Record<string, number> = {};
      const mine = new Set<string>();
      const byPost: Record<string, string[]> = {};
      (likes || []).forEach(l => {
        counts[l.post_id] = (counts[l.post_id] || 0) + 1;
        if (l.user_id === user?.id) mine.add(l.post_id);
        byPost[l.post_id] = [...(byPost[l.post_id] || []), l.user_id];
      });
      setLikeCounts(counts);
      setMyLikes(mine);
      setLikesByPost(byPost);

      // Les noms des auteurs de posts sont déjà chargés ci-dessus, mais pas
      // forcément ceux de tous les likers (une personne peut aimer un post
      // sans jamais avoir posté) — complète la map pour la liste "a aimé".
      const likerIds = Array.from(new Set((likes || []).map(l => l.user_id))).filter(id => !authorIds.includes(id));
      if (likerIds.length) {
        const { data: likerProfiles } = await supabase.from('profiles').select('user_id, name').in('user_id', likerIds);
        if (likerProfiles?.length) {
          setAuthorNames(prev => {
            const merged = { ...prev };
            likerProfiles.forEach(p => { merged[p.user_id] = p.name || t('forumView.defaultMember'); });
            return merged;
          });
        }
      }

      const { data: comments } = await supabase.from('forum_comments').select('post_id').in('post_id', postIds);
      const cCounts: Record<string, number> = {};
      (comments || []).forEach(c => { cCounts[c.post_id] = (cCounts[c.post_id] || 0) + 1; });
      setCommentCounts(cCounts);
    }
  }, [t, user]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  const handlePost = async () => {
    if (!user || (!newPost.trim() && !pendingAttachment) || posting) return;
    setPosting(true);
    const text = newPost.trim() || (pendingAttachment?.type === 'audio' ? t('forumView.voiceMessageContent') : t('forumView.photoContent'));
    const { error } = await supabase.from('forum_posts').insert({
      author_id: user.id,
      content: text,
      tag: newPostTag,
      attachment_url: pendingAttachment?.url,
      attachment_type: pendingAttachment?.type,
    });
    if (error) toast.error(t('forumView.publishError'));
    else { setNewPost(''); setNewPostTag('discussion'); setPendingAttachment(null); loadPosts(); }
    setPosting(false);
  };

  const handleStartRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error(t('forumView.micUnsupported'));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredType = pickAudioMimeType();
      const recorder = preferredType ? new MediaRecorder(stream, { mimeType: preferredType }) : new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const mimeType = recorder.mimeType || 'audio/webm';
        if (!user) return;
        setAttaching(true);
        const url = await uploadVoiceMessage('chat-audio', user.id, new Blob(audioChunksRef.current, { type: mimeType }), mimeType);
        setAttaching(false);
        if (!url) { toast.error(t('forumView.voiceSendError')); return; }
        setPendingAttachment({ url, type: 'audio' });
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      toast.error(t('forumView.micPermissionError'));
    }
  };

  const handleStopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) { toast.error(t('forumView.photoTypeError')); return; }
    if (file.size > MAX_PHOTO_SIZE_MB * 1024 * 1024) { toast.error(t('forumView.photoSizeError', { max: MAX_PHOTO_SIZE_MB })); return; }

    setAttaching(true);
    const url = await uploadPhoto('chat-images', user.id, file);
    setAttaching(false);
    if (!url) { toast.error(t('forumView.photoSendError')); return; }
    setPendingAttachment({ url, type: 'image' });
  };

  const toggleLike = async (postId: string) => {
    if (!user) return;
    const liked = myLikes.has(postId);
    if (liked) {
      await supabase.from('forum_likes').delete().eq('post_id', postId).eq('user_id', user.id);
      setMyLikes(prev => { const s = new Set(prev); s.delete(postId); return s; });
      setLikeCounts(prev => ({ ...prev, [postId]: Math.max((prev[postId] || 1) - 1, 0) }));
    } else {
      await supabase.from('forum_likes').insert({ post_id: postId, user_id: user.id });
      setMyLikes(prev => new Set(prev).add(postId));
      setLikeCounts(prev => ({ ...prev, [postId]: (prev[postId] || 0) + 1 }));
    }
  };

  const handleDeletePost = async (postId: string) => {
    setDeletingPost(true);
    const { error } = await supabase.from('forum_posts').delete().eq('id', postId);
    setDeletingPost(false);
    setConfirmDeletePostId(null);
    if (error) { toast.error(t('forumView.deletePostError')); return; }
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  return (
    <div className="min-h-screen pb-28 bg-background">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-lg font-semibold">{t('forumView.title')}</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        <div className="card-premium p-4 space-y-2">
          <textarea value={newPost} onChange={e => setNewPost(e.target.value)} maxLength={1000} rows={2}
            placeholder={t('forumView.whatsNew')}
            className="w-full px-3 py-2 rounded-xl border border-border bg-background text-base outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            style={{ fontFamily: 'Jost, sans-serif' }} />

          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {FORUM_CATEGORIES.map(cat => (
              <button key={cat.value} type="button" onClick={() => setNewPostTag(cat.value)}
                className={cn(
                  'flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium border transition-all duration-200',
                  newPostTag === cat.value
                    ? 'border-primary bg-ocean-light text-primary shadow-sm'
                    : 'border-border bg-background text-muted-foreground hover:bg-secondary'
                )}
                style={{ fontFamily: 'Jost, sans-serif' }}>
                {cat.emoji} {t(`forumCategories.${cat.value}`)}
              </button>
            ))}
          </div>

          {pendingAttachment && (
            <div className="relative inline-block">
              {pendingAttachment.type === 'image' ? (
                <img src={pendingAttachment.url} alt={t('forumView.photoToPublish')} className="max-h-32 rounded-xl" />
              ) : (
                <audio controls src={pendingAttachment.url} className="h-9" />
              )}
              <button onClick={() => setPendingAttachment(null)}
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-white flex items-center justify-center">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
            <button type="button" onClick={() => photoInputRef.current?.click()} disabled={attaching || !!pendingAttachment}
              className="h-9 w-9 rounded-full border border-border flex items-center justify-center flex-shrink-0 text-muted-foreground hover:text-foreground disabled:opacity-50"
              title={t('forumView.attachPhoto')}>
              <ImageIcon className="h-4 w-4" />
            </button>
            <button type="button" onClick={isRecording ? handleStopRecording : handleStartRecording} disabled={attaching || !!pendingAttachment}
              className={cn('h-9 w-9 rounded-full border flex items-center justify-center flex-shrink-0 disabled:opacity-50 transition-colors',
                isRecording ? 'bg-destructive text-white border-destructive animate-pulse' : 'border-border text-muted-foreground hover:text-foreground')}
              title={isRecording ? t('forumView.stop') : t('forumView.attachVoice')}>
              {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
            <button onClick={handlePost} disabled={(!newPost.trim() && !pendingAttachment) || posting || attaching}
              className="btn-ocean flex-1 py-2.5 text-sm disabled:opacity-50">
              {posting ? t('forumView.publishing') : attaching ? t('forumView.sending') : t('forumView.publish')}
            </button>
          </div>
        </div>

        {posts.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8" style={{ fontFamily: 'Jost, sans-serif' }}>
            {t('forumView.noPosts')}
          </p>
        )}

        {posts.filter(post => !isBlocked(post.author_id)).map(post => (
          <div key={post.id} className="card-premium p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <button onClick={() => setProfileModalUserId(post.author_id)} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <div className="h-8 w-8 rounded-full bg-ocean-light flex items-center justify-center text-xs font-semibold text-primary/70 flex-shrink-0">
                  {avatarFallbackInitial(authorNames[post.author_id])}
                </div>
                <span className="text-sm font-medium flex items-center gap-1.5" style={{ fontFamily: 'Jost, sans-serif' }}>
                  {authorNames[post.author_id] || t('forumView.defaultMember')}
                  <span className="text-[10px] font-normal text-muted-foreground">· {formatMessageTime(post.created_at, t)}</span>
                </span>
              </button>
              {post.author_id !== user?.id && (
                isAdmin ? (
                  <button onClick={() => setConfirmDeletePostId(post.id)} title={t('forumView.deleteModeration')}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-lg hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : (
                  <ReportButton targetType="forum_post" targetId={post.id} targetUserId={post.author_id} className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-lg hover:bg-destructive/10" />
                )
              )}
            </div>
            {(() => {
              const cat = FORUM_CATEGORIES.find(c => c.value === normalizeForumTag(post.tag));
              return cat && (
                <span className="pill bg-ocean-light text-primary inline-flex items-center gap-1 w-fit">
                  {cat.emoji} {t(`forumCategories.${cat.value}`)}
                </span>
              );
            })()}
            <p className="text-sm" style={{ fontFamily: 'Jost, sans-serif', lineHeight: 1.6 }}>{post.content}</p>
            {post.attachment_type === 'image' && post.attachment_url && (
              <a href={post.attachment_url} target="_blank" rel="noopener noreferrer" className="block rounded-xl overflow-hidden">
                <img src={post.attachment_url} alt={t('forumView.postPhoto')} className="max-h-72 w-full object-cover" />
              </a>
            )}
            {post.attachment_type === 'audio' && post.attachment_url && (
              <audio controls src={post.attachment_url} className="h-9 max-w-full" />
            )}
            <div className="flex items-center gap-4 pt-1">
              <div className="flex items-center gap-1">
                <button onClick={() => toggleLike(post.id)} className={cn('flex items-center p-1 -m-1', myLikes.has(post.id) ? 'text-red-500' : 'text-muted-foreground')}>
                  <Heart className={cn('h-4 w-4', myLikes.has(post.id) && 'fill-red-500')} />
                </button>
                <button
                  onClick={() => (likeCounts[post.id] || 0) > 0 && setLikesModalPostId(post.id)}
                  className={cn('text-xs', (likeCounts[post.id] || 0) > 0 ? 'text-muted-foreground hover:text-foreground hover:underline' : 'text-muted-foreground')}>
                  {likeCounts[post.id] || 0}
                </button>
              </div>
              <button onClick={() => setOpenComments(openComments === post.id ? null : post.id)} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MessageSquare className="h-4 w-4" />
                {commentCounts[post.id] || 0}
              </button>
            </div>
            {openComments === post.id && (
              <CommentsPanel postId={post.id} onCommentAdded={() => setCommentCounts(prev => ({ ...prev, [post.id]: (prev[post.id] || 0) + 1 }))} />
            )}
          </div>
        ))}
      </div>

      {likesModalPostId && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center px-4" onClick={() => setLikesModalPostId(null)}>
          <div className="bg-card rounded-3xl p-5 w-full max-w-xs max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-base font-semibold mb-2 flex items-center gap-1.5">
              <Heart className="h-4 w-4 text-red-500 fill-red-500" /> {t('forumView.likedBy')}
            </h3>
            <div className="space-y-1">
              {(likesByPost[likesModalPostId] || []).map(uid => (
                <button key={uid} onClick={() => { setLikesModalPostId(null); setProfileModalUserId(uid); }}
                  className="w-full text-left px-2 py-2 rounded-xl hover:bg-secondary transition-colors text-sm"
                  style={{ fontFamily: 'Jost, sans-serif' }}>
                  {authorNames[uid] || t('forumView.defaultMember')}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {profileModalUserId && <MiniProfileModal userId={profileModalUserId} onClose={() => setProfileModalUserId(null)} />}

      {confirmDeletePostId && (
        <ConfirmDialog
          message={t('forumView.confirmDeletePost')}
          confirming={deletingPost}
          onCancel={() => setConfirmDeletePostId(null)}
          onConfirm={() => handleDeletePost(confirmDeletePostId)}
        />
      )}

      <BottomNav />
    </div>
  );
}

function CommentsPanel({ postId, onCommentAdded }: { postId: string; onCommentAdded: () => void }) {
  const { t } = useTranslation();
  const { user, isAdmin } = useAuth();
  useTimeTick();
  const [comments, setComments] = useState<{ id: string; content: string; author_id: string; created_at: string }[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [text, setText] = useState('');
  const [profileModalUserId, setProfileModalUserId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingComment, setDeletingComment] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from('forum_comments').select('id, content, author_id, created_at').eq('post_id', postId).order('created_at', { ascending: true });
    if (data) {
      setComments(data);
      const ids = Array.from(new Set(data.map(c => c.author_id)));
      if (ids.length) {
        const { data: profiles } = await supabase.from('profiles').select('user_id, name').in('user_id', ids);
        const map: Record<string, string> = {};
        (profiles || []).forEach(p => { map[p.user_id] = p.name || t('commentsPanel.defaultMember'); });
        setNames(map);
      }
    }
  }, [postId, t]);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!user || !text.trim()) return;
    const content = text.trim();
    setText('');
    const { error } = await supabase.from('forum_comments').insert({ post_id: postId, author_id: user.id, content });
    if (!error) { onCommentAdded(); load(); }
  };

  const handleDeleteComment = async (commentId: string) => {
    setDeletingComment(true);
    const { error } = await supabase.from('forum_comments').delete().eq('id', commentId);
    setDeletingComment(false);
    setConfirmDeleteId(null);
    if (error) { toast.error(t('commentsPanel.deleteError')); return; }
    setComments(prev => prev.filter(c => c.id !== commentId));
  };

  return (
    <div className="pt-2 border-t border-border/50 space-y-2">
      {comments.map(c => (
        <div key={c.id} className="text-xs flex items-start justify-between gap-2" style={{ fontFamily: 'Jost, sans-serif' }}>
          <p>
            <button onClick={() => setProfileModalUserId(c.author_id)} className="font-semibold hover:underline">
              {names[c.author_id] || t('commentsPanel.defaultMember')}
            </button>
            {' : '}
            <span className="text-muted-foreground">{c.content}</span>
            {' '}
            <span className="text-[10px] text-muted-foreground/70">· {formatMessageTime(c.created_at, t)}</span>
          </p>
          {c.author_id !== user?.id && (
            isAdmin ? (
              <button onClick={() => setConfirmDeleteId(c.id)} title={t('forumView.deleteModeration')}
                className="text-muted-foreground/50 hover:text-destructive transition-colors flex-shrink-0">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            ) : (
              <ReportButton
                targetType="forum_comment"
                targetId={c.id}
                targetUserId={c.author_id}
                className="text-muted-foreground/50 hover:text-destructive transition-colors flex-shrink-0"
              />
            )
          )}
        </div>
      ))}
      <div className="flex gap-2">
        <input value={text} onChange={e => setText(e.target.value)} maxLength={500} placeholder={t('commentsPanel.addComment')}
          className="flex-1 px-3 py-1.5 rounded-full border border-border bg-background text-base outline-none focus:ring-2 focus:ring-primary/20"
          style={{ fontFamily: 'Jost, sans-serif' }} />
        <button onClick={submit} disabled={!text.trim()} className="text-xs text-primary font-medium disabled:opacity-50">{t('commentsPanel.send')}</button>
      </div>

      {profileModalUserId && <MiniProfileModal userId={profileModalUserId} onClose={() => setProfileModalUserId(null)} />}

      {confirmDeleteId && (
        <ConfirmDialog
          message={t('commentsPanel.confirmDelete')}
          confirming={deletingComment}
          onCancel={() => setConfirmDeleteId(null)}
          onConfirm={() => handleDeleteComment(confirmDeleteId)}
        />
      )}
    </div>
  );
}
