import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { ArrowLeft, Send, MoreVertical, Check, CheckCheck, Mic, Square, SmilePlus, Image as ImageIcon } from 'lucide-react';
import { AdminBadge } from '@/components/ProfileCard';
import { avatarFallbackInitial, formatLastSeen } from '@/lib/constants';
import { ReportModal } from '@/components/ReportModal';
import { useBlockedUsers } from '@/lib/useBlockedUsers';
import { usePresence } from '@/lib/presence-context';
import { toast } from 'sonner';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read?: boolean;
  attachment_url?: string | null;
  attachment_type?: 'audio' | 'image' | null;
}

const MAX_PHOTO_SIZE_MB = 5;

interface Reaction {
  message_id: string;
  user_id: string;
  emoji: string;
}

const REACTION_EMOJIS = ['❤️', '😂', '👍', '😮', '😢'];

export default function Chat() {
  const { partnerId } = useParams<{ partnerId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [partner, setPartner] = useState<{ name: string | null; photo_url: string | null; last_seen: string | null; is_admin?: boolean | null } | null>(null);
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { isBlocked, blockUser, unblockUser } = useBlockedUsers();
  const { isOnline } = usePresence();
  const partnerOnline = partnerId ? isOnline(partnerId) : false;
  const [partnerTyping, setPartnerTyping] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const stopTypingTimeout = useRef<ReturnType<typeof setTimeout>>();
  const partnerTypingTimeout = useRef<ReturnType<typeof setTimeout>>();
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !partnerId) { navigate('/auth'); return; }
    loadPartner();
    loadMessages();

    // Nom de canal identique quel que soit qui l'ouvre en premier — sinon
    // le broadcast "typing" ne circule jamais entre les deux (un canal
    // par participant = deux topics distincts, jamais reliés).
    const channelName = `messages-${[user.id, partnerId].sort().join('-')}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const m = payload.new as Message;
        if ((m.sender_id === user.id && m.receiver_id === partnerId) || (m.sender_id === partnerId && m.receiver_id === user.id)) {
          setMessages(prev => [...prev, m]);
          if (m.sender_id === partnerId && m.receiver_id === user.id) {
            supabase.from('messages').update({ read: true }).eq('id', m.id).then();
          }
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
        const m = payload.new as Message;
        if (m.sender_id === user.id && m.receiver_id === partnerId) {
          setMessages(prev => prev.map(msg => msg.id === m.id ? { ...msg, read: m.read } : msg));
        }
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload?.userId !== partnerId) return;
        setPartnerTyping(!!payload.typing);
        clearTimeout(partnerTypingTimeout.current);
        if (payload.typing) partnerTypingTimeout.current = setTimeout(() => setPartnerTyping(false), 4000);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'message_reactions' }, (payload) => {
        setReactions(rs => [...rs, payload.new as Reaction]);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'message_reactions' }, (payload) => {
        const r = payload.old as Reaction;
        setReactions(rs => rs.filter(x => !(x.message_id === r.message_id && x.user_id === r.user_id && x.emoji === r.emoji)));
      })
      .subscribe();

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [user, partnerId, authLoading]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadPartner = async () => {
    if (!partnerId) return;
    const { data } = await supabase.from('profiles').select('name, photo_url, last_seen, is_admin').eq('user_id', partnerId).single();
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

    if (data?.length) {
      const { data: reactionRows } = await supabase
        .from('message_reactions')
        .select('message_id, user_id, emoji')
        .in('message_id', data.map(m => m.id));
      if (reactionRows) setReactions(reactionRows);
    }

    // Marque comme lus tous les messages reçus de ce contact
    await supabase
      .from('messages')
      .update({ read: true })
      .eq('sender_id', partnerId)
      .eq('receiver_id', user.id)
      .eq('read', false);
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
    if (!user || !partnerId || !content.trim() || sending) return;
    setSending(true);
    const text = content.trim();
    setContent('');
    clearTimeout(stopTypingTimeout.current);
    sendTyping(false);
    const { error } = await supabase.from('messages').insert({ sender_id: user.id, receiver_id: partnerId, content: text });
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
      // Le format réellement produit varie selon l'appareil (webm/opus sur
      // desktop et Android, mp4/aac sur iOS Safari) — on ne peut pas le
      // figer, sous peine d'uploader un fichier dont l'extension/Content-Type
      // mentent sur son contenu réel et cassent la lecture côté récepteur.
      const preferredType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(t => MediaRecorder.isTypeSupported(t));
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
    if (!user || !partnerId) return;
    const extension = mimeType.includes('mp4') ? 'm4a' : mimeType.includes('ogg') ? 'ogg' : 'webm';
    const path = `${user.id}/${Date.now()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from('chat-audio').upload(path, blob, { contentType: mimeType });
    if (uploadError) { toast.error("Échec de l'envoi du message vocal."); return; }
    const { data } = supabase.storage.from('chat-audio').getPublicUrl(path);
    await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: partnerId,
      content: '🎤 Message vocal',
      attachment_url: data.publicUrl,
      attachment_type: 'audio',
    });
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user || !partnerId) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Merci de choisir un fichier image.');
      return;
    }
    if (file.size > MAX_PHOTO_SIZE_MB * 1024 * 1024) {
      toast.error(`L'image doit faire moins de ${MAX_PHOTO_SIZE_MB} Mo.`);
      return;
    }

    setUploadingPhoto(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('chat-images').upload(path, file, { contentType: file.type });
    if (uploadError) {
      toast.error("Échec de l'envoi de la photo.");
      setUploadingPhoto(false);
      return;
    }
    const { data } = supabase.storage.from('chat-images').getPublicUrl(path);
    await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: partnerId,
      content: '📷 Photo',
      attachment_url: data.publicUrl,
      attachment_type: 'image',
    });
    setUploadingPhoto(false);
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;
    setPickerFor(null);
    const mine = reactions.find(r => r.message_id === messageId && r.user_id === user.id && r.emoji === emoji);
    if (mine) {
      setReactions(rs => rs.filter(r => r !== mine));
      await supabase.from('message_reactions').delete().eq('message_id', messageId).eq('user_id', user.id).eq('emoji', emoji);
    } else {
      setReactions(rs => [...rs, { message_id: messageId, user_id: user.id, emoji }]);
      await supabase.from('message_reactions').insert({ message_id: messageId, user_id: user.id, emoji });
    }
  };

  const handleBack = () => (window.history.length > 1 ? navigate(-1) : navigate('/chat'));

  if (authLoading) return null;

  const blocked = partnerId ? isBlocked(partnerId) : false;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={handleBack} className="min-h-10 min-w-10 -ml-2 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="relative flex-shrink-0">
            <div className="h-9 w-9 rounded-full overflow-hidden bg-ocean-light flex items-center justify-center">
              {partner?.photo_url ? (
                <img src={partner.photo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="font-display text-sm text-primary/60">{avatarFallbackInitial(partner?.name)}</span>
              )}
            </div>
            {partnerOnline && (
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-background" title="En ligne" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-lg font-semibold flex items-center gap-1.5 min-w-0">
              <span className="truncate">{partner?.name || 'Conversation'}</span>
              {partner?.is_admin && <AdminBadge />}
            </h1>
            <p className="text-xs text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif' }}>
              {partnerOnline ? 'En ligne' : formatLastSeen(partner?.last_seen)}
            </p>
          </div>

          <div className="relative">
            <button onClick={() => setMenuOpen(!menuOpen)} className="min-h-10 min-w-10 flex items-center justify-center text-muted-foreground hover:text-foreground">
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
              const messageReactions = reactions.filter(r => r.message_id === m.id);
              const grouped = REACTION_EMOJIS
                .map(emoji => ({ emoji, count: messageReactions.filter(r => r.emoji === emoji).length }))
                .filter(g => g.count > 0);
              return (
                <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                  <div className={`group flex items-end gap-1.5 ${mine ? 'flex-row-reverse' : 'flex-row'}`}>
                    {m.attachment_type === 'audio' && m.attachment_url ? (
                      <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${mine ? 'bg-primary' : 'bg-secondary'}`}>
                        <audio controls src={m.attachment_url} className="h-9 max-w-[220px]" />
                      </div>
                    ) : m.attachment_type === 'image' && m.attachment_url ? (
                      <a href={m.attachment_url} target="_blank" rel="noopener noreferrer" className="block max-w-[75%] rounded-2xl overflow-hidden">
                        <img src={m.attachment_url} alt="Photo envoyée" className="max-h-64 w-auto object-cover" />
                      </a>
                    ) : (
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${mine ? 'bg-primary text-white' : 'bg-secondary text-foreground'}`}
                        style={{ fontFamily: 'Jost, sans-serif' }}>
                        {m.content}
                      </div>
                    )}
                    <button onClick={() => setPickerFor(pickerFor === m.id ? null : m.id)}
                      className="h-9 w-9 flex items-center justify-center text-muted-foreground/50 hover:text-foreground transition-colors flex-shrink-0">
                      <SmilePlus className="h-4 w-4" />
                    </button>
                  </div>

                  {pickerFor === m.id && (
                    <div className="flex gap-1 bg-card border border-border/50 rounded-full px-2 py-1.5 shadow-lg mt-1">
                      {REACTION_EMOJIS.map(emoji => (
                        <button key={emoji} onClick={() => toggleReaction(m.id, emoji)}
                          className="text-lg hover:scale-125 transition-transform">
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  {grouped.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {grouped.map(({ emoji, count }) => {
                        const reactedByMe = messageReactions.some(r => r.emoji === emoji && r.user_id === user?.id);
                        return (
                          <button key={emoji} onClick={() => toggleReaction(m.id, emoji)}
                            className={`text-xs rounded-full px-2 py-0.5 border flex items-center gap-1 ${reactedByMe ? 'border-primary bg-ocean-light' : 'border-border/50 bg-card'}`}>
                            {emoji} {count > 1 && <span className="text-muted-foreground">{count}</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {mine && (
                    m.read
                      ? <CheckCheck className="h-3.5 w-3.5 text-primary mt-0.5 mr-1" />
                      : <Check className="h-3.5 w-3.5 text-muted-foreground mt-0.5 mr-1" />
                  )}
                </div>
              );
            })}
            {partnerTyping && (
              <div className="flex justify-start">
                <div className="bg-secondary rounded-2xl px-4 py-2.5 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '300ms' }} />
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
                  title="Envoyer une photo">
                  <ImageIcon className="h-4 w-4" />
                </button>
              )}
              <input
                value={content}
                onChange={e => handleContentChange(e.target.value)}
                placeholder="Écrire un message..."
                maxLength={2000}
                className="flex-1 px-4 py-3 rounded-full border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
                style={{ fontFamily: 'Jost, sans-serif' }}
              />
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
        </>
      )}
    </div>
  );
}
