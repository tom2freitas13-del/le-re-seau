import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { ArrowLeft, Calendar, Camera } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { cn } from '@/lib/utils';
import { ACTIVITY_CATEGORIES, MAX_AGE } from '@/lib/constants';
import LocationPicker from '@/components/LocationPicker';

const MAX_PHOTO_SIZE_MB = 5;

export default function NewActivity() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('autre');
  const [location, setLocation] = useState('');
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [minAge, setMinAge] = useState('');
  const [minAgeError, setMinAgeError] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleBack = () => (window.history.length > 1 ? navigate(-1) : navigate('/activities'));

  // BUG FIX (#6) : âge minimum strictement positif, pas de négatif, pas de lettres.
  const handleMinAgeChange = (raw: string) => {
    const cleaned = raw.replace(/[^0-9]/g, '').slice(0, 3);
    setMinAge(cleaned);
    if (cleaned === '') { setMinAgeError(''); return; }
    const num = parseInt(cleaned, 10);
    if (num < 0) setMinAgeError("L'âge minimum ne peut pas être négatif.");
    else if (num > MAX_AGE) setMinAgeError(`Maximum ${MAX_AGE} ans.`);
    else setMinAgeError('');
  };

  const handleMaxParticipantsChange = (raw: string) => {
    const cleaned = raw.replace(/[^0-9]/g, '').slice(0, 4);
    setMaxParticipants(cleaned);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Merci de choisir une image.'); return; }
    if (file.size > MAX_PHOTO_SIZE_MB * 1024 * 1024) { toast.error(`Image trop lourde (max ${MAX_PHOTO_SIZE_MB} Mo).`); return; }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!title.trim()) { toast.error('Le titre est obligatoire.'); return; }
    if (minAgeError) { toast.error(minAgeError); return; }

    setLoading(true);
    try {
      let photo_url: string | null = null;
      if (photoFile) {
        const ext = photoFile.name.split('.').pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('activity-photos').upload(path, photoFile);
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage.from('activity-photos').getPublicUrl(path);
        photo_url = publicUrl;
      }

      const { error } = await supabase.from('activities').insert({
        title: title.trim(),
        description: description.trim() || null,
        category,
        location: location.trim() || null,
        latitude: coords.lat,
        longitude: coords.lng,
        activity_date: date || null,
        activity_time: time.trim() || null,
        min_age: minAge ? parseInt(minAge, 10) : null,
        max_participants: maxParticipants ? parseInt(maxParticipants, 10) : null,
        photo_url,
        author_id: user.id,
      });
      if (error) throw error;

      toast.success('Activité créée ! 🎉');
      navigate('/activities');
    } catch (error: any) {
      toast.error(error.message || 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3.5 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all";
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen pb-28 bg-background">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={handleBack} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-pine" strokeWidth={1.5} />
            <h1 className="font-display text-2xl font-semibold">Créer une activité</h1>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Photo */}
          <label className="block cursor-pointer">
            <div className="relative aspect-[16/9] rounded-2xl overflow-hidden bg-muted border-2 border-dashed border-border flex items-center justify-center group hover:border-primary/40 transition-colors">
              {photoPreview ? (
                <img src={photoPreview} alt="Aperçu" className="h-full w-full object-cover" />
              ) : (
                <div className="text-center">
                  <Camera className="h-8 w-8 text-muted-foreground mx-auto mb-2" strokeWidth={1.5} />
                  <p className="text-sm text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif' }}>
                    Ajouter une photo (optionnel)
                  </p>
                </div>
              )}
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
          </label>

          <div className="card-premium p-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block" style={{ fontFamily: 'Jost, sans-serif' }}>Titre *</label>
              <input className={inputClass} style={{ fontFamily: 'Jost, sans-serif' }} maxLength={100}
                placeholder="Ex: Sortie vélo au phare des Baleines" value={title} onChange={e => setTitle(e.target.value)} required />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block" style={{ fontFamily: 'Jost, sans-serif' }}>Description</label>
              <textarea className={`${inputClass} resize-none`} style={{ fontFamily: 'Jost, sans-serif' }} maxLength={1000} rows={4}
                placeholder="Décrivez votre activité..." value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block" style={{ fontFamily: 'Jost, sans-serif' }}>Catégorie</label>
              <div className="flex flex-wrap gap-2">
                {ACTIVITY_CATEGORIES.map(c => (
                  <button key={c.value} type="button" onClick={() => setCategory(c.value)}
                    className={cn(
                      'rounded-full px-3.5 py-2 text-sm font-medium transition-all border',
                      category === c.value ? 'border-primary bg-ocean-light text-primary' : 'border-border bg-background hover:bg-secondary'
                    )}
                    style={{ fontFamily: 'Jost, sans-serif' }}>
                    {c.emoji} {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="card-premium p-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block" style={{ fontFamily: 'Jost, sans-serif' }}>📍 Lieu</label>
              <LocationPicker
                value={location}
                onChange={(label, lat, lng) => { setLocation(label); setCoords({ lat, lng }); }}
                placeholder="Ex: Plage de la Conche, Ars-en-Ré..."
              />
              {coords.lat && coords.lng ? (
                <p className="text-xs text-pine mt-1.5 flex items-center gap-1" style={{ fontFamily: 'Jost, sans-serif' }}>
                  ✓ Lieu localisé — apparaîtra sur la carte
                </p>
              ) : location.trim() ? (
                <p className="text-xs text-muted-foreground mt-1.5" style={{ fontFamily: 'Jost, sans-serif' }}>
                  Choisissez une suggestion pour que l'activité apparaisse sur la carte
                </p>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block" style={{ fontFamily: 'Jost, sans-serif' }}>📅 Date</label>
                <input type="date" min={today} className={inputClass} style={{ fontFamily: 'Jost, sans-serif' }} value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block" style={{ fontFamily: 'Jost, sans-serif' }}>🕐 Heure</label>
                <input type="time" className={inputClass} style={{ fontFamily: 'Jost, sans-serif' }} value={time} onChange={e => setTime(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block" style={{ fontFamily: 'Jost, sans-serif' }}>🔞 Âge min.</label>
                <input
                  type="text"
                  inputMode="numeric"
                  className={cn(inputClass, minAgeError && 'border-destructive focus:ring-destructive/20')}
                  style={{ fontFamily: 'Jost, sans-serif' }}
                  placeholder="Aucun"
                  value={minAge}
                  onChange={e => handleMinAgeChange(e.target.value)}
                />
                {minAgeError && <p className="text-xs text-destructive mt-1" style={{ fontFamily: 'Jost, sans-serif' }}>{minAgeError}</p>}
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block" style={{ fontFamily: 'Jost, sans-serif' }}>👥 Places max</label>
                <input
                  type="text"
                  inputMode="numeric"
                  className={inputClass}
                  style={{ fontFamily: 'Jost, sans-serif' }}
                  placeholder="Illimité"
                  value={maxParticipants}
                  onChange={e => handleMaxParticipantsChange(e.target.value)}
                />
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading || !title.trim() || !!minAgeError}
            className="btn-ocean w-full py-4 text-base font-semibold disabled:opacity-50">
            {loading ? 'Création...' : "🚀 Créer l'activité"}
          </button>
        </form>
      </div>
      <BottomNav />
    </div>
  );
}
