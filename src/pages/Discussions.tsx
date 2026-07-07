import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import BottomNav from '@/components/BottomNav';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, Send, ArrowLeft, Heart, MessageSquare, Mail, Mic, Square, Image as ImageIcon, X } from 'lucide-react';
import { SALONS } from '@/lib/constants';
import { toast } from 'sonner';
import { avatarFallbackInitial } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { ReportButton } from '@/components/ReportModal';
import { useBlockedUsers } from '@/lib/useBlockedUsers';
import { usePresence } from '@/lib/presence-context';
import { useUnreadMessages } from '@/lib/unread-context';
import { MAX_PHOTO_SIZE_MB, pickAudioMimeType, uploadVoiceMessage, uploadPhoto } from '@/lib/attachments';

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

export default function Discussions() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<'list' | 'salon' | 'forum' | 'messages'>('list');
  const [activeSalon, setActiveSalon] = useState<string | null>(null);
  const { onlineCount } = usePresence();
  const { unreadTotal } = useUnreadMessages();

  useEffect(() => { if (!user) navigate('/auth'); }, [user]);

  if (view === 'salon' && activeSalon) {
    return <SalonView salonId={activeSalon} onBack={() => setView('list')} />;
  }
  if (view === 'forum') {
    return <ForumView onBack={() => setView('list')} />;
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
            <h1 className="font-display text-2xl font-semibold">Discussions</h1>
            {onlineCount > 0 && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5" style={{ fontFamily: 'Jost, sans-serif' }}>
                <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                {onlineCount} en ligne
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
            <h3 className="font-display text-xl font-semibold">Messages privés</h3>
            <p className="text-sm text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif' }}>Vos conversations avec les membres</p>
          </div>
        </button>

        <button onClick={() => setView('forum')} className="card-premium p-5 w-full text-left flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-sand-light flex items-center justify-center text-2xl flex-shrink-0">📰</div>
          <div className="flex-1">
            <h3 className="font-display text-xl font-semibold">Forum</h3>
            <p className="text-sm text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif' }}>Annonces, questions, partages</p>
          </div>
        </button>

        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2" style={{ fontFamily: 'Jost, sans-serif' }}>
            Salons thématiques
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {SALONS.map(s => (
              <button key={s.id} onClick={() => { setActiveSalon(s.id); setView('salon'); }}
                className="card-premium p-4 text-left">
                <div className="text-2xl mb-1.5">{s.emoji}</div>
                <h3 className="font-medium text-sm mb-0.5" style={{ fontFamily: 'Jost, sans-serif' }}>{s.label}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2" style={{ fontFamily: 'Jost, sans-serif' }}>{s.desc}</p>
              </button>
            ))}
          </div>
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<PrivateConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const { isBlocked } = useBlockedUsers();
  const { isOnline } = usePresence();

  useEffect(() => { loadConversations(); }, []);

  const loadConversations = async () => {
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
        partnerName: profile?.name || 'Utilisateur',
        partnerPhoto: profile?.photo_url || null,
        lastMessage: m.content,
        lastDate: m.created_at,
        unreadCount: unreadByPartner.get(pid) || 0,
      };
    });

    setConversations(convos);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-lg font-semibold">Messages privés</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-2 pb-8">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-2xl bg-muted animate-pulse" />)}
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
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SALON — inchangé
// ─────────────────────────────────────────────────────────────
function SalonView({ salonId, onBack }: { salonId: string; onBack: () => void }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<SalonMessage[]>([]);
  const [senderNames, setSenderNames] = useState<Record<string, string>>({});
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const salon = SALONS.find(s => s.id === salonId)!;
  const { isBlocked } = useBlockedUsers();
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMessages();
    const channel = supabase
      .channel(`salon-${salonId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'salon_messages', filter: `salon=eq.${salonId}` }, (payload) => {
        const m = payload.new as SalonMessage;
        setMessages(prev => [...prev, m]);
        ensureSenderName(m.user_id);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [salonId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const loadMessages = async () => {
    const { data } = await supabase.from('salon_messages').select('*').eq('salon', salonId).order('created_at', { ascending: true }).limit(100);
    if (data) {
      setMessages(data);
      Array.from(new Set(data.map(m => m.user_id))).forEach(ensureSenderName);
    }
  };

  const ensureSenderName = async (uid: string) => {
    setSenderNames(prev => {
      if (prev[uid]) return prev;
      supabase.from('profiles').select('name').eq('user_id', uid).single().then(({ data }) => {
        if (data) setSenderNames(p => ({ ...p, [uid]: data.name || 'Membre' }));
      });
      return prev;
    });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !content.trim() || sending) return;
    setSending(true);
    const text = content.trim();
    setContent('');
    const { error } = await supabase.from('salon_messages').insert({ salon: salonId, user_id: user.id, content: text });
    if (error) setContent(text);
    setSending(false);
  };

  const handleStartRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("L'enregistrement audio n'est pas supporté sur cet appareil.");
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
      toast.error("Impossible d'accéder au micro. Vérifiez les autorisations.");
    }
  };

  const handleStopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleUploadVoice = async (blob: Blob, mimeType: string) => {
    if (!user) return;
    const url = await uploadVoiceMessage('chat-audio', user.id, blob, mimeType);
    if (!url) { toast.error("Échec de l'envoi du message vocal."); return; }
    await supabase.from('salon_messages').insert({
      salon: salonId, user_id: user.id, content: '🎤 Message vocal', attachment_url: url, attachment_type: 'audio',
    });
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) { toast.error('Merci de choisir un fichier image.'); return; }
    if (file.size > MAX_PHOTO_SIZE_MB * 1024 * 1024) { toast.error(`L'image doit faire moins de ${MAX_PHOTO_SIZE_MB} Mo.`); return; }

    setUploadingPhoto(true);
    const url = await uploadPhoto('chat-images', user.id, file);
    if (!url) { toast.error("Échec de l'envoi de la photo."); setUploadingPhoto(false); return; }
    await supabase.from('salon_messages').insert({
      salon: salonId, user_id: user.id, content: '📷 Photo', attachment_url: url, attachment_type: 'image',
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
          <h1 className="font-display text-lg font-semibold">{salon.label}</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto max-w-lg mx-auto w-full px-4 py-4 space-y-2">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8" style={{ fontFamily: 'Jost, sans-serif' }}>
            Soyez le premier à écrire dans ce salon 👋
          </p>
        )}
        {messages.filter(m => !isBlocked(m.user_id)).map(m => {
          const mine = m.user_id === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              {m.attachment_type === 'audio' && m.attachment_url ? (
                <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${mine ? 'bg-primary' : 'bg-secondary'}`}>
                  {!mine && <p className={cn('text-xs font-semibold opacity-70 mb-0.5', mine ? '' : 'text-foreground')}>{senderNames[m.user_id] || '...'}</p>}
                  <audio controls src={m.attachment_url} className="h-9 max-w-[220px]" />
                </div>
              ) : m.attachment_type === 'image' && m.attachment_url ? (
                <a href={m.attachment_url} target="_blank" rel="noopener noreferrer" className="block max-w-[75%] rounded-2xl overflow-hidden">
                  <img src={m.attachment_url} alt="Photo envoyée" className="max-h-64 w-auto object-cover" />
                </a>
              ) : (
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${mine ? 'bg-primary text-white' : 'bg-secondary text-foreground'}`}
                  style={{ fontFamily: 'Jost, sans-serif' }}>
                  {!mine && <p className="text-xs font-semibold opacity-70 mb-0.5">{senderNames[m.user_id] || '...'}</p>}
                  {m.content}
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="sticky bottom-0 bg-background border-t border-border/50 px-4 py-3 safe-area-bottom">
        <div className="max-w-lg mx-auto flex gap-2">
          <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
          {!isRecording && (
            <button type="button" onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto}
              className="h-11 w-11 rounded-full border border-border flex items-center justify-center flex-shrink-0 text-muted-foreground hover:text-foreground disabled:opacity-50"
              title="Envoyer une photo">
              <ImageIcon className="h-4 w-4" />
            </button>
          )}
          <input value={content} onChange={e => setContent(e.target.value)} maxLength={1000}
            placeholder={`Écrire dans #${salon.label.toLowerCase()}...`}
            className="flex-1 px-4 py-3 rounded-full border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
            style={{ fontFamily: 'Jost, sans-serif' }} />
          {content.trim() ? (
            <button type="submit" disabled={sending}
              className="h-11 w-11 rounded-full bg-primary text-white flex items-center justify-center disabled:opacity-50 flex-shrink-0">
              <Send className="h-4 w-4" />
            </button>
          ) : (
            <button type="button" onClick={isRecording ? handleStopRecording : handleStartRecording}
              className={`h-11 w-11 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${isRecording ? 'bg-destructive text-white animate-pulse' : 'bg-primary text-white'}`}
              title={isRecording ? 'Arrêter et envoyer' : 'Message vocal'}>
              {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// FORUM — inchangé
// ─────────────────────────────────────────────────────────────
function ForumView({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [authorNames, setAuthorNames] = useState<Record<string, string>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [myLikes, setMyLikes] = useState<Set<string>>(new Set());
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);
  const [openComments, setOpenComments] = useState<string | null>(null);
  const { isBlocked } = useBlockedUsers();
  const [pendingAttachment, setPendingAttachment] = useState<{ url: string; type: 'audio' | 'image' } | null>(null);
  const [attaching, setAttaching] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadPosts(); }, []);

  const loadPosts = async () => {
    const { data } = await supabase.from('forum_posts').select('*').order('created_at', { ascending: false }).limit(50);
    if (!data) return;
    setPosts(data);

    const authorIds = Array.from(new Set(data.map(p => p.author_id)));
    if (authorIds.length) {
      const { data: profiles } = await supabase.from('profiles').select('user_id, name').in('user_id', authorIds);
      const map: Record<string, string> = {};
      (profiles || []).forEach(p => { map[p.user_id] = p.name || 'Membre'; });
      setAuthorNames(map);
    }

    const postIds = data.map(p => p.id);
    if (postIds.length) {
      const { data: likes } = await supabase.from('forum_likes').select('post_id, user_id').in('post_id', postIds);
      const counts: Record<string, number> = {};
      const mine = new Set<string>();
      (likes || []).forEach(l => {
        counts[l.post_id] = (counts[l.post_id] || 0) + 1;
        if (l.user_id === user?.id) mine.add(l.post_id);
      });
      setLikeCounts(counts);
      setMyLikes(mine);

      const { data: comments } = await supabase.from('forum_comments').select('post_id').in('post_id', postIds);
      const cCounts: Record<string, number> = {};
      (comments || []).forEach(c => { cCounts[c.post_id] = (cCounts[c.post_id] || 0) + 1; });
      setCommentCounts(cCounts);
    }
  };

  const handlePost = async () => {
    if (!user || (!newPost.trim() && !pendingAttachment) || posting) return;
    setPosting(true);
    const text = newPost.trim() || (pendingAttachment?.type === 'audio' ? '🎤 Message vocal' : '📷 Photo');
    const { error } = await supabase.from('forum_posts').insert({
      author_id: user.id,
      content: text,
      attachment_url: pendingAttachment?.url,
      attachment_type: pendingAttachment?.type,
    });
    if (error) toast.error("Impossible de publier.");
    else { setNewPost(''); setPendingAttachment(null); loadPosts(); }
    setPosting(false);
  };

  const handleStartRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("L'enregistrement audio n'est pas supporté sur cet appareil.");
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
        if (!url) { toast.error("Échec de l'envoi du message vocal."); return; }
        setPendingAttachment({ url, type: 'audio' });
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      toast.error("Impossible d'accéder au micro. Vérifiez les autorisations.");
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
    if (!file.type.startsWith('image/')) { toast.error('Merci de choisir un fichier image.'); return; }
    if (file.size > MAX_PHOTO_SIZE_MB * 1024 * 1024) { toast.error(`L'image doit faire moins de ${MAX_PHOTO_SIZE_MB} Mo.`); return; }

    setAttaching(true);
    const url = await uploadPhoto('chat-images', user.id, file);
    setAttaching(false);
    if (!url) { toast.error("Échec de l'envoi de la photo."); return; }
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

  return (
    <div className="min-h-screen pb-28 bg-background">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-lg font-semibold">📰 Forum</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        <div className="card-premium p-4 space-y-2">
          <textarea value={newPost} onChange={e => setNewPost(e.target.value)} maxLength={1000} rows={2}
            placeholder="Quoi de neuf sur l'île ?"
            className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            style={{ fontFamily: 'Jost, sans-serif' }} />

          {pendingAttachment && (
            <div className="relative inline-block">
              {pendingAttachment.type === 'image' ? (
                <img src={pendingAttachment.url} alt="Photo à publier" className="max-h-32 rounded-xl" />
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
              title="Joindre une photo">
              <ImageIcon className="h-4 w-4" />
            </button>
            <button type="button" onClick={isRecording ? handleStopRecording : handleStartRecording} disabled={attaching || !!pendingAttachment}
              className={cn('h-9 w-9 rounded-full border flex items-center justify-center flex-shrink-0 disabled:opacity-50 transition-colors',
                isRecording ? 'bg-destructive text-white border-destructive animate-pulse' : 'border-border text-muted-foreground hover:text-foreground')}
              title={isRecording ? 'Arrêter' : 'Joindre un vocal'}>
              {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
            <button onClick={handlePost} disabled={(!newPost.trim() && !pendingAttachment) || posting || attaching}
              className="btn-ocean flex-1 py-2.5 text-sm disabled:opacity-50">
              {posting ? 'Publication...' : attaching ? 'Envoi...' : 'Publier'}
            </button>
          </div>
        </div>

        {posts.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8" style={{ fontFamily: 'Jost, sans-serif' }}>
            Aucun post pour l'instant. Lancez la discussion !
          </p>
        )}

        {posts.filter(post => !isBlocked(post.author_id)).map(post => (
          <div key={post.id} className="card-premium p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-ocean-light flex items-center justify-center text-xs font-semibold text-primary/70 flex-shrink-0">
                  {avatarFallbackInitial(authorNames[post.author_id])}
                </div>
                <span className="text-sm font-medium" style={{ fontFamily: 'Jost, sans-serif' }}>{authorNames[post.author_id] || 'Membre'}</span>
              </div>
              {post.author_id !== user?.id && (
                <ReportButton targetType="forum_post" targetId={post.id} targetUserId={post.author_id} className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-lg hover:bg-destructive/10" />
              )}
            </div>
            <p className="text-sm" style={{ fontFamily: 'Jost, sans-serif', lineHeight: 1.6 }}>{post.content}</p>
            {post.attachment_type === 'image' && post.attachment_url && (
              <a href={post.attachment_url} target="_blank" rel="noopener noreferrer" className="block rounded-xl overflow-hidden">
                <img src={post.attachment_url} alt="Photo du post" className="max-h-72 w-full object-cover" />
              </a>
            )}
            {post.attachment_type === 'audio' && post.attachment_url && (
              <audio controls src={post.attachment_url} className="h-9 max-w-full" />
            )}
            <div className="flex items-center gap-4 pt-1">
              <button onClick={() => toggleLike(post.id)} className={cn('flex items-center gap-1.5 text-xs', myLikes.has(post.id) ? 'text-red-500' : 'text-muted-foreground')}>
                <Heart className={cn('h-4 w-4', myLikes.has(post.id) && 'fill-red-500')} />
                {likeCounts[post.id] || 0}
              </button>
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
      <BottomNav />
    </div>
  );
}

function CommentsPanel({ postId, onCommentAdded }: { postId: string; onCommentAdded: () => void }) {
  const { user } = useAuth();
  const [comments, setComments] = useState<{ id: string; content: string; author_id: string }[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [text, setText] = useState('');

  useEffect(() => { load(); }, [postId]);

  const load = async () => {
    const { data } = await supabase.from('forum_comments').select('id, content, author_id').eq('post_id', postId).order('created_at', { ascending: true });
    if (data) {
      setComments(data);
      const ids = Array.from(new Set(data.map(c => c.author_id)));
      if (ids.length) {
        const { data: profiles } = await supabase.from('profiles').select('user_id, name').in('user_id', ids);
        const map: Record<string, string> = {};
        (profiles || []).forEach(p => { map[p.user_id] = p.name || 'Membre'; });
        setNames(map);
      }
    }
  };

  const submit = async () => {
    if (!user || !text.trim()) return;
    const content = text.trim();
    setText('');
    const { error } = await supabase.from('forum_comments').insert({ post_id: postId, author_id: user.id, content });
    if (!error) { onCommentAdded(); load(); }
  };

  return (
    <div className="pt-2 border-t border-border/50 space-y-2">
      {comments.map(c => (
        <div key={c.id} className="text-xs" style={{ fontFamily: 'Jost, sans-serif' }}>
          <span className="font-semibold">{names[c.author_id] || 'Membre'} : </span>
          <span className="text-muted-foreground">{c.content}</span>
        </div>
      ))}
      <div className="flex gap-2">
        <input value={text} onChange={e => setText(e.target.value)} maxLength={500} placeholder="Ajouter un commentaire..."
          className="flex-1 px-3 py-1.5 rounded-full border border-border bg-background text-xs outline-none focus:ring-2 focus:ring-primary/20"
          style={{ fontFamily: 'Jost, sans-serif' }} />
        <button onClick={submit} disabled={!text.trim()} className="text-xs text-primary font-medium disabled:opacity-50">Envoyer</button>
      </div>
    </div>
  );
}
