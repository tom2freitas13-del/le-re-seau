import { useTranslation } from 'react-i18next';
import { Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { buildReferralLink } from '@/lib/referral';

// Bannière compacte sur l'accueil pour mettre en avant le parrainage,
// devenu le plus gros levier de points depuis le rééquilibrage du barème
// (migration 060, +15 pts) — la carte complète (ReferralCard) reste sur
// /profile pour le détail (nombre de filleuls, badge Ambassadeur).
export default function ReferralBanner() {
  const { t } = useTranslation();
  const { user } = useAuth();
  if (!user) return null;

  const handleShare = async () => {
    const url = buildReferralLink(user.id);
    const shareData = { title: 'Le Ré-seau', text: t('profile.referralShareText'), url };
    if (navigator.share && navigator.canShare?.(shareData)) {
      try { await navigator.share(shareData); } catch { /* l'utilisateur a annulé le partage, rien à faire */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t('profile.referralLinkCopied'));
    } catch {
      toast.error(t('profile.referralCopyError'));
    }
  };

  return (
    <div className="rounded-2xl px-5 py-4 flex items-center gap-3"
      style={{ background: 'linear-gradient(135deg, hsl(196 60% 22%), hsl(200 65% 15%))' }}>
      <span className="text-2xl flex-shrink-0">🌊</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white" style={{ fontFamily: 'Jost, sans-serif' }}>
          {t('home.referralBannerTitle')}
        </p>
        <p className="text-xs text-white/70" style={{ fontFamily: 'Jost, sans-serif' }}>
          {t('home.referralBannerSubtitle')}
        </p>
      </div>
      <button onClick={handleShare}
        className="bg-white text-primary rounded-full px-4 py-2 text-xs font-semibold flex items-center gap-1.5 flex-shrink-0 hover:shadow-lg transition-all">
        <Share2 className="h-3.5 w-3.5" /> {t('home.referralBannerCta')}
      </button>
    </div>
  );
}
