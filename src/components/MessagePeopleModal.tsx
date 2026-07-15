import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { avatarFallbackInitial } from '@/lib/constants';

interface Person {
  user_id: string;
  name: string | null;
  photo_url: string | null;
}

interface MessagePeopleModalProps {
  title: string;
  people: Person[] | null;
  onClose: () => void;
}

/**
 * Petite modale réutilisée pour afficher "qui a aimé" et "qui a vu" un
 * message (discussion de groupe ou salon thématique) — même style que
 * ReportModal.
 */
export default function MessagePeopleModal({ title, people, onClose }: MessagePeopleModalProps) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="bg-card rounded-3xl p-6 w-full max-w-sm space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-72 overflow-y-auto space-y-1 -mx-1">
          {people === null ? (
            <p className="text-sm text-muted-foreground text-center py-4" style={{ fontFamily: 'Jost, sans-serif' }}>
              {t('groupChat.loading')}
            </p>
          ) : people.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4" style={{ fontFamily: 'Jost, sans-serif' }}>
              {t('groupChat.noOne')}
            </p>
          ) : (
            people.map(p => (
              <div key={p.user_id} className="flex items-center gap-3 px-1 py-1.5">
                <div className="h-8 w-8 rounded-full bg-ocean-light flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {p.photo_url ? (
                    <img src={p.photo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs font-semibold text-primary">{avatarFallbackInitial(p.name)}</span>
                  )}
                </div>
                <span className="text-sm" style={{ fontFamily: 'Jost, sans-serif' }}>{p.name || t('groupChat.defaultUser')}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
