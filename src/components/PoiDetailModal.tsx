import { useEffect, useState } from 'react';
import { X, MapPin, Star, Globe, ImageIcon, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { avatarFallbackInitial } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface Poi {
  id: string;
  name: string;
  category: string;
  description: string;
  address: string;
  image_url: string | null;
  website_url: string | null;
}

interface Review {
  id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  name: string | null;
  photo_url: string | null;
}

interface PoiDetailModalProps {
  poi: Poi;
  onClose: () => void;
}

const CATEGORY_EMOJI: Record<string, string> = {
  surf: '🏄',
  apero: '🍹',
  sport: '🎾',
  plage: '🏖️',
  velo: '🚴',
};

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

export default function PoiDetailModal({ poi, onClose }: PoiDetailModalProps) {
  const { t } = useTranslation();
  const { user, isAdmin } = useAuth();
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadReviews(); }, [poi.id]);

  const loadReviews = async () => {
    const { data } = await supabase.from('poi_reviews').select('id, user_id, rating, comment, created_at').eq('poi_id', poi.id).order('created_at', { ascending: false });
    if (!data) { setReviews([]); return; }
    const userIds = Array.from(new Set(data.map(r => r.user_id)));
    const { data: profiles } = userIds.length > 0
      ? await supabase.from('profiles').select('user_id, name, photo_url').in('user_id', userIds)
      : { data: [] };
    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
    setReviews(data.map(r => ({ ...r, name: profileMap.get(r.user_id)?.name || null, photo_url: profileMap.get(r.user_id)?.photo_url || null })));

    if (user) {
      const mine = data.find(r => r.user_id === user.id);
      if (mine) { setMyRating(mine.rating); setMyComment(mine.comment || ''); }
    }
  };

  const handleSubmitReview = async () => {
    if (!user || myRating === 0) return;
    setSubmitting(true);
    const { error } = await supabase.from('poi_reviews').upsert(
      { poi_id: poi.id, user_id: user.id, rating: myRating, comment: myComment.trim() || null },
      { onConflict: 'poi_id,user_id' }
    );
    setSubmitting(false);
    if (error) { toast.error(t('poiDetail.reviewError')); return; }
    toast.success(t('poiDetail.reviewSent'));
    loadReviews();
  };

  const handleDeleteReview = async (reviewId: string) => {
    setDeletingId(reviewId);
    const { error } = await supabase.from('poi_reviews').delete().eq('id', reviewId);
    setDeletingId(null);
    if (error) { toast.error(t('poiDetail.deleteError')); return; }
    toast.success(t('poiDetail.deleteSuccess'));
    loadReviews();
  };

  const avgRating = reviews && reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-background rounded-t-3xl w-full max-w-lg max-h-[80vh] overflow-y-auto safe-area-bottom" onClick={e => e.stopPropagation()}>
        {poi.image_url ? (
          <div className="relative h-36 sm:h-44 rounded-t-3xl overflow-hidden">
            <img src={poi.image_url} alt={poi.name} className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            <button onClick={onClose}
              className="absolute top-3 right-3 h-8 w-8 rounded-full glass flex items-center justify-center text-foreground hover:bg-white/90 transition-colors">
              <X className="h-4 w-4" />
            </button>
            <h2 className="absolute bottom-3 left-4 right-4 font-display text-xl font-semibold text-white" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.4)' }}>
              {poi.name}
            </h2>
          </div>
        ) : (
          <div className="flex items-center justify-between px-5 pt-5">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">{CATEGORY_EMOJI[poi.category] || '📍'}</span>
              <h2 className="font-display text-xl font-semibold">{poi.name}</h2>
            </div>
            <button onClick={onClose} className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-foreground hover:text-destructive transition-colors flex-shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="px-5 pb-6 pt-4 space-y-4">
          {reviews && reviews.length > 0 && (
            <div className="flex items-center gap-2">
              <StarRow rating={avgRating} size="h-4 w-4" />
              <span className="text-sm font-medium">{avgRating.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">{t('poiDetail.reviewCount', { count: reviews.length })}</span>
            </div>
          )}

          <p className="text-sm text-foreground" style={{ fontFamily: 'Jost, sans-serif', lineHeight: 1.6 }}>
            {poi.description}
          </p>

          <div className="flex items-start gap-2 text-sm text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif' }}>
            <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{poi.address}</span>
          </div>

          <div className="flex flex-wrap gap-2">
            {poi.website_url && (
              <a href={poi.website_url} target="_blank" rel="noopener noreferrer"
                className="pill bg-ocean-light text-primary flex items-center gap-1.5" style={{ fontFamily: 'Jost, sans-serif' }}>
                <Globe className="h-3.5 w-3.5" /> {t('poiDetail.officialWebsite')}
              </a>
            )}
            <a href={`https://www.google.com/search?q=${encodeURIComponent(poi.name + ' ' + poi.address)}&udm=2`} target="_blank" rel="noopener noreferrer"
              className="pill bg-secondary text-foreground flex items-center gap-1.5" style={{ fontFamily: 'Jost, sans-serif' }}>
              <ImageIcon className="h-3.5 w-3.5" /> {t('poiDetail.viewPhotosGoogle')}
            </a>
          </div>

          <div className="card-premium p-4 space-y-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider" style={{ fontFamily: 'Jost, sans-serif' }}>
              {t('poiDetail.leaveReview')}
            </h3>
            <StarPicker value={myRating} onChange={setMyRating} />
            <textarea
              value={myComment}
              onChange={e => setMyComment(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder={t('poiDetail.commentPlaceholder')}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              style={{ fontFamily: 'Jost, sans-serif' }}
            />
            <button onClick={handleSubmitReview} disabled={myRating === 0 || submitting}
              className="btn-ocean w-full py-2.5 text-sm disabled:opacity-50">
              {submitting ? t('poiDetail.sending') : t('poiDetail.submitReview')}
            </button>
          </div>

          <div className="space-y-3">
            {reviews === null ? (
              <p className="text-sm text-muted-foreground text-center py-4" style={{ fontFamily: 'Jost, sans-serif' }}>{t('groupChat.loading')}</p>
            ) : reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4" style={{ fontFamily: 'Jost, sans-serif' }}>{t('poiDetail.noReviews')}</p>
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
                    <button onClick={() => handleDeleteReview(r.id)} disabled={deletingId === r.id}
                      title={t('poiDetail.deleteModeration')}
                      className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0 disabled:opacity-50">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
