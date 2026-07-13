import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useBlockedUsers } from '@/lib/useBlockedUsers';
import { avatarFallbackInitial } from '@/lib/constants';
import CreateStoryModal from '@/components/CreateStoryModal';
import StoryViewer, { StoryAuthorGroup, StoryItem } from '@/components/StoryViewer';

export default function StoriesBar() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isBlocked } = useBlockedUsers();
  const [groups, setGroups] = useState<StoryAuthorGroup[]>([]);
  const [seenStoryIds, setSeenStoryIds] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [viewingIndex, setViewingIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    load();
    const channel = supabase
      .channel('stories-bar')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stories' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const load = async () => {
    if (!user) return;
    const { data: stories } = await supabase.from('stories').select('*').order('created_at', { ascending: true });
    if (!stories) return;

    const { data: seen } = await supabase.from('story_views').select('story_id').eq('viewer_id', user.id);
    const seenSet = new Set((seen || []).map(s => s.story_id));
    setSeenStoryIds(seenSet);

    const visible = stories.filter(s => !isBlocked(s.user_id));
    const userIds = Array.from(new Set(visible.map(s => s.user_id)));
    const { data: profiles } = await supabase.from('profiles').select('user_id, name, photo_url').in('user_id', userIds);
    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

    const byUser = new Map<string, StoryItem[]>();
    visible.forEach(s => {
      if (!byUser.has(s.user_id)) byUser.set(s.user_id, []);
      byUser.get(s.user_id)!.push(s);
    });

    const built: StoryAuthorGroup[] = Array.from(byUser.entries()).map(([uid, items]) => {
      const profile = profileMap.get(uid);
      return { user_id: uid, name: profile?.name || null, photo_url: profile?.photo_url || null, stories: items };
    });

    // Moi en premier, puis non-vues (plus récentes d'abord), puis déjà vues.
    const mine = built.filter(g => g.user_id === user.id);
    const others = built.filter(g => g.user_id !== user.id);
    const hasUnseen = (g: StoryAuthorGroup) => g.stories.some(s => !seenSet.has(s.id));
    others.sort((a, b) => {
      const ua = hasUnseen(a), ub = hasUnseen(b);
      if (ua !== ub) return ua ? -1 : 1;
      return new Date(b.stories[b.stories.length - 1].created_at).getTime() - new Date(a.stories[a.stories.length - 1].created_at).getTime();
    });

    setGroups([...mine, ...others]);
  };

  if (!user) return null;

  const myGroup = groups.find(g => g.user_id === user.id);
  const otherGroups = groups.filter(g => g.user_id !== user.id);

  return (
    <>
      <div className="flex gap-3 overflow-x-auto px-4 py-3 -mx-4" style={{ scrollbarWidth: 'none' }}>
        <div
          role="button"
          tabIndex={0}
          onClick={() => myGroup ? setViewingIndex(groups.indexOf(myGroup)) : setShowCreate(true)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { myGroup ? setViewingIndex(groups.indexOf(myGroup)) : setShowCreate(true); } }}
          className="flex flex-col items-center gap-1 flex-shrink-0 w-16 cursor-pointer">
          <div className="relative">
            <div className={`h-14 w-14 rounded-full p-0.5 ${myGroup ? 'bg-gradient-to-br from-primary to-pine' : 'border-2 border-dashed border-border'}`}>
              <div className="h-full w-full rounded-full overflow-hidden bg-ocean-light flex items-center justify-center border-2 border-card">
                {myGroup?.photo_url ? (
                  <img src={myGroup.photo_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="font-display text-lg text-primary/60">{avatarFallbackInitial(myGroup?.name)}</span>
                )}
              </div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); setShowCreate(true); }}
              className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-primary text-white flex items-center justify-center border-2 border-card">
              <Plus className="h-3 w-3" />
            </button>
          </div>
          <span className="text-[10px] text-muted-foreground truncate w-full text-center" style={{ fontFamily: 'Jost, sans-serif' }}>
            {t('storiesBar.myStory')}
          </span>
        </div>

        {otherGroups.map(g => {
          const unseen = g.stories.some(s => !seenStoryIds.has(s.id));
          return (
            <button key={g.user_id} onClick={() => setViewingIndex(groups.indexOf(g))}
              className="flex flex-col items-center gap-1 flex-shrink-0 w-16">
              <div className={`h-14 w-14 rounded-full p-0.5 ${unseen ? 'bg-gradient-to-br from-pink-500 via-red-500 to-amber-400' : 'bg-border'}`}>
                <div className="h-full w-full rounded-full overflow-hidden bg-ocean-light flex items-center justify-center border-2 border-card">
                  {g.photo_url ? (
                    <img src={g.photo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="font-display text-lg text-primary/60">{avatarFallbackInitial(g.name)}</span>
                  )}
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground truncate w-full text-center" style={{ fontFamily: 'Jost, sans-serif' }}>
                {g.name || t('storiesBar.defaultMember')}
              </span>
            </button>
          );
        })}
      </div>

      {showCreate && (
        <CreateStoryModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); load(); }} />
      )}

      {viewingIndex !== null && groups[viewingIndex] && (
        <StoryViewer
          groups={groups}
          startGroupIndex={viewingIndex}
          onClose={() => { setViewingIndex(null); load(); }}
        />
      )}
    </>
  );
}
