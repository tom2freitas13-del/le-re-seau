import { useTranslation } from 'react-i18next';

interface ConfirmDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirming?: boolean;
}

/**
 * Remplace window.confirm() pour les suppressions (message, post,
 * commentaire, avis...) : un vrai bouton dans l'UI plutôt que la boîte de
 * dialogue native du navigateur, qui se comporte mal ou passe inaperçue en
 * PWA installée sur iOS.
 */
export default function ConfirmDialog({ message, onConfirm, onCancel, confirming }: ConfirmDialogProps) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center px-4" onClick={onCancel}>
      <div className="bg-card rounded-3xl p-5 w-full max-w-xs space-y-4" onClick={e => e.stopPropagation()}>
        <p className="text-sm text-center" style={{ fontFamily: 'Jost, sans-serif' }}>{message}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} disabled={confirming}
            className="flex-1 rounded-xl py-2.5 text-sm font-medium border border-border hover:bg-secondary transition-colors disabled:opacity-50"
            style={{ fontFamily: 'Jost, sans-serif' }}>
            {t('common.cancel')}
          </button>
          <button onClick={onConfirm} disabled={confirming}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold bg-destructive text-white hover:bg-destructive/90 transition-colors disabled:opacity-50"
            style={{ fontFamily: 'Jost, sans-serif' }}>
            {t('common.delete')}
          </button>
        </div>
      </div>
    </div>
  );
}
