import { useEffect, useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { avatarFallbackInitial } from '@/lib/constants';
import { toast } from 'sonner';

interface Comment {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
  name: string | null;
  photo_url: string | null;
}

interface FeedCommentsSheetProps {
  postId: string;
  onClose: () => void;
  onCommentAdded: () => void;
}

export default function FeedCommentsSheet({ postId, onClose, onCommentAdded }: FeedCommentsSheetProps) {
  const { t } = useTranslation();
  const { user, isAdmin } = useAuth();
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => { load(); }, [postId]);

  const load = async () => {
    const { data } = await supabase
      .from('feed_comments')
      .select('id, author_id, content, created_at')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    if (!data) { setComments([]); return; }
    const authorIds = Array.from(new Set(data.map(c => c.author_id)));
    const { data: profiles } = authorIds.length > 0
      ? await supabase.from('profiles').select('user_id, name, photo_url').in('user_id', authorIds)
      : { data: [] };
    const map = new Map((profiles || []).map(p => [p.user_id, p]));
    setComments(data.map(c => ({ ...c, name: map.get(c.author_id)?.name || null, photo_url: map.get(c.author_id)?.photo_url || null })));
  };

  const submit = async () => {
    if (!user || !text.trim() || sending) return;
    setSending(true);
    const { error } = await supabase.from('feed_comments').insert({ post_id: postId, author_id: user.id, content: text.trim() });
    setSending(false);
    if (error) { toast.error(t('feed.commentError')); return; }
    setText('');
    onCommentAdded();
    load();
  };

  const handleDelete = async (commentId: string) => {
    const { error } = await supabase.from('feed_comments').delete().eq('id', commentId);
    if (error) { toast.error(t('feed.commentDeleteError')); return; }
    load();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-background rounded-t-3xl w-full max-w-lg max-h-[75vh] flex flex-col safe-area-bottom" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border/50 flex-shrink-0">
          <h2 className="font-display text-lg font-semibold">{t('feed.commentsTitle')}</h2>
          <button onClick={onClose} className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-foreground hover:text-destructive transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
          {comments === null ? (
            <p className="text-sm text-muted-foreground text-center py-6" style={{ fontFamily: 'Jost, sans-serif' }}>{t('groupChat.loading')}</p>
          ) : comments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6" style={{ fontFamily: 'Jost, sans-serif' }}>{t('feed.noComments')}</p>
          ) : (
            comments.map(c => (
              <div key={c.id} className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-ocean-light flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {c.photo_url ? (
                    <img src={c.photo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs font-semibold text-primary">{avatarFallbackInitial(c.name)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium" style={{ fontFamily: 'Jost, sans-serif' }}>{c.name || t('groupChat.defaultUser')}</span>
                  <p className="text-sm text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif' }}>{c.content}</p>
                </div>
                {(c.author_id === user?.id || isAdmin) && (
                  <button onClick={() => handleDelete(c.id)} className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center gap-2 px-5 py-3 border-t border-border/50 flex-shrink-0">
          <input value={text} onChange={e => setText(e.target.value)} maxLength={500}
            placeholder={t('feed.addComment')}
            onKeyDown={e => { if (e.key === 'Enter') submit(); }}
            className="flex-1 px-4 py-2.5 rounded-full border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
            style={{ fontFamily: 'Jost, sans-serif' }} />
          <button onClick={submit} disabled={!text.trim() || sending} className="text-sm text-primary font-semibold disabled:opacity-50 flex-shrink-0">
            {t('feed.send')}
          </button>
        </div>
      </div>
    </div>
  );
}
