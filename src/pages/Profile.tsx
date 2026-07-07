import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { LogOut, Camera, Instagram, Linkedin, Check, Info, ShieldCheck } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { cn } from '@/lib/utils';
import { STATUS_OPTIONS, AVAILABILITY_OPTIONS, INTEREST_OPTIONS, MIN_AGE, MAX_AGE } from '@/lib/constants';
import DeleteAccountButton from '@/components/DeleteAccountButton';

const BIO_MAX = 300;
const MAX_PHOTO_SIZE_MB = 5;

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="font-display text-xl font-semibold mb-3">{children}</h3>;
}

export default function Profile() {
  const { user, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [ageError, setAgeError] = useState('');
  const [bio, setBio] = useState('');
  const [status, setStatus] = useState('');
  const [availability, setAvailability] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [instagram, setInstagram] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [pendingReports, setPendingReports] = useState(0);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    loadProfile();
  }, [user]);

  useEffect(() => {
    if (!isAdmin) return;
    const loadPendingReports = async () => {
      const { count } = await supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      setPendingReports(count || 0);
    };
    loadPendingReports();
    const channel = supabase
      .channel('admin-pending-reports')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, loadPendingReports)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAdmin]);

  const loadProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
    if (data) {
      setName(data.name || '');
      setAge(data.age?.toString() || '');
      setBio(data.bio || '');
      setStatus(data.status || '');
      setAvailability(data.availability || '');
      setInterests(data.interests || []);
      setPhotoUrl(data.photo_url);
      setInstagram(data.instagram || '');
      setLinkedin(data.linkedin || '');
    }
  };

  // BUG FIX (#3) : validation stricte de l'âge — entiers uniquement, bornes raisonnables.
  // On bloque aussi la saisie de "-" et "e" qui passent parfois un <input type="number">.
  const handleAgeChange = (raw: string) => {
    const cleaned = raw.replace(/[^0-9]/g, '').slice(0, 3);
    setAge(cleaned);
    if (cleaned === '') { setAgeError(''); return; }
    const num = parseInt(cleaned, 10);
    if (num < MIN_AGE) setAgeError(`L'âge minimum est ${MIN_AGE} ans.`);
    else if (num > MAX_AGE) setAgeError(`L'âge maximum est ${MAX_AGE} ans.`);
    else setAgeError('');
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Merci de choisir un fichier image.');
      return;
    }
    if (file.size > MAX_PHOTO_SIZE_MB * 1024 * 1024) {
      toast.error(`L'image doit faire moins de ${MAX_PHOTO_SIZE_MB} Mo.`);
      return;
    }

    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (error) { toast.error('Erreur lors de l\'envoi de la photo.'); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
    setPhotoUrl(publicUrl);
    setUploading(false);
  };

  const toggleInterest = (v: string) =>
    setInterests(prev => prev.includes(v) ? prev.filter(i => i !== v) : [...prev, v]);

  const handleSave = async () => {
    if (!user) return;

    // BUG FIX (#12) : nom requis, validations avant envoi.
    if (!name.trim()) {
      toast.error('Merci de renseigner votre prénom.');
      return;
    }
    if (ageError) {
      toast.error(ageError);
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('profiles').update({
      name: name.trim(),
      age: age ? parseInt(age, 10) : null,
      bio: bio.trim() || null,
      photo_url: photoUrl,
      status: (status || null) as any,
      availability: (availability || null) as any,
      interests,
      instagram: instagram.trim() || null,
      linkedin: linkedin.trim() || null,
    }).eq('user_id', user.id);
    if (error) toast.error('Erreur lors de la sauvegarde.');
    else toast.success('Profil mis à jour ✨');
    setLoading(false);
  };

  return (
    <div className="min-h-screen pb-28 bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="font-display text-2xl font-semibold">Mon Profil</h1>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link to="/admin" className="relative text-xs text-destructive hover:text-destructive/80 transition-colors flex items-center gap-1 font-medium"
                style={{ fontFamily: 'Jost, sans-serif' }}>
                <ShieldCheck className="h-3.5 w-3.5" /> Modération
                {pendingReports > 0 && (
                  <span className="h-4 min-w-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-semibold flex items-center justify-center">
                    {pendingReports > 9 ? '9+' : pendingReports}
                  </span>
                )}
              </Link>
            )}
            <Link to="/about" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              style={{ fontFamily: 'Jost, sans-serif' }}>
              <Info className="h-3.5 w-3.5" /> À propos
            </Link>
            <button onClick={() => { signOut(); navigate('/'); }}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive transition-colors"
              style={{ fontFamily: 'Jost, sans-serif' }}>
              <LogOut className="h-4 w-4" /> Déconnexion
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">

        {/* Photo */}
        <div className="flex justify-center">
          <label className="relative cursor-pointer group">
            <div className="h-32 w-32 rounded-full overflow-hidden border-4 border-white shadow-xl">
              {photoUrl ? (
                <img src={photoUrl} alt="Photo" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-ocean-light">
                  <Camera className="h-10 w-10 text-primary" strokeWidth={1.5} />
                </div>
              )}
            </div>
            <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="h-8 w-8 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1 h-9 w-9 rounded-full bg-primary flex items-center justify-center shadow-md border-2 border-white">
              <Camera className="h-4 w-4 text-white" />
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
          </label>
        </div>
        {uploading && <p className="text-center text-sm text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif' }}>Chargement...</p>}

        {/* Infos de base */}
        <div className="card-premium p-5 space-y-3">
          <SectionTitle>Informations</SectionTitle>
          <input
            type="text"
            placeholder="Prénom *"
            value={name}
            maxLength={40}
            onChange={e => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            style={{ fontFamily: 'Jost, sans-serif' }}
          />
          <div>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Âge"
              value={age}
              onChange={e => handleAgeChange(e.target.value)}
              className={cn(
                'w-full px-4 py-3 rounded-xl border bg-background text-sm focus:ring-2 outline-none transition-all',
                ageError ? 'border-destructive focus:ring-destructive/20' : 'border-border focus:ring-primary/20'
              )}
              style={{ fontFamily: 'Jost, sans-serif' }}
            />
            {ageError && <p className="text-xs text-destructive mt-1" style={{ fontFamily: 'Jost, sans-serif' }}>{ageError}</p>}
          </div>
          <div>
            <textarea
              placeholder="Une petite bio... Qui êtes-vous sur l'île ?"
              value={bio}
              maxLength={BIO_MAX}
              onChange={e => setBio(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
              style={{ fontFamily: 'Jost, sans-serif' }}
            />
            <p className="text-xs text-muted-foreground text-right mt-1" style={{ fontFamily: 'Jost, sans-serif' }}>
              {bio.length}/{BIO_MAX}
            </p>
          </div>
        </div>

        {/* Réseaux sociaux */}
        <div className="card-premium p-5 space-y-3">
          <SectionTitle>Réseaux sociaux</SectionTitle>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
              <Instagram className="h-4 w-4 text-white" />
            </div>
            <input
              type="text"
              placeholder="Votre pseudo Instagram"
              value={instagram}
              maxLength={50}
              onChange={e => setInstagram(e.target.value.replace(/^@/, ''))}
              className="flex-1 px-4 py-3 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              style={{ fontFamily: 'Jost, sans-serif' }}
            />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
              <Linkedin className="h-4 w-4 text-white" />
            </div>
            <input
              type="text"
              placeholder="Votre pseudo LinkedIn"
              value={linkedin}
              maxLength={50}
              onChange={e => setLinkedin(e.target.value)}
              className="flex-1 px-4 py-3 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              style={{ fontFamily: 'Jost, sans-serif' }}
            />
          </div>
        </div>

        {/* Statut */}
        <div className="card-premium p-5">
          <SectionTitle>Mon statut sur l'île</SectionTitle>
          <div className="space-y-2">
            {STATUS_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setStatus(opt.value)}
                className={cn(
                  'w-full text-left rounded-xl px-4 py-3.5 text-sm font-medium transition-all duration-200 border flex items-center gap-3',
                  status === opt.value
                    ? 'border-primary bg-ocean-light text-primary shadow-sm'
                    : 'border-border bg-background hover:bg-secondary'
                )}
                style={{ fontFamily: 'Jost, sans-serif' }}>
                <span className="text-xl">{opt.emoji}</span>
                <span>{opt.label}</span>
                {status === opt.value && <Check className="h-4 w-4 ml-auto" />}
              </button>
            ))}
          </div>
        </div>

        {/* Disponibilité */}
        <div className="card-premium p-5">
          <SectionTitle>Disponibilité</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {AVAILABILITY_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setAvailability(opt.value)}
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 border',
                  availability === opt.value
                    ? 'border-primary bg-primary text-white shadow-md shadow-primary/20'
                    : 'border-border bg-background hover:bg-secondary text-foreground'
                )}
                style={{ fontFamily: 'Jost, sans-serif' }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Centres d'intérêt */}
        <div className="card-premium p-5">
          <SectionTitle>Centres d'intérêt</SectionTitle>
          <p className="text-xs text-muted-foreground mb-3" style={{ fontFamily: 'Jost, sans-serif' }}>
            Sélectionnez vos activités — elles servent à vous proposer des profils compatibles.
          </p>
          <div className="flex flex-wrap gap-2">
            {INTEREST_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => toggleInterest(opt.value)}
                className={cn(
                  'rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-200 border',
                  interests.includes(opt.value)
                    ? 'border-primary bg-ocean-light text-primary shadow-sm'
                    : 'border-border bg-background hover:bg-secondary text-foreground'
                )}
                style={{ fontFamily: 'Jost, sans-serif' }}>
                {opt.emoji} {opt.value}
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleSave} disabled={loading || !!ageError}
          className="btn-ocean w-full py-4 text-base font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
          {loading ? 'Sauvegarde...' : '✨ Enregistrer mon profil'}
        </button>

        {/* Zone de danger : suppression de compte (obligation RGPD) */}
        <div className="card-premium p-5 border border-destructive/20">
          <h3 className="font-display text-lg font-semibold mb-1 text-destructive">Zone de danger</h3>
          <p className="text-xs text-muted-foreground mb-4" style={{ fontFamily: 'Jost, sans-serif' }}>
            La suppression de votre compte est définitive et supprime toutes vos données.
          </p>
          <DeleteAccountButton />
        </div>

        <div className="h-4" />
      </div>
      <BottomNav />
    </div>
  );
}
