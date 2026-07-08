import { useState, useRef } from 'react';
import { X, Image as ImageIcon, Type, Check } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { MAX_PHOTO_SIZE_MB, uploadPhoto } from '@/lib/attachments';

const BACKGROUNDS = [
  'linear-gradient(135deg, hsl(196 60% 32%), hsl(200 65% 18%))',
  'linear-gradient(135deg, #2f6f4f, #1c4a34)',
  'linear-gradient(135deg, #d99a3e, #a85d2c)',
  'linear-gradient(135deg, #c4487a, #7a2e6b)',
  'linear-gradient(135deg, #3a4a6b, #1a2238)',
];

interface CreateStoryModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateStoryModal({ onClose, onCreated }: CreateStoryModalProps) {
  const { user } = useAuth();
  const [mode, setMode] = useState<'photo' | 'text'>('photo');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [text, setText] = useState('');
  const [background, setBackground] = useState(BACKGROUNDS[0]);
  const [posting, setPosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Merci de choisir une image.'); return; }
    if (file.size > MAX_PHOTO_SIZE_MB * 1024 * 1024) { toast.error(`Image trop lourde (max ${MAX_PHOTO_SIZE_MB} Mo).`); return; }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const canPost = mode === 'photo' ? !!photoFile : text.trim().length > 0;

  const handlePost = async () => {
    if (!user || !canPost || posting) return;
    setPosting(true);
    try {
      if (mode === 'photo' && photoFile) {
        const url = await uploadPhoto('chat-images', user.id, photoFile);
        if (!url) throw new Error('upload');
        const { error } = await supabase.from('stories').insert({
          user_id: user.id,
          image_url: url,
          text: caption.trim() || null,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('stories').insert({
          user_id: user.id,
          text: text.trim(),
          background_color: background,
        });
        if (error) throw error;
      }
      toast.success('Story publiée ! Elle disparaîtra dans 24h.');
      onCreated();
    } catch {
      toast.error("Impossible de publier la story.");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0" onClick={onClose}>
      <div className="bg-card rounded-3xl p-5 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Nouvelle story</h2>
          <button onClick={onClose} className="h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-2 p-1 bg-secondary rounded-2xl">
          <button onClick={() => setMode('photo')}
            className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${mode === 'photo' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground'}`}
            style={{ fontFamily: 'Jost, sans-serif' }}>
            <ImageIcon className="h-4 w-4" /> Photo
          </button>
          <button onClick={() => setMode('text')}
            className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${mode === 'text' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground'}`}
            style={{ fontFamily: 'Jost, sans-serif' }}>
            <Type className="h-4 w-4" /> Texte
          </button>
        </div>

        {mode === 'photo' ? (
          <div className="space-y-3">
            <label className="block cursor-pointer">
              <div className="relative aspect-[9/16] max-h-72 mx-auto rounded-2xl overflow-hidden bg-muted border-2 border-dashed border-border flex items-center justify-center">
                {photoPreview ? (
                  <img src={photoPreview} alt="Aperçu" className="h-full w-full object-cover" />
                ) : (
                  <div className="text-center px-4">
                    <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" strokeWidth={1.5} />
                    <p className="text-sm text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif' }}>Choisir une photo</p>
                  </div>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
            </label>
            <input
              value={caption}
              onChange={e => setCaption(e.target.value)}
              maxLength={200}
              placeholder="Une légende (optionnel)..."
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
              style={{ fontFamily: 'Jost, sans-serif' }}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative aspect-[9/16] max-h-72 mx-auto rounded-2xl overflow-hidden flex items-center justify-center p-6" style={{ background }}>
              <p className="text-white text-center font-display text-xl font-semibold break-words" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.3)' }}>
                {text || 'Votre texte ici...'}
              </p>
            </div>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              maxLength={200}
              rows={2}
              placeholder="Quoi de neuf ?"
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              style={{ fontFamily: 'Jost, sans-serif' }}
            />
            <div className="flex gap-2">
              {BACKGROUNDS.map(bg => (
                <button key={bg} onClick={() => setBackground(bg)}
                  className={`h-8 w-8 rounded-full flex-shrink-0 transition-all ${background === bg ? 'ring-2 ring-primary ring-offset-2 ring-offset-card' : ''}`}
                  style={{ background: bg }} />
              ))}
            </div>
          </div>
        )}

        <button onClick={handlePost} disabled={!canPost || posting}
          className="btn-ocean w-full py-3.5 flex items-center justify-center gap-2 disabled:opacity-50">
          <Check className="h-4 w-4" /> {posting ? 'Publication...' : 'Publier ma story'}
        </button>
      </div>
    </div>
  );
}
