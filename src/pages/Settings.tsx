import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, LogOut, Info, ShieldCheck, Bell, BellOff, Share, Share2, Languages, UserPlus, Copy, KeyRound, Eye, EyeOff } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { cn } from '@/lib/utils';
import { AMBASSADOR_REFERRAL_THRESHOLD } from '@/lib/constants';
import DeleteAccountButton from '@/components/DeleteAccountButton';
import { AmbassadorBadge } from '@/components/ProfileCard';
import { isPushSupported, getPushPermissionState, subscribeToPush, unsubscribeFromPush, isIosSafari, isStandalonePwa } from '@/lib/push-notifications';
import { setLanguage } from '@/lib/i18n';
import { buildReferralLink } from '@/lib/referral';
import { shareToWhatsApp } from '@/lib/share';

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="font-display text-xl font-semibold mb-3">{children}</h3>;
}

// Tout ce qui n'est pas de l'édition de profil vit ici : sécurité du compte,
// notifications, langue, parrainage, liens utiles, déconnexion, suppression.
// La page /profile ne garde que ce qui aide à compléter son profil.
export default function Settings() {
  const { t, i18n } = useTranslation();
  const { user, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [pendingReports, setPendingReports] = useState(0);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [referralCount, setReferralCount] = useState(0);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);

  // Un compte connecté uniquement via Google n'a pas de mot de passe à gérer.
  const providers = (user?.app_metadata?.providers as string[] | undefined) ?? [];
  const hasEmailProvider = providers.includes('email');

  useEffect(() => {
    if (!user) navigate('/auth');
  }, [user, navigate]);

  useEffect(() => { refreshPushState(); }, []);

  const loadReferralCount = useCallback(async () => {
    if (!user) return;
    const { count } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('referred_by', user.id);
    setReferralCount(count || 0);
  }, [user]);

  useEffect(() => { loadReferralCount(); }, [loadReferralCount]);

  useEffect(() => {
    if (!isAdmin) return;
    const loadPendingReports = async () => {
      const { count } = await supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      setPendingReports(count || 0);
    };
    loadPendingReports();
    const channel = supabase
      .channel('settings-pending-reports')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, loadPendingReports)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAdmin]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error(t('settings.passwordMismatch'));
      return;
    }
    setPwdSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwdSaving(false);
    if (error) {
      toast.error(error.message || t('settings.passwordUpdateError'));
      return;
    }
    setNewPassword('');
    setConfirmPassword('');
    toast.success(t('settings.passwordUpdated'));
  };

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

  const refreshPushState = async () => {
    const supported = await isPushSupported();
    if (!supported) { setPushPermission('unsupported'); setPushSubscribed(false); return; }
    const perm = await getPushPermissionState();
    setPushPermission(perm);
    if (perm === 'granted') {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      setPushSubscribed(!!subscription);
    } else {
      setPushSubscribed(false);
    }
  };

  const handleEnablePush = async () => {
    if (!user) return;
    setPushLoading(true);
    const ok = await subscribeToPush(user.id);
    if (!ok) toast.error(t('profile.pushEnableError'));
    await refreshPushState();
    setPushLoading(false);
  };

  const handleDisablePush = async () => {
    if (!user) return;
    setPushLoading(true);
    await unsubscribeFromPush(user.id);
    await refreshPushState();
    setPushLoading(false);
    toast.success(t('profile.pushDisabled'));
  };

  // Change la langue immédiatement (localStorage), et la mémorise sur le
  // compte si connecté pour qu'elle suive l'utilisateur d'un appareil à l'autre.
  const handleLanguageChange = async (lang: 'fr' | 'en') => {
    setLanguage(lang);
    if (user) {
      await supabase.from('profiles').update({ language: lang }).eq('user_id', user.id);
    }
  };

  return (
    <div className="min-h-screen pb-28 bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate('/profile')} className="text-muted-foreground hover:text-foreground transition-colors" title={t('settings.backToProfile')}>
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-2xl font-semibold">{t('settings.title')}</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">

        {/* Sécurité : changement de mot de passe */}
        <div className="card-premium p-5">
          <SectionTitle>{t('settings.securityTitle')}</SectionTitle>
          {hasEmailProvider ? (
            <form onSubmit={handleChangePassword} className="space-y-3">
              <div className="relative">
                <input type={showPwd ? 'text' : 'password'} placeholder={t('settings.newPassword')} value={newPassword}
                  onChange={e => setNewPassword(e.target.value)} required minLength={8} autoComplete="new-password"
                  className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all pr-10"
                  style={{ fontFamily: 'Jost, sans-serif' }} />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <input type={showPwd ? 'text' : 'password'} placeholder={t('settings.confirmPassword')} value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)} required minLength={8} autoComplete="new-password"
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                style={{ fontFamily: 'Jost, sans-serif' }} />
              <p className="text-xs text-muted-foreground px-1" style={{ fontFamily: 'Jost, sans-serif' }}>
                {t('auth.minPassword')}
              </p>
              <button type="submit" disabled={pwdSaving}
                className="btn-ocean w-full py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
                <KeyRound className="h-4 w-4" /> {pwdSaving ? '...' : t('settings.changePassword')}
              </button>
            </form>
          ) : (
            <p className="text-xs text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif', lineHeight: 1.6 }}>
              {t('settings.googleAccountNote')}
            </p>
          )}
        </div>

        {/* Notifications push */}
        <div className="card-premium p-5">
          <SectionTitle>{t('profile.notifications')}</SectionTitle>
          {isIosSafari() && !isStandalonePwa() ? (
            <div className="rounded-xl bg-ocean-light px-4 py-3 flex items-start gap-2.5">
              <Share className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-xs text-primary" style={{ fontFamily: 'Jost, sans-serif' }}>
                {t('profile.iosNotifHint')}
              </p>
            </div>
          ) : pushPermission === 'unsupported' ? (
            <p className="text-xs text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif' }}>
              {t('profile.notifUnsupported')}
            </p>
          ) : pushPermission === 'denied' ? (
            <p className="text-xs text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif' }}>
              {t('profile.notifDenied')}
            </p>
          ) : pushSubscribed ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm flex items-center gap-2" style={{ fontFamily: 'Jost, sans-serif' }}>
                <Bell className="h-4 w-4 text-primary" /> {t('profile.notifEnabled')}
              </p>
              <button onClick={handleDisablePush} disabled={pushLoading} className="btn-ghost py-2 px-3 text-sm flex items-center gap-1.5 disabled:opacity-50">
                <BellOff className="h-4 w-4" /> {t('profile.notifDisable')}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif' }}>
                {t('profile.notifDesc')}
              </p>
              <button onClick={handleEnablePush} disabled={pushLoading} className="btn-ocean py-2 px-3 text-sm flex items-center gap-1.5 flex-shrink-0 disabled:opacity-50">
                <Bell className="h-4 w-4" /> {t('profile.notifEnable')}
              </button>
            </div>
          )}
        </div>

        {/* Langue */}
        <div className="card-premium p-5">
          <SectionTitle>{t('profile.language')}</SectionTitle>
          <p className="text-xs text-muted-foreground mb-3" style={{ fontFamily: 'Jost, sans-serif' }}>
            {t('profile.languageDesc')}
          </p>
          <div className="flex gap-2">
            {(['fr', 'en'] as const).map(lang => (
              <button key={lang} onClick={() => handleLanguageChange(lang)}
                className={cn(
                  'flex-1 rounded-full py-2.5 text-sm font-medium transition-all duration-200 border flex items-center justify-center gap-1.5',
                  i18n.language === lang
                    ? 'border-primary bg-primary text-white shadow-md shadow-primary/20'
                    : 'border-border bg-background hover:bg-secondary text-foreground'
                )}
                style={{ fontFamily: 'Jost, sans-serif' }}>
                <Languages className="h-3.5 w-3.5" />
                {lang === 'fr' ? t('profile.french') : t('profile.english')}
              </button>
            ))}
          </div>
        </div>

        {/* Parrainage */}
        <div className="card-premium p-5">
          <SectionTitle>{t('profile.referralTitle')}</SectionTitle>
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

        {/* Liens & session */}
        <div className="card-premium p-5 space-y-1">
          {isAdmin && (
            <Link to="/admin"
              className="flex items-center justify-between rounded-xl px-3 py-3 text-sm text-destructive hover:bg-destructive/5 transition-colors"
              style={{ fontFamily: 'Jost, sans-serif' }}>
              <span className="flex items-center gap-2.5 font-medium">
                <ShieldCheck className="h-4 w-4" /> {t('profile.moderation')}
              </span>
              {pendingReports > 0 && (
                <span className="h-5 min-w-[20px] px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
                  {pendingReports > 9 ? '9+' : pendingReports}
                </span>
              )}
            </Link>
          )}
          <Link to="/about"
            className="flex items-center gap-2.5 rounded-xl px-3 py-3 text-sm hover:bg-secondary transition-colors"
            style={{ fontFamily: 'Jost, sans-serif' }}>
            <Info className="h-4 w-4 text-muted-foreground" /> {t('profile.about')}
          </Link>
          <button onClick={() => { signOut(); navigate('/'); }}
            className="w-full flex items-center gap-2.5 rounded-xl px-3 py-3 text-sm text-left hover:bg-secondary transition-colors"
            style={{ fontFamily: 'Jost, sans-serif' }}>
            <LogOut className="h-4 w-4 text-muted-foreground" /> {t('profile.logout')}
          </button>
        </div>

        {/* Zone de danger : suppression de compte (obligation RGPD) */}
        <div className="card-premium p-5 border border-destructive/20">
          <h3 className="font-display text-lg font-semibold mb-1 text-destructive">{t('profile.dangerZone')}</h3>
          <p className="text-xs text-muted-foreground mb-4" style={{ fontFamily: 'Jost, sans-serif' }}>
            {t('profile.deleteAccountDesc')}
          </p>
          <DeleteAccountButton />
        </div>

        <div className="h-4" />
      </div>
      <BottomNav />
    </div>
  );
}
