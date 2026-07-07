import { MessageCircle, Instagram, Linkedin, Star, MoreVertical, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { avatarFallbackInitial } from '@/lib/constants';
import { ReportModal } from '@/components/ReportModal';
import BlockButton from '@/components/BlockButton';
import { useBlockedUsers } from '@/lib/useBlockedUsers';
import ProfileDetailModal from '@/components/ProfileDetailModal';
import { usePresence } from '@/lib/presence-context';

export interface ProfileCardProfile {
  id: string;
  user_id: string;
  name: string | null;
  age: number | null;
  bio: string | null;
  photo_url: string | null;
  interests: string[] | null;
  status: string | null;
  availability: string | null;
  instagram?: string | null;
  linkedin?: string | null;
  is_admin?: boolean | null;
}

export function AdminBadge({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-r from-amber-400 to-amber-600 flex-shrink-0" title="Admin">
        <ShieldCheck className="h-2.5 w-2.5 text-white" />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 px-2 py-0.5 text-[10px] font-semibold text-white flex-shrink-0">
      <ShieldCheck className="h-3 w-3" /> Admin
    </span>
  );
}

interface ProfileCardProps {
  profile: ProfileCardProfile;
  matchScore?: number;
}

export const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  resident: { label: 'Résident·e', color: 'bg-pine-light text-pine', dot: 'bg-pine' },
  frequent: { label: 'Vient souvent', color: 'bg-ocean-light text-primary', dot: 'bg-primary' },
  vacation: { label: 'En vacances', color: 'bg-sand-light text-sand-dark', dot: 'bg-gold' },
};

export const interestConfig: Record<string, { emoji: string; label: string }> = {
  plage: { emoji: '🏖️', label: 'Plage' },
  vélo: { emoji: '🚲', label: 'Vélo' },
  tennis: { emoji: '🎾', label: 'Tennis' },
  surf: { emoji: '🏄', label: 'Surf' },
  apéro: { emoji: '🍷', label: 'Apéro' },
  bateau: { emoji: '⛵', label: 'Bateau' },
  running: { emoji: '🏃', label: 'Running' },
  pêche: { emoji: '🎣', label: 'Pêche' },
  yoga: { emoji: '🧘', label: 'Yoga' },
  randonnée: { emoji: '🥾', label: 'Rando' },
};

