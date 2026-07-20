import { useRef, useState } from 'react';
import { X, ImagePlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { uploadPhoto, MAX_PHOTO_SIZE_MB } from '@/lib/attachments';
import { toast } from 'sonner';

interface CreateFeedPostModalProps {
  onClose: () => void;
  onPosted: () => void;
}

export default function CreateFeedPostModal({ onClose, onPosted }: CreateFeedPostModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [posting, setPosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!f.type.startsWith('image/')) { toast.error(t('feed.photoTypeError')); return; }
    if (f.size > MAX_PHOTO_SIZE_MB * 1024 * 1024) { toast.error(t('feed.photoSizeError', { max: MAX_PHOTO_SIZE_MB })); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handlePublish = async () => {
    if (!user || !file || posting) return;
    setPosting(true);
    const photoUrl = await uploadPhoto('feed-photos', user.id, file);
    if (!photoUrl) {
      setPosting(false);
      toast.error(t('feed.photoSendError'));
      return;
    }
    const { error } = await supabase.from('feed_posts').insert({
      author_id: user.id,
      photo_url: photoUrl,
      caption: caption.trim() || null,
    });
    setPosting(false);
    if (error) { toast.error(t('feed.publishError')); return; }
    toast.success(t('feed.publishSuccess'));
    onPosted();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-end justify-center" onClick={onClose}>
      <div className="bg-background rounded-t-3xl w-full max-w-lg max-h-[85vh] overflow-y-auto safe-area-bottom" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="font-display text-lg font-semibold">{t('feed.createTitle')}</h2>
          <button onClick={onClose} className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-foreground hover:text-destructive transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 pb-6 space-y-4">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleSelect} />

          {preview ? (
            <div className="relative rounded-2xl overflow-hidden bg-ocean-light">
              <img src={preview} alt="" className="w-full max-h-80 object-cover" />
              <button onClick={() => { setFile(null); setPreview(null); }}
                className="absolute top-3 right-3 h-8 w-8 rounded-full glass flex items-center justify-center text-foreground hover:bg-white/90 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-2xl border-2 border-dashed border-border py-10 flex flex-col items-center gap-2 text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors">
              <ImagePlus className="h-8 w-8" />
              <span className="text-sm" style={{ fontFamily: 'Jost, sans-serif' }}>{t('feed.choosePhoto')}</span>
            </button>
          )}

          <textarea
            value={caption}
            onChange={e => setCaption(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder={t('feed.captionPlaceholder')}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            style={{ fontFamily: 'Jost, sans-serif' }}
          />

          <button onClick={handlePublish} disabled={!file || posting} className="btn-ocean w-full py-3.5 text-sm disabled:opacity-50">
            {posting ? t('feed.publishing') : t('feed.publish')}
          </button>
        </div>
      </div>
    </div>
  );
}
