import { useEffect, useRef, useState } from 'react';
import { X, Eye } from 'lucide-react';
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

function timeAgo(iso: string): string {
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `${diffMin} min`;
  return `${Math.floor(diffMin / 60)} h`;
}

export default function StoryViewer({ groups, startGroupIndex, onClose }: {
  groups: StoryAuthorGroup[];
  startGroupIndex: number;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [groupIndex, setGroupIndex] = useState(startGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [viewers, setViewers] = useState<{ name: string | null }[] | null>(null);
  const rafRef = useRef<number>();
  const startRef = useRef<number>(0);

  const group = groups[groupIndex];
  const story = group?.stories[storyIndex];
  const isMine = story?.user_id === user?.id;

  const goNextStory = () => {
    if (!group) return;
    if (storyIndex < group.stories.length - 1) {
      setStoryIndex(i => i + 1);
    } else if (groupIndex < groups.length - 1) {
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
      const prevGroup = groups[groupIndex - 1];
      setGroupIndex(i => i - 1);
      setStoryIndex(prevGroup.stories.length - 1);
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

  // Barre de progression + avance automatique.
  useEffect(() => {
    setProgress(0);
    startRef.current = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startRef.current;
      const pct = Math.min(elapsed / STORY_DURATION_MS, 1);
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
  }, [groupIndex, storyIndex]);

  const loadViewers = async () => {
    if (!story) return;
    const { data } = await supabase.from('story_views').select('viewer_id').eq('story_id', story.id);
    if (!data?.length) { setViewers([]); return; }
    const ids = data.map(v => v.viewer_id);
    const { data: profiles } = await supabase.from('profiles').select('user_id, name').in('user_id', ids);
    setViewers((profiles || []).map(p => ({ name: p.name })));
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
        <p className="text-white text-sm font-medium flex-1" style={{ fontFamily: 'Jost, sans-serif' }}>{group.name || 'Membre'}</p>
        <p className="text-white/60 text-xs">{timeAgo(story.created_at)}</p>
        <button onClick={onClose} className="h-9 w-9 flex items-center justify-center text-white flex-shrink-0">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        <button className="absolute left-0 top-0 h-full w-1/2 z-10" onClick={goPrevStory} aria-label="Précédent" />
        <button className="absolute right-0 top-0 h-full w-1/2 z-10" onClick={goNextStory} aria-label="Suivant" />

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
              <Eye className="h-3.5 w-3.5" /> Voir qui a vu ma story
            </button>
          ) : (
            <div className="max-h-32 overflow-y-auto space-y-1">
              {viewers.length === 0 ? (
                <p className="text-white/60 text-xs text-center">Personne n'a encore vu cette story.</p>
              ) : (
                viewers.map((v, i) => (
                  <p key={i} className="text-white text-xs text-center" style={{ fontFamily: 'Jost, sans-serif' }}>{v.name || 'Membre'}</p>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
