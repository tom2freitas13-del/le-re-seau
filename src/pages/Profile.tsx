import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Camera, Instagram, Linkedin, Check, Settings as SettingsIcon, MapPin } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import ReferralCard from '@/components/ReferralCard';
import AvailableNowToggle from '@/components/AvailableNowToggle';
import { CommunityLevelProgress } from '@/components/CommunityLevelBadge';
import { GamificationInfoLink } from '@/components/GamificationInfoModal';
import { cn } from '@/lib/utils';
import { STATUS_OPTIONS, AVAILABILITY_OPTIONS, INTEREST_OPTIONS, MIN_AGE, MAX_AGE, ILE_DE_RE_CITIES } from '@/lib/constants';
import { usePendingReportsCount } from '@/lib/usePendingReportsCount';

const BIO_MAX = 300;
const MAX_PHOTO_SIZE_MB = 5;

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="font-display text-xl font-semibold mb-3">{children}</h3>;
}

// Cette page ne contient plus que l'édition du profil lui-même — tout le
// reste (mot de passe, notifications, langue, parrainage, déconnexion,
// suppression de compte…) vit dans /settings, via l'icône ⚙️ du header.
export default function Profile() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const pendingReports = usePendingReportsCount();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [ageError, setAgeError] = useState('');
  const [bio, setBio] = useState('');
  const [status, setStatus] = useState('');
  const [availability, setAvailability] = useState('');
  const [city, setCity] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [instagram, setInstagram] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [totalPoints, setTotalPoints] = useState(0);

  const loadProfile = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
    if (data) {
      setName(data.name || '');
      setAge(data.age?.toString() || '');
      setBio(data.bio || '');
      setStatus(data.status || '');
      setAvailability(data.availability || '');
      setCity(data.city || '');
      setInterests(data.interests || []);
      setPhotoUrl(data.photo_url);
      setInstagram(data.instagram || '');
      setLinkedin(data.linkedin || '');
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    supabase.from('user_points_summary').select('total_points').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setTotalPoints(data?.total_points || 0));
  }, [user]);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    loadProfile();
  }, [user, navigate, loadProfile]);

  // BUG FIX (#3) : validation stricte de l'âge — entiers uniquement, bornes raisonnables.
  // On bloque aussi la saisie de "-" et "e" qui passent parfois un <input type="number">.
  const handleAgeChange = (raw: string) => {
    const cleaned = raw.replace(/[^0-9]/g, '').slice(0, 3);
    setAge(cleaned);
    if (cleaned === '') { setAgeError(''); return; }
    const num = parseInt(cleaned, 10);
    if (num < MIN_AGE) setAgeError(t('profile.ageMinError', { min: MIN_AGE }));
    else if (num > MAX_AGE) setAgeError(t('profile.ageMaxError', { max: MAX_AGE }));
    else setAgeError('');
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      toast.error(t('profile.photoTypeError'));
      return;
    }
    if (file.size > MAX_PHOTO_SIZE_MB * 1024 * 1024) {
      toast.error(t('profile.photoSizeError', { max: MAX_PHOTO_SIZE_MB }));
      return;
    }

    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (error) { toast.error(t('profile.photoUploadError')); setUploading(false); return; }
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
      toast.error(t('profile.nameRequiredError'));
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
      status: (status || null) as 'resident' | 'frequent' | 'vacation' | null,
      availability: (availability || null) as 'weekend' | 'week' | 'summer' | 'year' | null,
      city: city || null,
      interests,
      instagram: instagram.trim() || null,
      linkedin: linkedin.trim() || null,
    }).eq('user_id', user.id);
    if (error) {
      console.error('Profile save error:', error);
      toast.error(error.message || t('profile.saveError'));
    } else {
      toast.success(t('profile.saveSuccess'));
    }
    setLoading(false);
  };

  // Un profil incomplet se matche moins bien (computeMatchScore retourne 0
  // sans centres d'intérêt) et donne une moins bonne première impression sur
  // les cartes des autres membres — cette checklist motive à le compléter.
  const profileSteps = useMemo(() => [
    { key: 'name', done: name.trim().length > 0, label: t('profile.completionName') },
    { key: 'photo', done: !!photoUrl, label: t('profile.completionPhoto') },
    { key: 'bio', done: bio.trim().length > 0, label: t('profile.completionBio') },
    { key: 'interests', done: interests.length > 0, label: t('profile.completionInterests') },
    { key: 'status', done: status.length > 0, label: t('profile.completionStatus') },
    { key: 'availability', done: availability.length > 0, label: t('profile.completionAvailability') },
    { key: 'city', done: city.length > 0, label: t('profile.completionCity') },
  ], [name, photoUrl, bio, interests, status, availability, city, t]);
  const completionPercent = Math.round((profileSteps.filter(s => s.done).length / profileSteps.length) * 100);

  return (
    <div className="min-h-screen pb-28 bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="font-display text-2xl font-semibold">{t('profile.title')}</h1>
          <Link to="/settings" title={t('settings.title')}
            className="relative h-10 w-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <SettingsIcon className="h-5 w-5" />
            {pendingReports > 0 && (
              <span className="absolute top-1 right-1 h-4 min-w-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-semibold flex items-center justify-center">
                {pendingReports > 9 ? '9+' : pendingReports}
              </span>
            )}
          </Link>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">

        {/* Niveau communautaire (gamification) */}
        <div className="card-premium p-5">
          <CommunityLevelProgress totalPoints={totalPoints} />
          <GamificationInfoLink totalPoints={totalPoints} />
        </div>

        {/* Progression du profil */}
        {completionPercent < 100 && (
          <div className="card-premium p-5 space-y-3">
            <div className="flex items-center justify-between">
              <SectionTitle>{t('profile.completionTitle')}</SectionTitle>
              <span className="text-sm font-semibold text-primary">{completionPercent}%</span>
            </div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-pine rounded-full transition-all duration-500"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {profileSteps.map(step => (
                <span
                  key={step.key}
                  className={cn(
                    'pill flex items-center gap-1 text-[11px]',
                    step.done ? 'bg-pine-light text-pine' : 'bg-muted text-muted-foreground'
                  )}>
                  {step.done ? <Check className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />}
                  {step.label}
                </span>
              ))}
            </div>
          </div>
        )}

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
        {uploading && <p className="text-center text-sm text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif' }}>{t('profile.loadingPhoto')}</p>}

        {/* Infos de base */}
        <div className="card-premium p-5 space-y-3">
          <SectionTitle>{t('profile.infoSection')}</SectionTitle>
          <input
            type="text"
            placeholder={t('profile.firstName')}
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
              placeholder={t('profile.age')}
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
              placeholder={t('profile.bioPlaceholder')}
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
          <SectionTitle>{t('profile.socialNetworks')}</SectionTitle>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
              <Instagram className="h-4 w-4 text-white" />
            </div>
            <input
              type="text"
              placeholder={t('profile.instagramPlaceholder')}
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
              placeholder={t('profile.linkedinPlaceholder')}
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
          <SectionTitle>{t('profile.myStatus')}</SectionTitle>
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
                <span>{t(`statusOptions.${opt.value}`)}</span>
                {status === opt.value && <Check className="h-4 w-4 ml-auto" />}
              </button>
            ))}
          </div>
        </div>

        {/* Disponibilité */}
        <div className="card-premium p-5">
          <SectionTitle>{t('profile.availability')}</SectionTitle>
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
                {t(`availabilityOptions.${opt.value}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Disponible maintenant (statut éphémère 2h, distinct de Disponibilité ci-dessus) */}
        <AvailableNowToggle />

        {/* Ville de résidence */}
        <div className="card-premium p-5">
          <SectionTitle>
            <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-primary" /> {t('profile.cityTitle')}</span>
          </SectionTitle>
          <p className="text-xs text-muted-foreground mb-3" style={{ fontFamily: 'Jost, sans-serif' }}>
            {t('profile.cityDesc')}
          </p>
          <div className="flex flex-wrap gap-2">
            {ILE_DE_RE_CITIES.map(c => (
              <button key={c} onClick={() => setCity(c === city ? '' : c)}
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 border',
                  city === c
                    ? 'border-primary bg-primary text-white shadow-md shadow-primary/20'
                    : 'border-border bg-background hover:bg-secondary text-foreground'
                )}
                style={{ fontFamily: 'Jost, sans-serif' }}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Centres d'intérêt */}
        <div className="card-premium p-5">
          <SectionTitle>{t('profile.interests')}</SectionTitle>
          <p className="text-xs text-muted-foreground mb-3" style={{ fontFamily: 'Jost, sans-serif' }}>
            {t('profile.interestsDesc')}
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
                {opt.emoji} {t(`interestOptions.${opt.value}`)}
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleSave} disabled={loading || !!ageError}
          className="btn-ocean w-full py-4 text-base font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
          {loading ? t('profile.saving') : t('profile.saveProfile')}
        </button>

        {/* Parrainage — en accès direct ici aussi, pas seulement dans /settings */}
        <ReferralCard />

        <div className="h-4" />
      </div>
      <BottomNav />
    </div>
  );
}
