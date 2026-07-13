import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation, Trans } from 'react-i18next';
import { useAuth } from '@/lib/auth-context';
import { Eye, EyeOff, Waves } from 'lucide-react';

// Fond en dégradé CSS plutôt qu'une photo stock — fiable à 100%, pas de risque
// d'afficher une image qui ne correspond pas à son contexte.

export default function Auth() {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => { if (user) navigate('/profile'); }, [user, navigate]);

  // BUG FIX (#1) : Quand l'utilisateur clique "Deny" sur le consentement Google,
  // Supabase redirige vers cette page avec un paramètre d'erreur dans l'URL
  // (soit en query string, soit dans le hash). Sans ce code, l'appli plantait
  // car elle essayait de traiter une session inexistante.
  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const error = search.get('error') || hash.get('error');
    const errorDescription = search.get('error_description') || hash.get('error_description');

    if (error) {
      if (error === 'access_denied') {
        toast.error(t('auth.googleCancelled'));
      } else {
        toast.error(errorDescription || t('auth.oauthGenericError'));
      }
      // On nettoie l'URL pour ne pas re-déclencher le message au refresh
      window.history.replaceState({}, document.title, '/auth');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLogin && !acceptedTerms) {
      toast.error(t('auth.acceptTermsError'));
      return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success(t('auth.loginSuccess'));
        navigate('/social');
      } else {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
        if (error) throw error;
        toast.success(t('auth.signupSuccess'));
        navigate('/profile');
      }
    } catch (error: any) {
      toast.error(error.message || t('auth.genericError'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + '/auth' },
      });
      // Si error est défini ici, c'est un problème de configuration (avant la redirection).
      // Le refus de l'utilisateur ("Deny") est géré plus tard par le useEffect ci-dessus,
      // au retour sur cette page.
      if (error) {
        toast.error(t('auth.googleError'));
        setGoogleLoading(false);
      }
      // Si pas d'erreur, le navigateur est redirigé vers Google — pas besoin de faire autre chose ici.
    } catch {
      toast.error(t('auth.googleError'));
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, hsl(196 55% 28%) 0%, hsl(199 60% 18%) 55%, hsl(200 65% 12%) 100%)' }}>
      {/* Photo locale : public/images/auth-bg.jpg — disparaît proprement si absente */}
      <img
        src="/images/auth-bg.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
      />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(10,30,42,0.3), rgba(10,30,42,0.6))' }} />

      <div className="relative flex flex-col items-center justify-center min-h-screen px-5">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-up">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Waves className="h-6 w-6 text-sky-300" />
          </div>
          <h1 className="font-display text-5xl font-bold text-white mb-1" style={{ letterSpacing: '-0.03em', textShadow: '0 2px 20px rgba(0,0,0,0.3)' }}>
            Le Ré-seau
          </h1>
          <p className="text-white/70 text-sm" style={{ fontFamily: 'Jost, sans-serif' }}>
            {isLogin ? t('auth.welcomeBack') : t('auth.joinCommunity')}
          </p>
        </div>

        {/* Card */}
        <div className="w-full max-w-sm glass rounded-3xl p-6 shadow-2xl animate-fade-up anim-d1">
          {/* Google */}
          <button onClick={handleGoogle} disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 rounded-full border border-border/60 bg-white py-3.5 text-sm font-medium text-foreground hover:shadow-md transition-all mb-5 disabled:opacity-60"
            style={{ fontFamily: 'Jost, sans-serif' }}>
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {googleLoading ? t('auth.redirecting') : t('auth.continueWithGoogle')}
          </button>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-border/60" />
            <span className="text-xs text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif' }}>{t('common.or')}</span>
            <div className="flex-1 h-px bg-border/60" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input type="email" placeholder={t('auth.email')} value={email}
              onChange={e => setEmail(e.target.value)} required
              className="w-full px-4 py-3.5 rounded-xl border border-border/60 bg-white/80 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              style={{ fontFamily: 'Jost, sans-serif' }} />
            <div className="relative">
              <input type={showPwd ? 'text' : 'password'} placeholder={t('auth.password')} value={password}
                onChange={e => setPassword(e.target.value)} required minLength={8}
                className="w-full px-4 py-3.5 rounded-xl border border-border/60 bg-white/80 text-sm outline-none focus:ring-2 focus:ring-primary/30 pr-10"
                style={{ fontFamily: 'Jost, sans-serif' }} />
              <button type="button" onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {!isLogin && (
              <p className="text-xs text-muted-foreground -mt-1 px-1" style={{ fontFamily: 'Jost, sans-serif' }}>
                {t('auth.minPassword')}
              </p>
            )}
            {!isLogin && (
              <label className="flex items-start gap-2 text-xs text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif' }}>
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={e => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5"
                  required
                />
                <span>
                  <Trans i18nKey="auth.consent"
                    components={{
                      terms: <Link to="/terms" target="_blank" className="text-primary underline" />,
                      privacy: <Link to="/privacy" target="_blank" className="text-primary underline" />,
                    }} />
                </span>
              </label>
            )}
            <button type="submit" disabled={loading} className="btn-ocean w-full py-4 text-base font-semibold disabled:opacity-60">
              {loading ? '...' : isLogin ? t('auth.login') : t('auth.signup')}
            </button>
          </form>

          <button onClick={() => setIsLogin(!isLogin)}
            className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            style={{ fontFamily: 'Jost, sans-serif' }}>
            {isLogin ? t('auth.noAccount') : t('auth.hasAccount')}
            <span className="text-primary font-medium">{isLogin ? t('auth.signup') : t('auth.login')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
