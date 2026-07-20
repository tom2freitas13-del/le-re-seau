import { useEffect, useState } from 'react';
import { Heart, MessageCircle, Share2, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { avatarFallbackInitial } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ReportButton } from '@/components/ReportModal';
import ProfileDetailModal from '@/components/ProfileDetailModal';
import MessagePeopleModal from '@/components/MessagePeopleModal';
import CreateFeedPostModal from '@/components/CreateFeedPostModal';
import FeedCommentsSheet from '@/components/FeedCommentsSheet';
import type { ProfileCardProfile } from '@/components/ProfileCard';

interface FeedPost {
  id: string;
  author_id: string;
  photo_url: string;
  caption: string | null;
  created_at: string;
}

interface Person { user_id: string; name: string | null; photo_url: string | null; }

export default function HomeFeed() {
  const { t } = useTranslation();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileCardProfile>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [myLikes, setMyLikes] = useState<Set<string>>(new Set());
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [openProfile, setOpenProfile] = useState<ProfileCardProfile | null>(null);
  const [likersModal, setLikersModal] = useState<{ postId: string; people: Person[] | null } | null>(null);
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => { loadPosts(); }, []);

  const loadPosts = async () => {
    const { data } = await supabase.from('feed_posts').select('*').order('created_at', { ascending: false }).limit(30);
    if (!data) return;
    setPosts(data);

    const authorIds = Array.from(new Set(data.map(p => p.author_id)));
    if (authorIds.length) {
      const { data: profileRows } = await supabase.from('profiles').select('*').in('user_id', authorIds);
      const map: Record<string, ProfileCardProfile> = {};
      (profileRows || []).forEach(p => { map[p.user_id] = p as unknown as ProfileCardProfile; });
      setProfiles(map);
    }

    const postIds = data.map(p => p.id);
    if (postIds.length) {
      const { data: likes } = await supabase.from('feed_likes').select('post_id, user_id').in('post_id', postIds);
      const counts: Record<string, number> = {};
      const mine = new Set<string>();
      (likes || []).forEach(l => {
        counts[l.post_id] = (counts[l.post_id] || 0) + 1;
        if (l.user_id === user?.id) mine.add(l.post_id);
      });
      setLikeCounts(counts);
      setMyLikes(mine);

      const { data: comments } = await supabase.from('feed_comments').select('post_id').in('post_id', postIds);
      const cCounts: Record<string, number> = {};
      (comments || []).forEach(c => { cCounts[c.post_id] = (cCounts[c.post_id] || 0) + 1; });
      setCommentCounts(cCounts);
    }
  };

  const toggleLike = async (postId: string) => {
    if (!user) return;
    const liked = myLikes.has(postId);
    if (liked) {
      setMyLikes(prev => { const s = new Set(prev); s.delete(postId); return s; });
      setLikeCounts(prev => ({ ...prev, [postId]: Math.max((prev[postId] || 1) - 1, 0) }));
      await supabase.from('feed_likes').delete().eq('post_id', postId).eq('user_id', user.id);
    } else {
      setMyLikes(prev => new Set(prev).add(postId));
      setLikeCounts(prev => ({ ...prev, [postId]: (prev[postId] || 0) + 1 }));
      await supabase.from('feed_likes').insert({ post_id: postId, user_id: user.id });
    }
  };

  const showLikers = async (postId: string) => {
    setLikersModal({ postId, people: null });
    const { data: likes } = await supabase.from('feed_likes').select('user_id').eq('post_id', postId);
    const ids = (likes || []).map(l => l.user_id);
    if (!ids.length) { setLikersModal({ postId, people: [] }); return; }
    const { data: profileRows } = await supabase.from('profiles').select('user_id, name, photo_url').in('user_id', ids);
    setLikersModal({ postId, people: profileRows || [] });
  };

  const handleShare = async (post: FeedPost) => {
    const shareData = { title: 'Le Ré-seau', text: post.caption || t('feed.sharedDefaultText'), url: post.photo_url };
    if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
      try { await navigator.share(shareData); } catch { /* annulé par l'utilisateur */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(post.photo_url);
      toast.success(t('feed.linkCopied'));
    } catch {
      toast.error(t('feed.copyError'));
    }
  };

  const handleDelete = async (postId: string) => {
    setDeletingId(postId);
    const { error } = await supabase.from('feed_posts').delete().eq('id', postId);
    setDeletingId(null);
    if (error) { toast.error(t('feed.deleteError')); return; }
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  if (!user) return null;

  return (
    <div className="px-4 pt-14 pb-14 max-w-lg mx-auto">
      {openProfile && <ProfileDetailModal profile={openProfile} onClose={() => setOpenProfile(null)} />}
      {createOpen && <CreateFeedPostModal onClose={() => setCreateOpen(false)} onPosted={loadPosts} />}
      {likersModal && (
        <MessagePeopleModal title={t('feed.likedByTitle')} people={likersModal.people} onClose={() => setLikersModal(null)} />
      )}
      {commentsPostId && (
        <FeedCommentsSheet
          postId={commentsPostId}
          onClose={() => setCommentsPostId(null)}
          onCommentAdded={() => setCommentCounts(prev => ({ ...prev, [commentsPostId]: (prev[commentsPostId] || 0) + 1 }))}
        />
      )}

      <div className="flex items-center justify-between mb-6 gap-3">
        <h2 className="section-title">{t('feed.title')}</h2>
        <button onClick={() => setCreateOpen(true)}
          className="btn-ocean flex items-center gap-1.5 py-2.5 flex-shrink-0"
          style={{ boxShadow: '0 4px 14px rgba(28,94,120,0.25)' }}>
          <Plus className="h-4 w-4" /> {t('feed.publish')}
        </button>
      </div>

      {posts.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8" style={{ fontFamily: 'Jost, sans-serif' }}>
          {t('feed.noPosts')}
        </p>
      ) : (
        <div className="space-y-5">
          {posts.map(post => {
            const author = profiles[post.author_id];
            return (
              <div key={post.id} className="card-premium overflow-hidden">
                <div className="flex items-center justify-between gap-2 p-4 pb-3">
                  <button onClick={() => author && setOpenProfile(author)} className="flex items-center gap-2.5 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-ocean-light flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {author?.photo_url ? (
                        <img src={author.photo_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xs font-semibold text-primary">{avatarFallbackInitial(author?.name)}</span>
                      )}
                    </div>
                    <span className="text-sm font-medium truncate" style={{ fontFamily: 'Jost, sans-serif' }}>
                      {author?.name || t('feed.defaultMember')}
                    </span>
                  </button>
                  {post.author_id === user.id || isAdmin ? (
                    <button onClick={() => handleDelete(post.id)} disabled={deletingId === post.id}
                      className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0 disabled:opacity-50">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : (
                    <ReportButton targetType="feed_post" targetId={post.id} targetUserId={post.author_id}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-lg hover:bg-destructive/10" />
                  )}
                </div>

                <div className="bg-ocean-light">
                  <img src={post.photo_url} alt="" className="w-full max-h-[420px] object-cover" />
                </div>

                <div className="p-4 space-y-2">
                  {post.caption && (
                    <p className="text-sm" style={{ fontFamily: 'Jost, sans-serif', lineHeight: 1.6 }}>{post.caption}</p>
                  )}

                  <div className="flex items-center gap-4 pt-1">
                    <button onClick={() => toggleLike(post.id)} className={cn('flex items-center gap-1.5 text-xs', myLikes.has(post.id) ? 'text-red-500' : 'text-muted-foreground')}>
                      <Heart className={cn('h-5 w-5', myLikes.has(post.id) && 'fill-red-500')} />
                    </button>
                    {(likeCounts[post.id] || 0) > 0 && (
                      <button onClick={() => showLikers(post.id)} className="text-xs text-muted-foreground hover:underline -ml-2.5" style={{ fontFamily: 'Jost, sans-serif' }}>
                        {t('feed.likeCount', { count: likeCounts[post.id] })}
                      </button>
                    )}
                    <button onClick={() => setCommentsPostId(post.id)} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MessageCircle className="h-5 w-5" />
                      {commentCounts[post.id] || 0}
                    </button>
                    <button onClick={() => handleShare(post)} className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto">
                      <Share2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
