import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useTranslation, Trans } from 'react-i18next';
import { Trash2, AlertTriangle } from 'lucide-react';

/**
 * Bouton de suppression définitive de compte (obligation RGPD).
 * Demande une double confirmation puis appelle l'Edge Function
 * "delete-account" qui supprime le compte d'authentification ;
 * toutes les données liées (profil, messages, posts, etc.) sont
 * supprimées automatiquement par cascade dans la base.
 */
export default function DeleteAccountButton() {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const confirmWord = t('deleteAccount.confirmWord');

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error(t('deleteAccount.sessionError'));

      const { data, error } = await supabase.functions.invoke('delete-account', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || t('deleteAccount.unknownError'));
      }

      toast.success(t('deleteAccount.success'));
      await signOut();
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || t('deleteAccount.genericError'));
      setDeleting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm text-destructive hover:text-destructive/80 transition-colors"
        style={{ fontFamily: 'Jost, sans-serif' }}>
        <Trash2 className="h-4 w-4" /> {t('deleteAccount.button')}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => !deleting && setOpen(false)}>
          <div className="bg-card rounded-3xl p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <h2 className="font-display text-xl font-semibold">{t('deleteAccount.confirmTitle')}</h2>
            </div>
            <p className="text-sm text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif', lineHeight: 1.6 }}>
              <Trans i18nKey="deleteAccount.confirmBody" components={{ strong: <strong /> }} />
            </p>
            <p className="text-sm" style={{ fontFamily: 'Jost, sans-serif' }}>
              <Trans i18nKey="deleteAccount.typeToConfirm" values={{ word: confirmWord }} components={{ strong: <strong /> }} />
            </p>
            <input
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder={confirmWord}
              className="w-full px-4 py-3 rounded-xl border border-destructive/40 bg-background text-sm outline-none focus:ring-2 focus:ring-destructive/20"
              style={{ fontFamily: 'Jost, sans-serif' }}
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setOpen(false); setConfirmText(''); }}
                disabled={deleting}
                className="flex-1 btn-ghost py-3">
                {t('deleteAccount.cancel')}
              </button>
              <button
                onClick={handleDelete}
                disabled={confirmText !== confirmWord || deleting}
                className="flex-1 rounded-full bg-destructive text-white py-3 font-semibold text-sm disabled:opacity-40">
                {deleting ? t('deleteAccount.deleting') : t('deleteAccount.confirmButton')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
