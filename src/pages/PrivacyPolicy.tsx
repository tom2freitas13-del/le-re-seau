import { useNavigate } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import BottomNav from '@/components/BottomNav';

export default function PrivacyPolicy() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const handleBack = () => (window.history.length > 1 ? navigate(-1) : navigate('/'));

  const dataItems = t('privacy.dataItems', { returnObjects: true }) as string[];
  const purposeItems = t('privacy.purposeItems', { returnObjects: true }) as string[];

  return (
    <div className="min-h-screen pb-28 bg-background">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={handleBack} className="text-muted-foreground hover:text-foreground transition-colors" aria-label={t('privacy.back')}>
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-2xl font-semibold">{t('privacy.title')}</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-8 space-y-6" style={{ fontFamily: 'Jost, sans-serif' }}>
        <p className="text-xs text-muted-foreground">{t('privacy.lastUpdated')}</p>

        <p className="text-sm text-foreground/80 leading-relaxed">
          {t('privacy.intro')}
        </p>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold">{t('privacy.dataTitle')}</h2>
          <ul className="space-y-1.5 text-sm text-foreground/80 leading-relaxed list-disc pl-5">
            {dataItems.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold">{t('privacy.purposeTitle')}</h2>
          <ul className="space-y-1.5 text-sm text-foreground/80 leading-relaxed list-disc pl-5">
            {purposeItems.map((item, i) => <li key={i}>{item}</li>)}
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold">{t('privacy.retentionTitle')}</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            {t('privacy.retentionBody')}
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold">{t('privacy.hostingTitle')}</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            {t('privacy.hostingBody')}
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold">{t('privacy.rightsTitle')}</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            {t('privacy.rightsIntro')}
          </p>
          <ul className="space-y-1.5 text-sm text-foreground/80 leading-relaxed list-disc pl-5">
            <li>{t('privacy.rightsItem1')}</li>
            <li>{t('privacy.rightsItem2')}</li>
            <li>{t('privacy.rightsItem3')}</li>
            <li>{t('privacy.rightsItem4')}</li>
            <li>{t('privacy.rightsItem5')}</li>
            <li>
              <Trans i18nKey="privacy.rightsItem6" components={{ link: <a href="https://www.cnil.fr" target="_blank" rel="noreferrer" className="text-primary underline" /> }} />
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold">{t('privacy.contactTitle')}</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            {t('privacy.contactBody')}{' '}
            <a href="mailto:hectordegiorgio@gmail.com" className="text-primary underline">hectordegiorgio@gmail.com</a>
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold">{t('privacy.cookiesTitle')}</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            {t('privacy.cookiesBody')}
          </p>
        </section>
      </div>
      <BottomNav />
    </div>
  );
}
