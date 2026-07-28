import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Info, Check } from 'lucide-react';
import { COMMUNITY_LEVELS, POINT_ACTIONS, getCommunityLevel } from '@/lib/gamification';

interface GamificationInfoModalProps {
  totalPoints?: number;
  onClose: () => void;
}

// Fenêtre d'explication de la gamification (niveaux + points) — ouverte
// depuis le lien sous la barre de progression du niveau (Profile.tsx).
export function GamificationInfoModal({ totalPoints = 0, onClose }: GamificationInfoModalProps) {
  const { t } = useTranslation();
  const currentLevelKey = getCommunityLevel(totalPoints).key;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="bg-card rounded-3xl p-6 w-full max-w-sm space-y-5 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold flex items-center gap-2">
            <Info className="h-5 w-5 text-primary" /> {t('gamificationInfo.title')}
          </h2>
          <button onClick={onClose} className="min-h-10 min-w-10 flex items-center justify-center -mr-2 text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2" style={{ fontFamily: 'Jost, sans-serif' }}>
            {t('gamificationInfo.howToEarnTitle')}
          </h3>
          <div className="space-y-2">
            {POINT_ACTIONS.map(action => (
              <div key={action.reason} className="flex items-center gap-3 rounded-xl bg-secondary px-3 py-2.5">
                <span className="text-xl flex-shrink-0">{action.emoji}</span>
                <span className="flex-1 text-sm" style={{ fontFamily: 'Jost, sans-serif' }}>
                  {t(`gamificationInfo.actions.${action.reason}`)}
                </span>
                <span className="text-sm font-semibold text-primary flex-shrink-0">+{action.points}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2" style={{ fontFamily: 'Jost, sans-serif' }}>
            {t('gamificationInfo.ranksTitle')}
          </h3>
          <div className="space-y-2">
            {COMMUNITY_LEVELS.map(level => {
              const isCurrent = level.key === currentLevelKey;
              return (
                <div key={level.key}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border ${isCurrent ? 'border-primary bg-ocean-light' : 'border-transparent bg-secondary'}`}>
                  <span className="text-xl flex-shrink-0">{level.emoji}</span>
                  <span className={`flex-1 text-sm ${isCurrent ? 'font-semibold text-primary' : ''}`} style={{ fontFamily: 'Jost, sans-serif' }}>
                    {t(`communityLevels.${level.key}`)}
                  </span>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {t('gamificationInfo.fromPoints', { count: level.minPoints })}
                  </span>
                  {isCurrent && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// Petit lien texte qui ouvre la fenêtre — placé sous la barre de progression
// du niveau, pour rester discret tout en restant accessible.
export function GamificationInfoLink({ totalPoints }: { totalPoints: number }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}
        className="text-xs text-primary hover:underline flex items-center gap-1 mt-2"
        style={{ fontFamily: 'Jost, sans-serif' }}>
        <Info className="h-3 w-3" /> {t('gamificationInfo.linkLabel')}
      </button>
      {open && <GamificationInfoModal totalPoints={totalPoints} onClose={() => setOpen(false)} />}
    </>
  );
}
