import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Search, Trash2, Ban, ShieldOff, MessageCircle, Users, Hash, ShieldAlert } from 'lucide-react';
import { SALONS, avatarFallbackInitial, formatMessageTime } from '@/lib/constants';
import { cn } from '@/lib/utils';
import ConfirmDialog from '@/components/ConfirmDialog';

/**
 * Panneau « Conversations » de l'espace de modération — RÉSERVÉ AU PROPRIÉTAIRE
 * (auth.isOwner, adossé à profiles.is_owner et à la RPC is_site_owner côté
 * base). Permet de consulter en LECTURE SEULE n'importe quelle conversation
 * (messages privés 1:1, groupes, salons) pour vérifier un comportement
 * signalé avant de bannir. Chaque ouverture de conversation est journalisée
 * en base via log_moderation_access() (traçabilité RGPD).
 *
 * La vraie barrière de sécurité reste la RLS (migration 072) : sans
 * is_owner = true, les requêtes ci-dessous ne renvoient rien.
 */

type Tab = 'private' | 'groups' | 'salons';

interface RawMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  attachment_url: string | null;
  attachment_type: 'audio' | 'image' | null;
  created_at: string;
}

interface PrivatePair {
  key: string;
  a: string;
  b: string;
  last: string;
  lastAt: string;
  count: number;
}

interface GroupRow {
  id: string;
  name: string;
  emoji: string | null;
}

interface ProfileLite {
  user_id: string;
  name: string | null;
  photo_url: string | null;
  is_banned: boolean;
}

type ActiveThread =
  | { kind: 'private'; a: string; b: string }
  | { kind: 'group'; id: string; name: string }
  | { kind: 'salon'; id: string };

// Vue « activité récente » plutôt que tout l'historique : on remonte les N
// derniers messages privés pour reconstituer la liste des conversations.
const RECENT_MESSAGES_LIMIT = 3000;

