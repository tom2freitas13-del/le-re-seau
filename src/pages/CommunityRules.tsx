import { useNavigate } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { ArrowLeft, Flag, ShieldAlert } from 'lucide-react';
import BottomNav from '@/components/BottomNav';

export default function CommunityRules() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const handleBack = () => (window.history.length > 1 ? navigate(-1) : navigate('/'));

  const forbiddenItems = t('communityRules.forbiddenItems', { returnObjects: true }) as string[];

  return (
    <div className="min-h-screen pb-28 bg-background">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={handleBack} className="text-muted-foreground hover:text-foreground transition-colors" aria-label={t('communityRules.back')}>
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-2xl font-semibold">{t('communityRules.title')}</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-8 space-y-6" style={{ fontFamily: 'Jost, sans-serif' }}>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {t('communityRules.intro1')}
        </p>

        <p className="text-sm text-muted-foreground leading-relaxed">
          {t('communityRules.intro2')}
        </p>

        <div className="card-premium p-5">
          <h2 className="font-display text-xl font-semibold mb-3 flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" /> {t('communityRules.forbiddenTitle')}
          </h2>
          <ul className="space-y-2 text-sm text-foreground/80 leading-relaxed list-disc pl-5">
            {forbiddenItems.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </div>

        <div className="card-premium p-5">
          <h2 className="font-display text-xl font-semibold mb-3 flex items-center gap-2">
            <Flag className="h-5 w-5 text-primary" /> {t('communityRules.moderationTitle')}
          </h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            {t('communityRules.moderationBody')}
          </p>
        </div>

        <p className="text-xs text-muted-foreground text-center pt-2">
          <Trans i18nKey="communityRules.fullRules" components={{ link: <a href="/terms" className="text-primary underline" /> }} />
        </p>
      </div>
      <BottomNav />
    </div>
  );
}
