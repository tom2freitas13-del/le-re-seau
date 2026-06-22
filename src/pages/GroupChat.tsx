import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { ArrowLeft, Send, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { avatarFallbackInitial } from '@/lib/constants';

interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export default function GroupChat() {
  const { groupId } = useParams<{ groupId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [group, setGroup] = useState<{ name: string; emoji: string | null } | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [senderNames, setSenderNames] = useState<Record<string, string>>({});
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !groupId) { navigate('/auth'); return; }
    init();

    const channel = supabase
      .channel(`group-${groupId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_group_messages', filter: `group_id=eq.${groupId}` }, (payload) => {
        const m = payload.new as GroupMessage;
        setMessages(prev => [...prev, m]);
        ensureSenderName(m.sender_id);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, groupId, authLoading]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const init = async () => {
    if (!user || !groupId) return;
    const { data: g } = await supabase.from('chat_groups').select('name, emoji').eq('id', groupId).single();
    if (g) setGroup(g);

    const { data: membership } = await supabase.from('chat_group_members').select('id').eq('group_id', groupId).eq('user_id', user.id).maybeSingle();
    if (!membership) {
      // Pas membre encore -> on le rejoint automatiquement en arrivant via un lien
      await supabase.from('chat_group_members').insert({ group_id: groupId, user_id: user.id });
    }
    setIsMember(true);

    const { data: msgs } = await supabase.from('chat_group_messages').select('*').eq('group_id', groupId).order('created_at', { ascending: true });
    if (msgs) {
      setMessages(msgs);
      const uniqueSenders = Array.from(new Set(msgs.map(m => m.sender_id)));
      uniqueSenders.forEach(ensureSenderName);
    }
  };

  const ensureSenderName = async (senderId: string) => {
    setSenderNames(prev => {
      if (prev[senderId]) return prev;
      supabase.from('profiles').select('name').eq('user_id', senderId).single().then(({ data }) => {
        if (data) setSenderNames(p => ({ ...p, [senderId]: data.name || 'Utilisateur' }));
      });
      return prev;
    });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !groupId || !content.trim() || sending) return;
    setSending(true);
    const text = content.trim();
    setContent('');
    const { error } = await supabase.from('chat_group_messages').insert({ group_id: groupId, sender_id: user.id, content: text });
    if (error) setContent(text);
    setSending(false);
  };

  const handleLeave = async () => {
    if (!user || !groupId) return;
    await supabase.from('chat_group_members').delete().eq('group_id', groupId).eq('user_id', user.id);
    toast.success('Vous avez quitté le groupe.');
    navigate('/chat');
  };

  const handleBack = () => (window.history.length > 1 ? navigate(-1) : navigate('/chat'));

  if (authLoading) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={handleBack} className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="h-9 w-9 rounded-full bg-pine-light flex items-center justify-center text-lg flex-shrink-0">
              {group?.emoji || '💬'}
            </div>
            <h1 className="font-display text-lg font-semibold">{group?.name || 'Groupe'}</h1>
          </div>
          <button onClick={handleLeave} title="Quitter le groupe" className="text-muted-foreground hover:text-destructive transition-colors">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto max-w-lg mx-auto w-full px-4 py-4 space-y-2">
        {messages.map(m => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${mine ? 'bg-primary text-white' : 'bg-secondary text-foreground'}`}
                style={{ fontFamily: 'Jost, sans-serif' }}>
                {!mine && (
                  <p className="text-xs font-semibold opacity-70 mb-0.5">{senderNames[m.sender_id] || '...'}</p>
                )}
                {m.content}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="sticky bottom-0 bg-background border-t border-border/50 px-4 py-3 safe-area-bottom">
        <div className="max-w-lg mx-auto flex gap-2">
          <input
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Écrire au groupe..."
            maxLength={2000}
            className="flex-1 px-4 py-3 rounded-full border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
            style={{ fontFamily: 'Jost, sans-serif' }}
          />
          <button type="submit" disabled={!content.trim() || sending}
            className="h-11 w-11 rounded-full bg-primary text-white flex items-center justify-center disabled:opacity-50 flex-shrink-0">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
