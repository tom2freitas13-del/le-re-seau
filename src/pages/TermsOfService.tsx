import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import BottomNav from '@/components/BottomNav';

export default function TermsOfService() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const handleBack = () => (window.history.length > 1 ? navigate(-1) : navigate('/'));

  const s2Items = t('terms.s2Items', { returnObjects: true }) as string[];
  const s3Items = t('terms.s3Items', { returnObjects: true }) as string[];

  return (
    <div className="min-h-screen pb-28 bg-background">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={handleBack} className="text-muted-foreground hover:text-foreground transition-colors" aria-label={t('terms.back')}>
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-2xl font-semibold">{t('terms.title')}</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-8 space-y-6" style={{ fontFamily: 'Jost, sans-serif' }}>
        <p className="text-xs text-muted-foreground">{t('terms.lastUpdated')}</p>

        <p className="text-sm text-foreground/80 leading-relaxed">
          {t('terms.intro')}
        </p>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold">{t('terms.s1Title')}</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            {t('terms.s1Body')}
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold">{t('terms.s2Title')}</h2>
          <ul className="space-y-1.5 text-sm text-foreground/80 leading-relaxed list-disc pl-5">
            {s2Items.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold">{t('terms.s3Title')}</h2>
          <ul className="space-y-1.5 text-sm text-foreground/80 leading-relaxed list-disc pl-5">
            {s3Items.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold">{t('terms.s4Title')}</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            {t('terms.s4Body')}
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold">{t('terms.s5Title')}</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            {t('terms.s5Body1')}
          </p>
          <p className="text-sm text-foreground/80 leading-relaxed">
            {t('terms.s5Body2')}
          </p>
          <p className="text-sm text-foreground/80 leading-relaxed">
            {t('terms.s5Body3')}
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold">{t('terms.s6Title')}</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            {t('terms.s6Body')}
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold">{t('terms.s7Title')}</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            {t('terms.s7Body')}
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold">{t('terms.s8Title')}</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            {t('terms.s8Body')}
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold">{t('terms.s9Title')}</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            {t('terms.s9Body')}
          </p>
        </section>
      </div>
      <BottomNav />
    </div>
  );
}
