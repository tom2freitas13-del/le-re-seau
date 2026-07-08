import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { ArrowLeft, Send, LogOut, Mic, Square, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { avatarFallbackInitial } from '@/lib/constants';
import { MAX_PHOTO_SIZE_MB, pickAudioMimeType, uploadVoiceMessage, uploadPhoto } from '@/lib/attachments';

interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  content: string;
  is_system?: boolean;
  attachment_url?: string | null;
  attachment_type?: 'audio' | 'image' | null;
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
  const [accessDenied, setAccessDenied] = useState(false);
  const [linkedActivityId, setLinkedActivityId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const stopTypingTimeout = useRef<ReturnType<typeof setTimeout>>();
  const typingClearTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

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
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (!payload?.userId || payload.userId === user.id) return;
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
  }, [user, groupId, authLoading]);

  // Marque le groupe comme lu à l'entrée et à la sortie, pour que le badge
  // de non-lus se remette bien à zéro.
  useEffect(() => {
    if (!user || !groupId) return;
    const markAsRead = () => {
      supabase.from('group_reads').upsert({ user_id: user.id, group_id: groupId, last_read_at: new Date().toISOString() }, { onConflict: 'user_id,group_id' }).then();
    };
    markAsRead();
    return markAsRead;
  }, [user, groupId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const init = async () => {
    if (!user || !groupId) return;
    const { data: g } = await supabase.from('chat_groups').select('name, emoji').eq('id', groupId).single();
    if (g) setGroup(g);

    const { data: linkedActivity } = await supabase.from('activities').select('id').eq('group_id', groupId).maybeSingle();
    if (linkedActivity) setLinkedActivityId(linkedActivity.id);

    const { data: membership } = await supabase.from('chat_group_members').select('id').eq('group_id', groupId).eq('user_id', user.id).maybeSingle();
    if (!membership) {
      // Un groupe lié à une activité n'est accessible qu'en rejoignant
      // l'activité — pas d'auto-join comme pour un groupe créé à la main.
      if (linkedActivity) {
        setAccessDenied(true);
        return;
      }
      // Groupe classique -> on le rejoint automatiquement en arrivant via un lien
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
    if (!user || !groupId || !content.trim() || sending) return;
    setSending(true);
    const text = content.trim();
    setContent('');
    clearTimeout(stopTypingTimeout.current);
    sendTyping(false);
    const { error } = await supabase.from('chat_group_messages').insert({ group_id: groupId, sender_id: user.id, content: text });
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
    if (!user || !groupId) return;
    const url = await uploadVoiceMessage('chat-audio', user.id, blob, mimeType);
    if (!url) { toast.error("Échec de l'envoi du message vocal."); return; }
    await supabase.from('chat_group_messages').insert({
      group_id: groupId, sender_id: user.id, content: '🎤 Message vocal', attachment_url: url, attachment_type: 'audio',
    });
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user || !groupId) return;
    if (!file.type.startsWith('image/')) { toast.error('Merci de choisir un fichier image.'); return; }
    if (file.size > MAX_PHOTO_SIZE_MB * 1024 * 1024) { toast.error(`L'image doit faire moins de ${MAX_PHOTO_SIZE_MB} Mo.`); return; }

    setUploadingPhoto(true);
    const url = await uploadPhoto('chat-images', user.id, file);
    if (!url) { toast.error("Échec de l'envoi de la photo."); setUploadingPhoto(false); return; }
    await supabase.from('chat_group_messages').insert({
      group_id: groupId, sender_id: user.id, content: '📷 Photo', attachment_url: url, attachment_type: 'image',
    });
    setUploadingPhoto(false);
  };

  const handleLeave = async () => {
    if (!user || !groupId) return;
    if (linkedActivityId) {
      // Groupe d'activité : quitter le groupe = quitter l'activité (le
      // message système et le retrait du groupe sont gérés par le trigger).
      await supabase.from('activity_participants').delete().eq('activity_id', linkedActivityId).eq('user_id', user.id);
      toast.success("Vous avez quitté l'activité.");
      navigate('/activities');
      return;
    }
    await supabase.from('chat_group_members').delete().eq('group_id', groupId).eq('user_id', user.id);
    toast.success('Vous avez quitté le groupe.');
    navigate('/discussions');
  };

  const handleBack = () => (window.history.length > 1 ? navigate(-1) : navigate('/discussions'));

  if (authLoading) return null;

  if (accessDenied) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-background">
        <p className="text-4xl mb-3">🔒</p>
        <h1 className="font-display text-xl font-semibold mb-2">Accès réservé aux participants</h1>
        <p className="text-sm text-muted-foreground max-w-xs mb-6" style={{ fontFamily: 'Jost, sans-serif' }}>
          Rejoignez l'activité pour accéder à sa discussion et échanger avec les autres participants.
        </p>
        <button onClick={() => navigate('/activities')} className="btn-ocean">Voir les activités</button>
      </div>
    );
  }

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
          if (m.is_system) {
            return (
              <div key={m.id} className="flex justify-center py-1">
                <span className="text-xs text-muted-foreground bg-secondary/60 rounded-full px-3 py-1" style={{ fontFamily: 'Jost, sans-serif' }}>
                  {m.content}
                </span>
              </div>
            );
          }
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              {m.attachment_type === 'audio' && m.attachment_url ? (
                <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${mine ? 'bg-primary' : 'bg-secondary'}`}>
                  {!mine && <p className="text-xs font-semibold opacity-70 mb-0.5">{senderNames[m.sender_id] || '...'}</p>}
                  <audio controls src={m.attachment_url} className="h-9 max-w-[220px]" />
                </div>
              ) : m.attachment_type === 'image' && m.attachment_url ? (
                <a href={m.attachment_url} target="_blank" rel="noopener noreferrer" className="block max-w-[75%] rounded-2xl overflow-hidden">
                  <img src={m.attachment_url} alt="Photo envoyée" className="max-h-64 w-auto object-cover" />
                </a>
              ) : (
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${mine ? 'bg-primary text-white' : 'bg-secondary text-foreground'}`}
                  style={{ fontFamily: 'Jost, sans-serif' }}>
                  {!mine && (
                    <p className="text-xs font-semibold opacity-70 mb-0.5">{senderNames[m.sender_id] || '...'}</p>
                  )}
                  {m.content}
                </div>
              )}
            </div>
          );
        })}
        {typingUsers.size > 0 && (
          <div className="flex flex-col gap-0.5">
            <p className="text-[11px] text-muted-foreground pl-1" style={{ fontFamily: 'Jost, sans-serif' }}>
              {Array.from(typingUsers).map(id => senderNames[id] || '...').join(', ')} {typingUsers.size > 1 ? 'écrivent' : 'écrit'}...
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
              title="Envoyer une photo">
              <ImageIcon className="h-4 w-4" />
            </button>
          )}
          <input
            value={content}
            onChange={e => handleContentChange(e.target.value)}
            placeholder="Écrire au groupe..."
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
    </div>
  );
}
