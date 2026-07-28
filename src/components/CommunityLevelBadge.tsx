import { useTranslation } from 'react-i18next';
import { getCommunityLevel, getNextCommunityLevel } from '@/lib/gamification';

interface CommunityLevelBadgeProps {
  totalPoints: number;
  compact?: boolean;
}

export default function CommunityLevelBadge({ totalPoints, compact = false }: CommunityLevelBadgeProps) {
  const { t } = useTranslation();
  const level = getCommunityLevel(totalPoints);
  const label = t(`communityLevels.${level.key}`);

  if (compact) {
    return (
      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-secondary flex-shrink-0 text-[10px]" title={label}>
        {level.emoji}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground flex-shrink-0">
      {level.emoji} {label}
    </span>
  );
}

export function CommunityLevelProgress({ totalPoints }: { totalPoints: number }) {
  const { t } = useTranslation();
  const level = getCommunityLevel(totalPoints);
  const next = getNextCommunityLevel(totalPoints);

  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-2xl">{level.emoji}</span>
        <div>
          <p className="text-sm font-semibold" style={{ fontFamily: 'Jost, sans-serif' }}>{t(`communityLevels.${level.key}`)}</p>
          <p className="text-xs text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif' }}>
            {t('communityLevels.pointsTotal', { count: totalPoints })}
          </p>
        </div>
      </div>
      {next && (
        <div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.min(100, (100 * (totalPoints - level.minPoints)) / (next.minPoints - level.minPoints))}%` }}
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1" style={{ fontFamily: 'Jost, sans-serif' }}>
            {t('communityLevels.nextLevel', { points: next.minPoints - totalPoints, emoji: next.emoji, level: t(`communityLevels.${next.key}`) })}
          </p>
        </div>
      )}
    </div>
  );
}
