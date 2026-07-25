import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { Eye, EyeOff, Waves, KeyRound } from 'lucide-react';
import { translateAuthError } from '@/lib/authErrors';

// Page d'atterrissage du lien "mot de passe oublié" : Supabase ouvre une
// session temporaire via le jeton contenu dans l'URL (detectSessionInUrl),
// puis l'utilisateur choisit son nouveau mot de passe ici. Sans session
// (lien expiré, déjà utilisé, ou visite directe), on explique quoi refaire.
export default function ResetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error(t('resetPassword.mismatch'));
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      toast.error(translateAuthError(t, error));
      return;
    }
    toast.success(t('resetPassword.success'));
    navigate('/social');
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, hsl(196 55% 28%) 0%, hsl(199 60% 18%) 55%, hsl(200 65% 12%) 100%)' }}>
      <div className="relative flex flex-col items-center justify-center min-h-screen px-5">
        <div className="text-center mb-8 animate-fade-up">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Waves className="h-6 w-6 text-sky-300" />
          </div>
          <h1 className="font-display text-4xl font-bold text-white mb-1" style={{ letterSpacing: '-0.03em', textShadow: '0 2px 20px rgba(0,0,0,0.3)' }}>
            {t('resetPassword.title')}
          </h1>
        </div>

        <div className="w-full max-w-sm glass rounded-3xl p-6 shadow-2xl animate-fade-up anim-d1">
          {authLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
            </div>
          ) : !user ? (
            <div className="text-center space-y-4 py-2">
              <KeyRound className="h-10 w-10 text-muted-foreground mx-auto" strokeWidth={1.5} />
              <p className="text-sm text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif', lineHeight: 1.6 }}>
                {t('resetPassword.invalidLink')}
              </p>
              <button onClick={() => navigate('/auth')} className="btn-ocean w-full py-3.5 text-sm font-semibold">
                {t('resetPassword.backToAuth')}
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4" style={{ fontFamily: 'Jost, sans-serif', lineHeight: 1.6 }}>
                {t('resetPassword.subtitle')}
              </p>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="relative">
                  <input type={showPwd ? 'text' : 'password'} placeholder={t('resetPassword.newPassword')} value={password}
                    onChange={e => setPassword(e.target.value)} required minLength={8} autoComplete="new-password"
                    className="w-full px-4 py-3.5 rounded-xl border border-border/60 bg-white/80 text-sm outline-none focus:ring-2 focus:ring-primary/30 pr-10"
                    style={{ fontFamily: 'Jost, sans-serif' }} />
                  <button type="button" onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <input type={showPwd ? 'text' : 'password'} placeholder={t('resetPassword.confirmPassword')} value={confirm}
                  onChange={e => setConfirm(e.target.value)} required minLength={8} autoComplete="new-password"
                  className="w-full px-4 py-3.5 rounded-xl border border-border/60 bg-white/80 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  style={{ fontFamily: 'Jost, sans-serif' }} />
                <p className="text-xs text-muted-foreground px-1" style={{ fontFamily: 'Jost, sans-serif' }}>
                  {t('auth.minPassword')}
                </p>
                <button type="submit" disabled={saving} className="btn-ocean w-full py-4 text-base font-semibold disabled:opacity-60">
                  {saving ? '...' : t('resetPassword.submit')}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