export default function ProfileCard({ profile, matchScore }: ProfileCardProps) {
  const navigate = useNavigate();
  const status = profile.status ? statusConfig[profile.status] : null;
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const { isBlocked, blockUser, unblockUser } = useBlockedUsers();
  const blocked = isBlocked(profile.user_id);
  const { isOnline } = usePresence();
  const online = isOnline(profile.user_id);

  return (
    <div className="card-premium overflow-hidden group relative">
      {reportOpen && (
        <ReportModal
          targetType="profile"
          targetId={profile.id}
          targetUserId={profile.user_id}
          onClose={() => setReportOpen(false)}
        />
      )}

      {detailOpen && (
        <ProfileDetailModal profile={profile} matchScore={matchScore} onClose={() => setDetailOpen(false)} />
      )}

      {/* Photo */}
      <div className="relative aspect-[4/3] overflow-hidden bg-ocean-light cursor-pointer" onClick={() => setDetailOpen(true)}>
        {profile.photo_url ? (
          <img
            src={profile.photo_url}
            alt={profile.name || ''}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <span className="font-display text-6xl font-semibold text-primary/40">
              {avatarFallbackInitial(profile.name)}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Rangée du haut : statut à gauche, menu + match empilés à droite (BUG FIX : ils se chevauchaient avant) */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-1.5 z-10">
          {status ? (
            <div className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium glass max-w-[68%] ${status.color}`}
              style={{ fontFamily: 'Jost, sans-serif' }}>
              <div className={`h-1.5 w-1.5 rounded-full ${status.dot} flex-shrink-0`} />
              <span className="truncate">{status.label}</span>
            </div>
          ) : <span />}

          <div className="flex flex-col items-end gap-1.5 flex-shrink-0 relative">
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
              className="h-10 w-10 rounded-full glass flex items-center justify-center text-foreground hover:bg-white/90 transition-colors">
              <MoreVertical className="h-4 w-4" />
            </button>

            {matchScore !== undefined && matchScore > 0 && (
              <div className="glass rounded-full px-2 py-1 flex items-center gap-1 whitespace-nowrap">
                <Star className="h-3 w-3 text-gold fill-gold flex-shrink-0" />
                <span className="text-[10px] font-semibold text-foreground" style={{ fontFamily: 'Jost, sans-serif' }}>
                  {matchScore}%
                </span>
              </div>
            )}

            {menuOpen && (
              <div className="absolute top-9 right-0 bg-card rounded-xl shadow-lg border border-border/50 py-1 w-40 z-20"
                onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => { setReportOpen(true); setMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-secondary flex items-center gap-2"
                  style={{ fontFamily: 'Jost, sans-serif' }}>
                  🚩 Signaler
                </button>
                <button
                  onClick={() => { blocked ? unblockUser(profile.user_id) : blockUser(profile.user_id); setMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-secondary flex items-center gap-2 text-destructive"
                  style={{ fontFamily: 'Jost, sans-serif' }}>
                  {blocked ? '✅ Débloquer' : '🚫 Bloquer'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Name on photo */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="font-display text-2xl font-semibold text-white flex flex-wrap items-center gap-2" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.4)' }}>
            {profile.name || 'Anonyme'}{profile.age ? `, ${profile.age}` : ''}
            {online && (
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-white/80 flex-shrink-0" title="En ligne" />
            )}
            {profile.is_admin && <AdminBadge compact />}
          </h3>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div className="cursor-pointer space-y-3" onClick={() => setDetailOpen(true)}>
          {profile.bio && (
            <p className="text-sm text-muted-foreground line-clamp-2" style={{ fontFamily: 'Jost, sans-serif', lineHeight: 1.6 }}>
              {profile.bio}
            </p>
          )}

          {/* Interests */}
          {profile.interests && profile.interests.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {profile.interests.slice(0, 4).map((interest) => {
                const conf = interestConfig[interest];
                return (
                  <span key={interest} className="pill bg-secondary text-secondary-foreground">
                    {conf?.emoji || ''} {conf?.label || interest}
                  </span>
                );
              })}
              {profile.interests.length > 4 && (
                <span className="pill bg-muted text-muted-foreground">+{profile.interests.length - 4}</span>
              )}
            </div>
          )}
        </div>

        {/* Actions — BUG FIX : bouton Message sur sa propre ligne, réseaux sociaux en dessous, pour éviter que ça déborde sur les cartes étroites */}
        <div className="flex flex-col gap-2 pt-1">
          <button
            onClick={() => navigate(`/chat/${profile.user_id}`)}
            className="w-full btn-ocean flex items-center justify-center gap-2 py-2.5 text-sm">
            <MessageCircle className="h-4 w-4" />
            Message
          </button>

          {(profile.instagram || profile.linkedin) && (
            <div className="flex gap-1.5 justify-center">
              {profile.instagram && (
                <a href={`https://instagram.com/${profile.instagram}`} target="_blank" rel="noopener noreferrer"
                  className="h-9 w-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center hover:shadow-lg transition-all hover:-translate-y-0.5 flex-shrink-0">
                  <Instagram className="h-4 w-4 text-white" />
                </a>
              )}
              {profile.linkedin && (
                <a href={`https://linkedin.com/in/${profile.linkedin}`} target="_blank" rel="noopener noreferrer"
                  className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center hover:shadow-lg transition-all hover:-translate-y-0.5 flex-shrink-0">
                  <Linkedin className="h-4 w-4 text-white" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