export default function AdminConversationsPanel() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('private');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [pairs, setPairs] = useState<PrivatePair[]>([]);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [names, setNames] = useState<Record<string, ProfileLite>>({});
  const [active, setActive] = useState<ActiveThread | null>(null);

  const nameOf = useCallback(
    (uid: string) => names[uid]?.name || t('admin.defaultUser'),
    [names, t],
  );

  const mergeNames = useCallback(async (userIds: string[]) => {
    const missing = Array.from(new Set(userIds)).filter(Boolean);
    if (!missing.length) return;
    const { data } = await supabase
      .from('profiles')
      .select('user_id, name, photo_url, is_banned')
      .in('user_id', missing);
    if (data) setNames(prev => {
      const next = { ...prev };
      data.forEach(p => { next[p.user_id] = p; });
      return next;
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: msgs }, { data: grp }] = await Promise.all([
      supabase
        .from('messages')
        .select('id, sender_id, receiver_id, content, attachment_url, attachment_type, created_at')
        .order('created_at', { ascending: false })
        .limit(RECENT_MESSAGES_LIMIT),
      supabase.from('chat_groups').select('id, name, emoji').order('created_at', { ascending: false }),
    ]);

    const byPair = new Map<string, PrivatePair>();
    const ids = new Set<string>();
    (msgs as RawMessage[] | null || []).forEach(m => {
      ids.add(m.sender_id);
      ids.add(m.receiver_id);
      const [a, b] = [m.sender_id, m.receiver_id].sort();
      const key = `${a}__${b}`;
      const existing = byPair.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        // messages triés du plus récent au plus ancien -> le 1er vu est le dernier
        byPair.set(key, {
          key, a, b, count: 1,
          last: m.attachment_type ? `[${m.attachment_type}]` : m.content,
          lastAt: m.created_at,
        });
      }
    });

    setPairs(Array.from(byPair.values()).sort((x, y) => y.lastAt.localeCompare(x.lastAt)));
    setGroups((grp as GroupRow[] | null) || []);
    await mergeNames(Array.from(ids));
    setLoading(false);
  }, [mergeNames]);

  useEffect(() => { load(); }, [load]);

  const filteredPairs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pairs;
    return pairs.filter(p =>
      nameOf(p.a).toLowerCase().includes(q) || nameOf(p.b).toLowerCase().includes(q));
  }, [pairs, search, nameOf]);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter(g => g.name.toLowerCase().includes(q));
  }, [groups, search]);

  const toggleBan = async (uid: string) => {
    const current = names[uid]?.is_banned ?? false;
    const { error } = await supabase.from('profiles').update({ is_banned: !current }).eq('user_id', uid);
    if (error) { toast.error(t('admin.banStatusError')); return; }
    setNames(prev => ({ ...prev, [uid]: { ...(prev[uid] || { user_id: uid, name: null, photo_url: null, is_banned: false }), is_banned: !current } }));
    toast.success(current ? t('admin.userUnbanned') : t('admin.userBanned'));
  };

  if (active) {
    return (
      <ThreadViewer
        thread={active}
        nameOf={nameOf}
        bannedOf={uid => names[uid]?.is_banned ?? false}
        onToggleBan={toggleBan}
        onNeedNames={mergeNames}
        onBack={() => setActive(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-destructive/5 border border-destructive/20 px-3 py-2.5 flex gap-2">
        <ShieldAlert className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif', lineHeight: 1.5 }}>
          {t('admin.convDisclaimer')}
        </p>
      </div>

      <div className="flex gap-2">
        {([
          { id: 'private', labelKey: 'admin.convTabPrivate', Icon: MessageCircle },
          { id: 'groups', labelKey: 'admin.convTabGroups', Icon: Users },
          { id: 'salons', labelKey: 'admin.convTabSalons', Icon: Hash },
        ] as const).map(({ id, labelKey, Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={cn('flex-1 rounded-full px-3 py-2 text-xs font-medium transition-all flex items-center justify-center gap-1.5',
              tab === id ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-secondary text-muted-foreground')}
            style={{ fontFamily: 'Jost, sans-serif' }}>
            <Icon className="h-3.5 w-3.5" /> {t(labelKey)}
          </button>
        ))}
      </div>

      {tab !== 'salons' && (
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t('admin.convSearchPlaceholder')}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
            style={{ fontFamily: 'Jost, sans-serif' }} />
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse" />)}</div>
      ) : tab === 'private' ? (
        filteredPairs.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-10" style={{ fontFamily: 'Jost, sans-serif' }}>{t('admin.convNoResults')}</p>
        ) : (
          <div className="space-y-2">
            {filteredPairs.map(p => (
              <button key={p.key} onClick={() => setActive({ kind: 'private', a: p.a, b: p.b })}
                className="card-premium p-4 w-full text-left flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-ocean-light flex items-center justify-center flex-shrink-0 text-primary/60 font-display">
                  {avatarFallbackInitial(nameOf(p.a))}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium truncate" style={{ fontFamily: 'Jost, sans-serif' }}>
                    {nameOf(p.a)} <span className="text-muted-foreground">↔</span> {nameOf(p.b)}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate" style={{ fontFamily: 'Jost, sans-serif' }}>{p.last}</p>
                </div>
                <span className="text-[10px] text-muted-foreground flex-shrink-0" style={{ fontFamily: 'Jost, sans-serif' }}>
                  {t('admin.convMsgCount', { count: p.count })}
                </span>
              </button>
            ))}
          </div>
        )
      ) : tab === 'groups' ? (
        filteredGroups.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-10" style={{ fontFamily: 'Jost, sans-serif' }}>{t('admin.convNoResults')}</p>
        ) : (
          <div className="space-y-2">
            {filteredGroups.map(g => (
              <button key={g.id} onClick={() => setActive({ kind: 'group', id: g.id, name: g.name })}
                className="card-premium p-4 w-full text-left flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-pine-light flex items-center justify-center flex-shrink-0 text-lg">{g.emoji || '💬'}</div>
                <h3 className="flex-1 text-sm font-medium truncate" style={{ fontFamily: 'Jost, sans-serif' }}>{g.name}</h3>
              </button>
            ))}
          </div>
        )
      ) : (
        <div className="space-y-2">
          {SALONS.map(s => (
            <button key={s.id} onClick={() => setActive({ kind: 'salon', id: s.id })}
              className="card-premium p-4 w-full text-left flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-sand-light flex items-center justify-center flex-shrink-0 text-lg">{s.emoji}</div>
              <h3 className="flex-1 text-sm font-medium" style={{ fontFamily: 'Jost, sans-serif' }}>{t(`salons.${s.id}.label`)}</h3>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Lecteur de conversation — LECTURE SEULE (pas de champ de saisie).
// Actions de modération : supprimer un message, bannir un participant.
// ─────────────────────────────────────────────────────────────
interface ViewerMessage {
  id: string;
  author: string;
  content: string;
  attachment_url: string | null;
  attachment_type: 'audio' | 'image' | null;
  created_at: string;
}

function ThreadViewer({
  thread, nameOf, bannedOf, onToggleBan, onNeedNames, onBack,
}: {
  thread: ActiveThread;
  nameOf: (uid: string) => string;
  bannedOf: (uid: string) => boolean;
  onToggleBan: (uid: string) => void;
  onNeedNames: (ids: string[]) => Promise<void>;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ViewerMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const participants: string[] = thread.kind === 'private' ? [thread.a, thread.b] : [];

  const title = thread.kind === 'private'
    ? `${nameOf(thread.a)} ↔ ${nameOf(thread.b)}`
    : thread.kind === 'group'
      ? thread.name
      : t(`salons.${thread.id}.label`);

  const load = useCallback(async () => {
    setLoading(true);
    let rows: ViewerMessage[] = [];

    if (thread.kind === 'private') {
      const { data } = await supabase
        .from('messages')
        .select('id, sender_id, content, attachment_url, attachment_type, created_at')
        .or(`and(sender_id.eq.${thread.a},receiver_id.eq.${thread.b}),and(sender_id.eq.${thread.b},receiver_id.eq.${thread.a})`)
        .order('created_at', { ascending: true });
      rows = (data || []).map(m => ({ ...m, author: m.sender_id }));
    } else if (thread.kind === 'group') {
      const { data } = await supabase
        .from('chat_group_messages')
        .select('id, sender_id, content, attachment_url, attachment_type, created_at')
        .eq('group_id', thread.id)
        .order('created_at', { ascending: true });
      rows = (data || []).map(m => ({ ...m, author: m.sender_id }));
    } else {
      const { data } = await supabase
        .from('salon_messages')
        .select('id, user_id, content, attachment_url, attachment_type, created_at')
        .eq('salon', thread.id)
        .order('created_at', { ascending: true });
      rows = (data || []).map(m => ({ ...m, author: m.user_id }));
    }

    setMessages(rows);
    await onNeedNames(rows.map(r => r.author));
    setLoading(false);

    // Journalise la consultation (traçabilité RGPD) — best-effort.
    supabase.rpc('log_moderation_access', {
      p_scope: thread.kind === 'private' ? 'private_conversation' : thread.kind === 'group' ? 'group_conversation' : 'salon',
      p_subject_a: thread.kind === 'private' ? thread.a : null,
      p_subject_b: thread.kind === 'private' ? thread.b : null,
      p_group_id: thread.kind === 'group' ? thread.id : null,
      p_salon: thread.kind === 'salon' ? thread.id : null,
    }).then(({ error }) => { if (error) console.warn('log_moderation_access', error.message); });
  }, [thread, onNeedNames]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    setDeleting(true);
    // Table explicite par type (plutôt qu'une variable en union) : le client
    // Supabase typé n'accepte pas proprement une union de noms de tables dans
    // .from(). La policy RLS DELETE (migrations 041/051) reste la barrière.
    const del =
      thread.kind === 'private' ? supabase.from('messages').delete().eq('id', id)
      : thread.kind === 'group' ? supabase.from('chat_group_messages').delete().eq('id', id)
      : supabase.from('salon_messages').delete().eq('id', id);
    const { error } = await del;
    setDeleting(false);
    setConfirmDeleteId(null);
    if (error) { toast.error(t('admin.convDeleteError')); return; }
    setMessages(prev => prev.filter(m => m.id !== id));
    toast.success(t('admin.convDeleted'));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h3 className="font-display text-lg font-semibold truncate flex-1">{title}</h3>
      </div>

      {participants.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {participants.map(uid => (
            <button key={uid} onClick={() => onToggleBan(uid)}
              className={cn('flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-full',
                bannedOf(uid) ? 'bg-secondary text-muted-foreground' : 'bg-destructive/10 text-destructive')}>
              {bannedOf(uid) ? <ShieldOff className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
              {bannedOf(uid) ? t('admin.convUnban', { name: nameOf(uid) }) : t('admin.convBan', { name: nameOf(uid) })}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[1, 2, 3, 4].map(i => <div key={i} className="h-12 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : messages.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-10" style={{ fontFamily: 'Jost, sans-serif' }}>{t('admin.convEmpty')}</p>
      ) : (
        <div className="space-y-2">
          {messages.map(m => (
            <div key={m.id} className="card-premium p-3 flex gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="text-xs font-semibold" style={{ fontFamily: 'Jost, sans-serif' }}>{nameOf(m.author)}</span>
                  {bannedOf(m.author) && <span className="pill bg-destructive/10 text-destructive text-[10px]">{t('admin.banned')}</span>}
                  <span className="text-[10px] text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif' }}>{formatMessageTime(m.created_at, t)}</span>
                </div>
                {m.attachment_type === 'image' && m.attachment_url ? (
                  <a href={m.attachment_url} target="_blank" rel="noopener noreferrer">
                    <img src={m.attachment_url} alt="" className="max-h-48 rounded-lg" />
                  </a>
                ) : m.attachment_type === 'audio' && m.attachment_url ? (
                  <audio controls src={m.attachment_url} className="h-9 max-w-[220px]" />
                ) : (
                  <p className="text-sm break-words" style={{ fontFamily: 'Jost, sans-serif', lineHeight: 1.5 }}>{m.content}</p>
                )}
              </div>
              <button onClick={() => setConfirmDeleteId(m.id)}
                className="h-8 w-8 flex items-center justify-center text-muted-foreground/50 hover:text-destructive transition-colors flex-shrink-0"
                title={t('admin.convDeleteMessage')}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {confirmDeleteId && (
        <ConfirmDialog
          message={t('admin.convConfirmDelete')}
          confirming={deleting}
          onCancel={() => setConfirmDeleteId(null)}
          onConfirm={() => handleDelete(confirmDeleteId)}
        />
      )}
    </div>
  );
}
