import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import BottomNav from '@/components/BottomNav';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Users, Plus, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { avatarFallbackInitial } from '@/lib/constants';
import { useBlockedUsers } from '@/lib/useBlockedUsers';
import { usePresence } from '@/lib/presence-context';

interface Conversation {
  partnerId: string;
  partnerName: string;
  partnerPhoto: string | null;
  lastMessage: string;
  lastDate: string;
}

interface GroupItem {
  id: string;
  name: string;
  emoji: string | null;
  description: string | null;
}

export default function ChatList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const { isBlocked } = useBlockedUsers();
  const { isOnline, onlineCount } = usePresence();

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    loadConversations();
    loadGroups();
  }, [user]);

  const loadConversations = async () => {
    if (!user) return;
    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (!messages) { setLoading(false); return; }

    const byPartner = new Map<string, typeof messages[0]>();
    for (const m of messages) {
      const partnerId = m.sender_id === user.id ? m.receiver_id : m.sender_id;
      if (!byPartner.has(partnerId)) byPartner.set(partnerId, m);
    }

    const partnerIds = Array.from(byPartner.keys());
    if (partnerIds.length === 0) { setLoading(false); return; }

    const { data: profiles } = await supabase.from('profiles').select('user_id, name, photo_url').in('user_id', partnerIds);
    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

    const convos: Conversation[] = partnerIds.map(pid => {
      const m = byPartner.get(pid)!;
      const profile = profileMap.get(pid);
      return {
        partnerId: pid,
        partnerName: profile?.name || 'Utilisateur',
        partnerPhoto: profile?.photo_url || null,
        lastMessage: m.content,
        lastDate: m.created_at,
      };
    });

    setConversations(convos);
    setLoading(false);
  };

  const loadGroups = async () => {
    if (!user) return;
    const { data: memberships } = await supabase.from('chat_group_members').select('group_id').eq('user_id', user.id);
    if (!memberships?.length) return;
    const ids = memberships.map(m => m.group_id);
    const { data } = await supabase.from('chat_groups').select('*').in('id', ids);
    if (data) setGroups(data);
  };

  return (
    <div className="min-h-screen pb-28 bg-background">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-ocean-light flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-primary" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="font-display text-2xl font-semibold">Messages</h1>
              {onlineCount > 0 && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5" style={{ fontFamily: 'Jost, sans-serif' }}>
                  <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                  {onlineCount} en ligne
                </p>
              )}
            </div>
          </div>
          {/* BUG FIX (#4) : bouton "créer un groupe" désormais fonctionnel */}
          <button onClick={() => setShowCreateGroup(true)} className="btn-ocean flex items-center gap-1.5 py-2.5">
            <Plus className="h-4 w-4" /> Groupe
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">

        {/* Groupes */}
        {groups.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2" style={{ fontFamily: 'Jost, sans-serif' }}>
              Mes groupes
            </h2>
            <div className="space-y-2">
              {groups.map(g => (
                <button key={g.id} onClick={() => navigate(`/groups/${g.id}`)}
                  className="card-premium p-4 flex items-center gap-3 w-full text-left">
                  <div className="h-12 w-12 rounded-full bg-pine-light flex items-center justify-center text-xl flex-shrink-0">
                    {g.emoji || '💬'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm" style={{ fontFamily: 'Jost, sans-serif' }}>{g.name}</h3>
                    {g.description && (
                      <p className="text-xs text-muted-foreground truncate" style={{ fontFamily: 'Jost, sans-serif' }}>{g.description}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Conversations privées */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2" style={{ fontFamily: 'Jost, sans-serif' }}>
            Messages privés
          </h2>
          {loading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse" />)}
            </div>
          ) : conversations.filter(c => !isBlocked(c.partnerId)).length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">💬</div>
              <p className="text-sm text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif' }}>
                Aucune conversation. Allez dans Communauté pour échanger avec quelqu'un !
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
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-400 ring-2 ring-card" title="En ligne" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm" style={{ fontFamily: 'Jost, sans-serif' }}>{c.partnerName}</h3>
                    <p className="text-xs text-muted-foreground truncate" style={{ fontFamily: 'Jost, sans-serif' }}>{c.lastMessage}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreateGroup && (
        <CreateGroupModal
          onClose={() => setShowCreateGroup(false)}
          onCreated={(groupId) => { setShowCreateGroup(false); navigate(`/groups/${groupId}`); }}
        />
      )}
      <BottomNav />
    </div>
  );
}

function CreateGroupModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [emoji, setEmoji] = useState('💬');
  const [loading, setLoading] = useState(false);
  const emojiOptions = ['💬', '🏖️', '🚲', '🏄', '⛵', '🍷', '🥾', '🎾'];

  const handleCreate = async () => {
    if (!user) return;
    if (!name.trim()) { toast.error('Le nom du groupe est obligatoire.'); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('chat_groups')
      .insert({ name: name.trim(), description: description.trim() || null, emoji, created_by: user.id })
      .select()
      .single();
    setLoading(false);
    if (error || !data) { toast.error('Impossible de créer le groupe.'); return; }
    toast.success('Groupe créé ! 🎉');
    onCreated(data.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="bg-card rounded-3xl p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Nouveau groupe
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
          placeholder="Nom du groupe *"
          className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
          style={{ fontFamily: 'Jost, sans-serif' }}
        />
        <input
          value={description}
          onChange={e => setDescription(e.target.value)}
          maxLength={200}
          placeholder="Description (optionnel)"
          className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
          style={{ fontFamily: 'Jost, sans-serif' }}
        />

        <button onClick={handleCreate} disabled={loading || !name.trim()}
          className="btn-ocean w-full py-3.5 flex items-center justify-center gap-2 disabled:opacity-50">
          <Check className="h-4 w-4" /> {loading ? 'Création...' : 'Créer le groupe'}
        </button>
      </div>
    </div>
  );
}
