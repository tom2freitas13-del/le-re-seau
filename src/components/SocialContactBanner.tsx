import { useTranslation } from 'react-i18next';
import { Instagram } from 'lucide-react';

const INSTAGRAM_URL = 'https://www.instagram.com/re_seau.idr';

export default function SocialContactBanner() {
  const { t } = useTranslation();

  return (
    
      href={INSTAGRAM_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-2xl px-5 py-4 flex items-center gap-3 hover:shadow-lg transition-all"
      style={{ background: 'linear-gradient(135deg, hsl(196 60% 22%), hsl(200 65% 15%))' }}
    >
      <span className="text-2xl flex-shrink-0">📸</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white" style={{ fontFamily: 'Jost, sans-serif' }}>
          {t('home.socialContactTitle')}
        </p>
        <p className="text-xs text-white/70" style={{ fontFamily: 'Jost, sans-serif' }}>
          {t('home.socialContactSubtitle')}
        </p>
      </div>
      <span className="bg-white text-primary rounded-full px-4 py-2 text-xs font-semibold flex items-center gap-1.5 flex-shrink-0">
        <Instagram className="h-3.5 w-3.5" /> {t('home.socialContactCta')}
      </span>
    </a>
  );
}
