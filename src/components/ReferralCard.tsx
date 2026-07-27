import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Share, Share2, UserPlus, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { AMBASSADOR_REFERRAL_THRESHOLD } from '@/lib/constants';
import { AmbassadorBadge } from '@/components/ProfileCard';
import { buildReferralLink } from '@/lib/referral';
import { shareToWhatsApp } from '@/lib/share';

// Carte "Parrainage" partagée entre /profile (accès direct, en bas de page —
// trop dur à trouver quand elle ne vivait que dans /settings) et /settings
// (laissé en place là aussi), pour ne pas dupliquer la logique à deux endroits.
export default function ReferralCard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [referralCount, setReferralCount] = useState(0);

  const loadReferralCount = useCallback(async () => {
    if (!user) return;
    const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('referred_by', user.id);
    setReferralCount(count || 0);
  }, [user]);

  useEffect(() => { loadReferralCount(); }, [loadReferralCount]);

  const handleShareReferral = async () => {
    if (!user) return;
    const url = buildReferralLink(user.id);
    const shareData = { title: 'Le Ré-seau', text: t('profile.referralShareText'), url };
    if (navigator.share && navigator.canShare?.(shareData)) {
      try { await navigator.share(shareData); } catch { /* l'utilisateur a annulé le partage, rien à faire */ }
      return;
    }
    await handleCopyReferral();
  };

  const handleShareReferralWhatsApp = () => {
    if (!user) return;
    shareToWhatsApp(`${t('profile.referralShareText')} ${buildReferralLink(user.id)}`);
  };

  const handleCopyReferral = async () => {
    if (!user) return;
    try {
      await navigator.clipboard.writeText(buildReferralLink(user.id));
      toast.success(t('profile.referralLinkCopied'));
    } catch {
      toast.error(t('profile.referralCopyError'));
    }
  };

  return (
    <div className="card-premium p-5">
      <h3 className="font-display text-xl font-semibold mb-3">{t('profile.referralTitle')}</h3>
      <p className="text-xs text-muted-foreground mb-4" style={{ fontFamily: 'Jost, sans-serif' }}>
        {t('profile.referralDesc')}
      </p>
      {referralCount > 0 && (
        <p className="text-sm mb-3 flex items-center gap-2" style={{ fontFamily: 'Jost, sans-serif' }}>
          <UserPlus className="h-4 w-4 text-primary" />
          {t('profile.referralCount', { count: referralCount })}
        </p>
      )}
      {referralCount >= AMBASSADOR_REFERRAL_THRESHOLD ? (
        <div className="mb-3">
          <AmbassadorBadge />
        </div>
      ) : (
        <p className="text-xs text-muted-foreground mb-3" style={{ fontFamily: 'Jost, sans-serif' }}>
          {t('profile.ambassadorProgress', { count: AMBASSADOR_REFERRAL_THRESHOLD - referralCount })}
        </p>
      )}
      <div className="flex gap-2">
        <button onClick={handleShareReferral} className="btn-ocean flex-1 py-2.5 text-sm flex items-center justify-center gap-1.5">
          <Share className="h-4 w-4" /> {t('profile.referralShareButton')}
        </button>
        <button onClick={handleShareReferralWhatsApp} title={t('profile.referralShareWhatsApp')}
          className="h-11 w-11 rounded-full border border-border flex items-center justify-center text-[#25D366] hover:bg-[#25D366]/10 flex-shrink-0">
          <Share2 className="h-4 w-4" />
        </button>
        <button onClick={handleCopyReferral} title={t('profile.referralCopyButton')}
          className="h-11 w-11 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground flex-shrink-0">
          <Copy className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
