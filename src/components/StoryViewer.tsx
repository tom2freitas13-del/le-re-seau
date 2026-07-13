import { useEffect, useRef, useState } from 'react';
import { X, Eye, Trash2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { avatarFallbackInitial } from '@/lib/constants';

export interface StoryItem {
  id: string;
  user_id: string;
  image_url: string | null;
  text: string | null;
  background_color: string | null;
  created_at: string;
}

export interface StoryAuthorGroup {
  user_id: string;
  name: string | null;
  photo_url: string | null;
  stories: StoryItem[];
}

const STORY_DURATION_MS = 5000;

function timeAgo(iso: string, t: (key: string, options?: Record<string, unknown>) => string): string {
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return t('storyViewer.justNow');
  if (diffMin < 60) return t('storyViewer.minAgo', { count: diffMin });
  return t('storyViewer.hoursAgo', { count: Math.floor(diffMin / 60) });
}

export default function StoryViewer({ groups, startGroupIndex, onClose }: {
  groups: StoryAuthorGroup[];
  startGroupIndex: number;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [localGroups, setLocalGroups] = useState(groups);
  const [groupIndex, setGroupIndex] = useState(startGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [viewers, setViewers] = useState<{ name: string | null }[] | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [paused, setPaused] = useState(false);
  const rafRef = useRef<number>();
  const startRef = useRef<number>(0);
  const progressRef = useRef(0);

  const group = localGroups[groupIndex];
  const story = group?.stories[storyIndex];
  const isMine = story?.user_id === user?.id;

  const goNextStory = () => {
    if (!group) return;
    if (storyIndex < group.stories.length - 1) {
      setStoryIndex(i => i + 1);
    } else if (groupIndex < localGroups.length - 1) {
      setGroupIndex(i => i + 1);
      setStoryIndex(0);
    } else {
      onClose();
    }
  };

  const goPrevStory = () => {
    if (storyIndex > 0) {
      setStoryIndex(i => i - 1);
    } else if (groupIndex > 0) {
      const prevGroup = localGroups[groupIndex - 1];
      setGroupIndex(i => i - 1);
      setStoryIndex(prevGroup.stories.length - 1);
    }
  };

  const handleDelete = async () => {
    if (!story || deleting) return;
    if (!window.confirm(t('storyViewer.confirmDelete'))) return;
    setDeleting(true);
    const { error } = await supabase.from('stories').delete().eq('id', story.id);
    setDeleting(false);
    if (error) { toast.error(t('storyViewer.deleteError')); return; }
    toast.success(t('storyViewer.deleted'));

    const remainingStories = group.stories.filter(s => s.id !== story.id);
    if (remainingStories.length > 0) {
      const newGroups = [...localGroups];
      newGroups[groupIndex] = { ...group, stories: remainingStories };
      setLocalGroups(newGroups);
      setStoryIndex(i => Math.min(i, remainingStories.length - 1));
    } else {
      const newGroups = localGroups.filter((_, i) => i !== groupIndex);
      if (newGroups.length === 0) { onClose(); return; }
      setLocalGroups(newGroups);
      setStoryIndex(0);
      setGroupIndex(i => Math.min(i, newGroups.length - 1));
    }
  };

  // Enregistre la vue dès qu'une story s'affiche.
  useEffect(() => {
    if (!story || !user) return;
    supabase.from('story_views').upsert(
      { story_id: story.id, viewer_id: user.id },
      { onConflict: 'story_id,viewer_id', ignoreDuplicates: true }
    ).then();
    setViewers(null);
  }, [story?.id, user]);

  // Remet la progression à zéro à chaque changement de story (pas au pause/reprise).
  useEffect(() => {
    setProgress(0);
    progressRef.current = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIndex, storyIndex]);

  // Barre de progression + avance automatique. En pause (réponse en cours de
  // frappe), on ne fait qu'annuler la boucle ; à la reprise, on repart de la
  // progression déjà atteinte plutôt que de tout recommencer à zéro.
  useEffect(() => {
    if (paused) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }
    startRef.current = performance.now() - progressRef.current * STORY_DURATION_MS;
    const tick = (now: number) => {
      const elapsed = now - startRef.current;
      const pct = Math.min(elapsed / STORY_DURATION_MS, 1);
      progressRef.current = pct;
      setProgress(pct);
      if (pct >= 1) {
        goNextStory();
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIndex, storyIndex, paused]);

  const loadViewers = async () => {
    if (!story) return;
    const { data } = await supabase.from('story_views').select('viewer_id').eq('story_id', story.id);
    if (!data?.length) { setViewers([]); return; }
    const ids = data.map(v => v.viewer_id);
    const { data: profiles } = await supabase.from('profiles').select('user_id, name').in('user_id', ids);
    setViewers((profiles || []).map(p => ({ name: p.name })));
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !story || !replyText.trim() || sendingReply) return;
    setSendingReply(true);
    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: story.user_id,
      content: replyText.trim(),
    });
    setSendingReply(false);
    if (error) { toast.error(t('storyViewer.replyError')); return; }
    toast.success(t('storyViewer.replySent'));
    setReplyText('');
    setPaused(false);
  };

  if (!group || !story) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col">
      <div className="flex gap-1 px-3 pt-3">
        {group.stories.map((s, i) => (
          <div key={s.id} className="h-0.5 flex-1 rounded-full bg-white/30 overflow-hidden">
            <div className="h-full bg-white transition-all"
              style={{ width: i < storyIndex ? '100%' : i === storyIndex ? `${progress * 100}%` : '0%' }} />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2.5 px-3 py-3">
        <div className="h-8 w-8 rounded-full overflow-hidden bg-ocean-light flex items-center justify-center flex-shrink-0">
          {group.photo_url ? (
            <img src={group.photo_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="font-display text-xs text-primary/60">{avatarFallbackInitial(group.name)}</span>
          )}
        </div>
        <p className="text-white text-sm font-medium flex-1" style={{ fontFamily: 'Jost, sans-serif' }}>{group.name || t('storyViewer.defaultMember')}</p>
        <p className="text-white/60 text-xs">{timeAgo(story.created_at, t)}</p>
        {isMine && (
          <button onClick={handleDelete} disabled={deleting} className="h-9 w-9 flex items-center justify-center text-white flex-shrink-0 disabled:opacity-50">
            <Trash2 className="h-4.5 w-4.5" />
          </button>
        )}
        <button onClick={onClose} className="h-9 w-9 flex items-center justify-center text-white flex-shrink-0">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        <button className="absolute left-0 top-0 h-full w-1/2 z-10" onClick={goPrevStory} aria-label={t('storyViewer.previous')} />
        <button className="absolute right-0 top-0 h-full w-1/2 z-10" onClick={goNextStory} aria-label={t('storyViewer.next')} />

        {story.image_url ? (
          <img src={story.image_url} alt="" className="max-h-full max-w-full object-contain" />
        ) : (
          <div className="h-full w-full flex items-center justify-center p-8" style={{ background: story.background_color || 'linear-gradient(135deg, hsl(196 60% 32%), hsl(200 65% 18%))' }}>
            <p className="text-white text-center font-display text-2xl font-semibold break-words" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.3)' }}>
              {story.text}
            </p>
          </div>
        )}

        {story.image_url && story.text && (
          <p className="absolute bottom-6 left-4 right-4 text-white text-sm text-center" style={{ fontFamily: 'Jost, sans-serif', textShadow: '0 1px 8px rgba(0,0,0,0.5)' }}>
            {story.text}
          </p>
        )}
      </div>

      {isMine && (
        <div className="px-4 pb-6 pt-2 safe-area-bottom">
          {viewers === null ? (
            <button onClick={loadViewers} className="flex items-center gap-1.5 text-white/80 text-xs mx-auto">
              <Eye className="h-3.5 w-3.5" /> {t('storyViewer.seeViewers')}
            </button>
          ) : (
            <div className="max-h-32 overflow-y-auto space-y-1">
              {viewers.length === 0 ? (
                <p className="text-white/60 text-xs text-center">{t('storyViewer.noViewers')}</p>
              ) : (
                viewers.map((v, i) => (
                  <p key={i} className="text-white text-xs text-center" style={{ fontFamily: 'Jost, sans-serif' }}>{v.name || t('storyViewer.defaultMember')}</p>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {!isMine && (
        <form onSubmit={handleSendReply} className="px-4 pb-6 pt-2 safe-area-bottom flex items-center gap-2">
          <input
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            onFocus={() => setPaused(true)}
            onBlur={() => { if (!replyText.trim()) setPaused(false); }}
            maxLength={1000}
            placeholder={t('storyViewer.replyPlaceholder', { name: group.name || t('storyViewer.defaultMember') })}
            className="flex-1 px-4 py-2.5 rounded-full border border-white/30 bg-white/10 text-white placeholder-white/60 text-sm outline-none focus:ring-2 focus:ring-white/40"
            style={{ fontFamily: 'Jost, sans-serif' }}
          />
          {replyText.trim() && (
            <button type="submit" disabled={sendingReply}
              className="h-10 w-10 rounded-full bg-white text-black flex items-center justify-center flex-shrink-0 disabled:opacity-50">
              <Send className="h-4 w-4" />
            </button>
          )}
        </form>
      )}
    </div>
  );
}
