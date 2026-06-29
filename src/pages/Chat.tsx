import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { ArrowLeft, Send, MoreVertical } from 'lucide-react';
import { avatarFallbackInitial } from '@/lib/constants';
import { ReportModal } from '@/components/ReportModal';
import { useBlockedUsers } from '@/lib/useBlockedUsers';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

export default function Chat() {
  const { partnerId } = useParams<{ partnerId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [partner, setPartner] = useState<{ name: string | null; photo_url: string | null } | null>(null);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { isBlocked, blockUser, unblockUser } = useBlockedUsers();

  useEffect(() => {
    // BUG FIX (#13) : on attend la fin du chargement auth avant de décider
    // de rediriger, pour éviter le flash de contenu protégé.
    if (authLoading) return;
    if (!user || !partnerId) { navigate('/auth'); return; }
    loadPartner();
    loadMessages();

    const channel = supabase
      .channel(`messages-${user.id}-${partnerId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const m = payload.new as Message;
        if ((m.sender_id === user.id && m.receiver_id === partnerId) || (m.sender_id === partnerId && m.receiver_id === user.id)) {
          setMessages(prev => [...prev, m]);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, partnerId, authLoading]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadPartner = async () => {
    if (!partnerId) return;
    const { data } = await supabase.from('profiles').select('name, photo_url').eq('user_id', partnerId).single();
    if (data) setPartner(data);
  };

  const loadMessages = async () => {
    if (!user || !partnerId) return;
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !partnerId || !content.trim() || sending) return;
    setSending(true);
    const text = content.trim();
    setContent('');
    const { error } = await supabase.from('messages').insert({ sender_id: user.id, receiver_id: partnerId, content: text });
    if (error) setContent(text);
    setSending(false);
  };

  const handleBack = () => (window.history.length > 1 ? navigate(-1) : navigate('/chat'));

  if (authLoading) return null;

  const blocked = partnerId ? isBlocked(partnerId) : false;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={handleBack} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="h-9 w-9 rounded-full overflow-hidden bg-ocean-light flex items-center justify-center flex-shrink-0">
            {partner?.photo_url ? (
              <img src={partner.photo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="font-display text-sm text-primary/60">{avatarFallbackInitial(partner?.name)}</span>
            )}
          </div>
          <h1 className="font-display text-lg font-semibold flex-1">{partner?.name || 'Conversation'}</h1>

          {/* Menu sécurité : signaler / bloquer */}
          <div className="relative">
            <button onClick={() => setMenuOpen(!menuOpen)} className="text-muted-foreground hover:text-foreground p-1.5">
              <MoreVertical className="h-5 w-5" />
            </button>
            {menuOpen && (
              <div className="absolute top-9 right-0 bg-card rounded-xl shadow-lg border border-border/50 py-1 w-44 z-20">
                <button
                  onClick={() => { setReportOpen(true); setMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-secondary flex items-center gap-2"
                  style={{ fontFamily: 'Jost, sans-serif' }}>
                  🚩 Signaler {partner?.name || 'cet utilisateur'}
                </button>
                <button
                  onClick={() => { if (partnerId) { blocked ? unblockUser(partnerId) : blockUser(partnerId); } setMenuOpen(false); if (!blocked) navigate('/chat'); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-secondary flex items-center gap-2 text-destructive"
                  style={{ fontFamily: 'Jost, sans-serif' }}>
                  {blocked ? '✅ Débloquer' : '🚫 Bloquer'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {reportOpen && partnerId && (
        <ReportModal targetType="profile" targetId={partnerId} targetUserId={partnerId} onClose={() => setReportOpen(false)} />
      )}

      {blocked ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <p className="text-4xl mb-3">🚫</p>
          <p className="text-sm text-muted-foreground max-w-xs" style={{ fontFamily: 'Jost, sans-serif' }}>
            Vous avez bloqué {partner?.name || 'cet utilisateur'}. Débloquez-le depuis le menu pour reprendre la conversation.
          </p>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto max-w-lg mx-auto w-full px-4 py-4 space-y-2">
            {messages.map(m => {
              const mine = m.sender_id === user?.id;
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${mine ? 'bg-primary text-white' : 'bg-secondary text-foreground'}`}
                    style={{ fontFamily: 'Jost, sans-serif' }}>
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
                placeholder="Écrire un message..."
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
        </>
      )}
    </div>
  );
}
