import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { avatarFallbackInitial } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface Review {
  id: string;
  reviewer_id: string;
  rating: number;
  comment: string | null;
  name: string | null;
  photo_url: string | null;
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onClick={() => onChange(n)} className="p-0.5">
          <Star className={cn('h-6 w-6', n <= value ? 'fill-gold text-gold' : 'text-muted-foreground')} />
        </button>
      ))}
    </div>
  );
}

function StarRow({ rating, size = 'h-3.5 w-3.5' }: { rating: number; size?: string }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} className={cn(size, n <= Math.round(rating) ? 'fill-gold text-gold' : 'text-border')} />
      ))}
    </div>
  );
}

// Avis/confiance entre membres — utile surtout pour l'entraide (services
// rendus, covoiturage, garde...), pas seulement les rencontres. Suppression
// réservée aux admins (voir migration 057), donc pas de bouton supprimer
// pour l'auteur d'un avis sur lui-même — seulement modifier via upsert.
export default function UserReviewsSection({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const { user, isAdmin } = useAuth();
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isSelf = user?.id === userId;

  const loadReviews = useCallback(async () => {
    const { data } = await supabase.from('user_reviews').select('id, reviewer_id, rating, comment').eq('reviewed_user_id', userId).order('created_at', { ascending: false });
    if (!data) { setReviews([]); return; }
    const reviewerIds = Array.from(new Set(data.map(r => r.reviewer_id)));
    const { data: profiles } = reviewerIds.length > 0
      ? await supabase.from('profiles').select('user_id, name, photo_url').in('user_id', reviewerIds)
      : { data: [] };
    const map = new Map((profiles || []).map(p => [p.user_id, p]));
    setReviews(data.map(r => ({ ...r, name: map.get(r.reviewer_id)?.name || null, photo_url: map.get(r.reviewer_id)?.photo_url || null })));

    if (user) {
      const mine = data.find(r => r.reviewer_id === user.id);
      if (mine) { setMyRating(mine.rating); setMyComment(mine.comment || ''); }
    }
  }, [userId, user]);

  useEffect(() => { loadReviews(); }, [loadReviews]);

  const handleSubmit = async () => {
    if (!user || myRating === 0) return;
    setSubmitting(true);
    const { error } = await supabase.from('user_reviews').upsert(
      { reviewed_user_id: userId, reviewer_id: user.id, rating: myRating, comment: myComment.trim() || null },
      { onConflict: 'reviewed_user_id,reviewer_id' }
    );
    setSubmitting(false);
    if (error) { toast.error(t('userReviews.sendError')); return; }
    toast.success(t('userReviews.sent'));
    loadReviews();
  };

  const handleDelete = async (reviewId: string) => {
    setDeletingId(reviewId);
    const { error } = await supabase.from('user_reviews').delete().eq('id', reviewId);
    setDeletingId(null);
    if (error) { toast.error(t('userReviews.deleteError')); return; }
    loadReviews();
  };

  const avgRating = reviews && reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <div>
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2" style={{ fontFamily: 'Jost, sans-serif' }}>
        {t('userReviews.title')}
      </h3>

      {reviews && reviews.length > 0 && (
        <div className="flex items-center gap-2 mb-3">
          <StarRow rating={avgRating} size="h-4 w-4" />
          <span className="text-sm font-medium">{avgRating.toFixed(1)}</span>
          <span className="text-xs text-muted-foreground">{t('userReviews.count', { count: reviews.length })}</span>
        </div>
      )}

      {!isSelf && (
        <div className="card-premium p-4 space-y-3 mb-3">
          <StarPicker value={myRating} onChange={setMyRating} />
          <textarea
            value={myComment}
            onChange={e => setMyComment(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder={t('userReviews.commentPlaceholder')}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            style={{ fontFamily: 'Jost, sans-serif' }}
          />
          <button onClick={handleSubmit} disabled={myRating === 0 || submitting}
            className="btn-ocean w-full py-2.5 text-sm disabled:opacity-50">
            {submitting ? t('userReviews.sending') : t('userReviews.submit')}
          </button>
        </div>
      )}

      <div className="space-y-3">
        {reviews === null ? (
          <p className="text-sm text-muted-foreground text-center py-4" style={{ fontFamily: 'Jost, sans-serif' }}>{t('groupChat.loading')}</p>
        ) : reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4" style={{ fontFamily: 'Jost, sans-serif' }}>{t('userReviews.noReviews')}</p>
        ) : (
          reviews.map(r => (
            <div key={r.id} className="flex gap-3 py-2 border-b border-border/50 last:border-0">
              <div className="h-9 w-9 rounded-full bg-ocean-light flex items-center justify-center flex-shrink-0 overflow-hidden">
                {r.photo_url ? (
                  <img src={r.photo_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs font-semibold text-primary">{avatarFallbackInitial(r.name)}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium" style={{ fontFamily: 'Jost, sans-serif' }}>{r.name || t('groupChat.defaultUser')}</span>
                  <StarRow rating={r.rating} />
                </div>
                {r.comment && (
                  <p className="text-sm text-muted-foreground mt-0.5" style={{ fontFamily: 'Jost, sans-serif' }}>{r.comment}</p>
                )}
              </div>
              {isAdmin && (
                <button onClick={() => handleDelete(r.id)} disabled={deletingId === r.id}
                  title={t('userReviews.deleteModeration')}
                  className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0 disabled:opacity-50">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
