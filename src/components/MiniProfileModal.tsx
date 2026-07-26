import { useEffect, useState } from 'react';
import { X, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { avatarFallbackInitial } from '@/lib/constants';
import { statusConfig } from '@/components/ProfileCard';

interface MiniProfile {
  user_id: string;
  name: string | null;
  age: number | null;
  bio: string | null;
  photo_url: string | null;
  status: string | null;
}

/**
 * Aperçu de profil compact (pas plein écran comme ProfileDetailModal) —
 * juste de quoi identifier la personne et lui écrire, pour un clic sur un
 * nom d'auteur dans le forum sans quitter le fil de discussion.
 */
export default function MiniProfileModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<MiniProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase.from('profiles').select('user_id, name, age, bio, photo_url, status').eq('user_id', userId).single()
      .then(({ data }) => { if (!cancelled) { setProfile(data); setLoading(false); } });
    return () => { cancelled = true; };
  }, [userId]);

  const status = profile?.status ? statusConfig[profile.status] : null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center px-4" onClick={onClose}>
      <div className="bg-card rounded-3xl p-5 w-full max-w-xs space-y-3 relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
          <X className="h-4 w-4" />
        </button>

        {loading ? (
          <div className="py-6 text-center text-sm text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif' }}>
            {t('miniProfile.loading')}
          </div>
        ) : !profile ? (
          <div className="py-6 text-center text-sm text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif' }}>
            {t('miniProfile.notFound')}
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center gap-2 pt-2">
              <div className="h-16 w-16 rounded-full overflow-hidden bg-ocean-light flex items-center justify-center flex-shrink-0">
                {profile.photo_url ? (
                  <img src={profile.photo_url} alt={profile.name || ''} className="h-full w-full object-cover" />
                ) : (
                  <span className="font-display text-xl font-semibold text-primary/60">{avatarFallbackInitial(profile.name)}</span>
                )}
              </div>
              <h3 className="font-display text-lg font-semibold text-center">
                {profile.name || t('profileCard.anonymous')}{profile.age ? `, ${profile.age}` : ''}
              </h3>
              {status && (
                <div className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${status.color}`} style={{ fontFamily: 'Jost, sans-serif' }}>
                  <div className={`h-1.5 w-1.5 rounded-full ${status.dot} flex-shrink-0`} />
                  <span>{t(`statusLabels.${profile.status}`)}</span>
                </div>
              )}
              {profile.bio && (
                <p className="text-sm text-muted-foreground text-center whitespace-pre-wrap" style={{ fontFamily: 'Jost, sans-serif', lineHeight: 1.5 }}>
                  {profile.bio}
                </p>
              )}
            </div>

            {profile.user_id !== user?.id && (
              <button onClick={() => navigate(`/chat/${profile.user_id}`)}
                className="btn-ocean w-full flex items-center justify-center gap-2 py-2.5 text-sm">
                <MessageCircle className="h-4 w-4" />
                {t('profileCard.message')}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
