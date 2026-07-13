import { useNavigate } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import BottomNav from '@/components/BottomNav';

export default function LegalNotice() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const handleBack = () => (window.history.length > 1 ? navigate(-1) : navigate('/'));

  return (
    <div className="min-h-screen pb-28 bg-background">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={handleBack} className="text-muted-foreground hover:text-foreground transition-colors" aria-label={t('legalNotice.back')}>
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-2xl font-semibold">{t('legalNotice.title')}</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-8 space-y-6" style={{ fontFamily: 'Jost, sans-serif' }}>
        <p className="text-xs text-muted-foreground">{t('legalNotice.lastUpdated')}</p>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold">{t('legalNotice.publisherTitle')}</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            {t('legalNotice.publisherBody')}
          </p>
          <p className="text-sm text-foreground/80 leading-relaxed">
            {t('legalNotice.publicationDirector')}
          </p>
          <p className="text-sm text-foreground/80 leading-relaxed">
            {t('legalNotice.contact')}{' '}
            <a href="mailto:hectordegiorgio@gmail.com" className="text-primary underline">hectordegiorgio@gmail.com</a>
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold">{t('legalNotice.hostingTitle')}</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            {t('legalNotice.hostingBody')}
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold">{t('legalNotice.ipTitle')}</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            {t('legalNotice.ipBody')}
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold">{t('legalNotice.dataTitle')}</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            <Trans i18nKey="legalNotice.dataBody" components={{ link: <a href="/privacy" className="text-primary underline" /> }} />
          </p>
        </section>
      </div>
      <BottomNav />
    </div>
  );
}
