import { X, MessageCircle, Instagram, Linkedin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { avatarFallbackInitial } from '@/lib/constants';
import { statusConfig, interestConfig, ProfileCardProfile } from '@/components/ProfileCard';

interface ProfileDetailModalProps {
  profile: ProfileCardProfile;
  matchScore?: number;
  onClose: () => void;
}

/**
 * Vue plein écran d'un profil : reprend les infos de la carte mais sans
 * aucune troncature (bio complète, tous les centres d'intérêt), pour
 * répondre au besoin de voir un profil "en grand" quand le contenu est trop
 * long pour tenir dans la carte de la liste.
 */
export default function ProfileDetailModal({ profile, matchScore, onClose }: ProfileDetailModalProps) {
  const navigate = useNavigate();
  const status = profile.status ? statusConfig[profile.status] : null;

  return (
    <div className="fixed inset-0 z-[100] bg-background overflow-y-auto">
      <div className="relative aspect-[4/3] bg-ocean-light">
        {profile.photo_url ? (
          <img
            src={profile.photo_url}
            alt={profile.name || ''}
            className="h-full w-full object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <span className="font-display text-8xl font-semibold text-primary/40">
              {avatarFallbackInitial(profile.name)}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        <button onClick={onClose}
          className="absolute top-4 left-4 h-9 w-9 rounded-full glass flex items-center justify-center text-foreground hover:bg-white/90 transition-colors">
          <X className="h-4.5 w-4.5" />
        </button>

        {status && (
          <div className={`absolute top-4 right-4 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium glass ${status.color}`}
            style={{ fontFamily: 'Jost, sans-serif' }}>
            <div className={`h-1.5 w-1.5 rounded-full ${status.dot} flex-shrink-0`} />
            <span>{status.label}</span>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-5">
          <h2 className="font-display text-3xl font-semibold text-white" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.4)' }}>
            {profile.name || 'Anonyme'}{profile.age ? `, ${profile.age}` : ''}
          </h2>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-5 pb-28 space-y-5">
        {matchScore !== undefined && matchScore > 0 && (
          <p className="text-sm text-pine font-medium" style={{ fontFamily: 'Jost, sans-serif' }}>
            ⭐ {matchScore}% de compatibilité avec tes centres d'intérêt
          </p>
        )}

        {profile.bio && (
          <p className="text-sm text-foreground whitespace-pre-wrap" style={{ fontFamily: 'Jost, sans-serif', lineHeight: 1.7 }}>
            {profile.bio}
          </p>
        )}

        {profile.interests && profile.interests.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2" style={{ fontFamily: 'Jost, sans-serif' }}>
              Centres d'intérêt
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {profile.interests.map((interest) => {
                const conf = interestConfig[interest];
                return (
                  <span key={interest} className="pill bg-secondary text-secondary-foreground">
                    {conf?.emoji || ''} {conf?.label || interest}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {(profile.instagram || profile.linkedin) && (
          <div className="flex gap-2">
            {profile.instagram && (
              <a href={`https://instagram.com/${profile.instagram}`} target="_blank" rel="noopener noreferrer"
                className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center hover:shadow-lg transition-all hover:-translate-y-0.5 flex-shrink-0">
                <Instagram className="h-5 w-5 text-white" />
              </a>
            )}
            {profile.linkedin && (
              <a href={`https://linkedin.com/in/${profile.linkedin}`} target="_blank" rel="noopener noreferrer"
                className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center hover:shadow-lg transition-all hover:-translate-y-0.5 flex-shrink-0">
                <Linkedin className="h-5 w-5 text-white" />
              </a>
            )}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border/50 px-4 py-3 safe-area-bottom">
        <button
          onClick={() => navigate(`/chat/${profile.user_id}`)}
          className="max-w-lg mx-auto w-full btn-ocean flex items-center justify-center gap-2 py-3 text-sm">
          <MessageCircle className="h-4 w-4" />
          Message
        </button>
      </div>
    </div>
  );
}
