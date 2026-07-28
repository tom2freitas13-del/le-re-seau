import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Users, MapPin, ExternalLink } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/integrations/supabase/client';
import { useSeo } from '@/lib/useSeo';
import { findCityBySlug, CITY_CONTENT } from '@/lib/cityContent';
import BottomNav from '@/components/BottomNav';
import NotFound from '@/pages/NotFound';

interface NearbyPoi {
  id: string;
  name: string;
  category: string;
  description: string;
}

const CATEGORY_EMOJI: Record<string, string> = {
  surf: '🏄', apero: '🍹', sport: '🎾', plage: '🏖️', velo: '🚴',
};

export default function CityPage() {
  const { city } = useParams<{ city: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const cityData = city ? findCityBySlug(city) : undefined;
  const [memberCount, setMemberCount] = useState(0);
  const [pois, setPois] = useState<NearbyPoi[]>([]);

  useEffect(() => {
    if (!cityData) return;
    supabase.from('city_member_counts').select('member_count').eq('city', cityData.name).maybeSingle()
      .then(({ data }) => setMemberCount(data?.member_count || 0));
    supabase.from('points_of_interest').select('id, name, category, description')
      .ilike('address', `%${cityData.name}%`).limit(4)
      .then(({ data }) => setPois(data || []));
  }, [cityData]);

  const tagline = cityData ? t(`cityVillages.${cityData.slug}.tagline`) : '';
  const description = cityData ? t(`cityVillages.${cityData.slug}.description`) : '';

  useSeo(
    cityData ? t('cityPage.metaTitle', { city: cityData.name }) : 'Le Ré-seau',
    cityData ? t('cityPage.metaDescription', { tagline, city: cityData.name }) : ''
  );

  if (!cityData) return <NotFound />;

  const otherCities = CITY_CONTENT.filter(c => c.slug !== cityData.slug);

  return (
    <div className="min-h-screen pb-28 bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-xl md:text-2xl font-semibold">{cityData.name}</h1>
        </div>
      </div>

      {/* Hero */}
      <div className="relative h-[38vh] min-h-[260px] overflow-hidden"
        style={{ background: 'linear-gradient(160deg, hsl(196 55% 28%) 0%, hsl(199 60% 18%) 55%, hsl(200 65% 12%) 100%)' }}>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 text-white">
          <span className="text-5xl mb-3">{cityData.emoji}</span>
          <h2 className="font-display text-3xl md:text-4xl font-semibold">{cityData.name}</h2>
          <p className="text-sm md:text-base mt-2 opacity-90 max-w-md">{tagline}</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        {/* Description */}
        <p className="text-foreground/90 leading-relaxed" style={{ fontFamily: 'Jost, sans-serif', lineHeight: 1.7 }}>
          {description}
        </p>

        {memberCount > 0 && (
          <div className="card-premium p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-ocean-light flex items-center justify-center flex-shrink-0">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm" style={{ fontFamily: 'Jost, sans-serif' }}>
              {t('cityPage.memberCount', { count: memberCount, city: cityData.name })}
            </p>
          </div>
        )}

        {/* POIs à proximité */}
        {pois.length > 0 && (
          <div>
            <h3 className="section-title mb-4 text-xl">{t('cityPage.nearbyTitle')}</h3>
            <div className="space-y-3">
              {pois.map(poi => (
                <div key={poi.id} className="card-premium p-4 flex gap-3">
                  <span className="text-2xl flex-shrink-0">{CATEGORY_EMOJI[poi.category] || '📍'}</span>
                  <div>
                    <h4 className="font-medium text-sm mb-0.5">{poi.name}</h4>
                    <p className="text-xs text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif', lineHeight: 1.5 }}>
                      {poi.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="rounded-3xl p-8 text-center" style={{ background: 'linear-gradient(135deg, hsl(196 60% 22%), hsl(200 65% 15%))' }}>
          <h3 className="font-display text-2xl font-semibold text-white mb-2">{t('cityPage.ctaTitle', { city: cityData.name })}</h3>
          <p className="text-white/70 text-sm mb-6" style={{ fontFamily: 'Jost, sans-serif' }}>{t('cityPage.ctaSubtitle')}</p>
          <button onClick={() => navigate(user ? `/social?city=${encodeURIComponent(cityData.name)}` : '/auth')}
            className="bg-white text-primary rounded-full px-8 py-3.5 font-semibold text-sm tracking-wide hover:shadow-xl transition-all hover:-translate-y-0.5"
            style={{ fontFamily: 'Jost, sans-serif' }}>
            {user ? t('cityPage.ctaJoined') : t('cityPage.ctaJoin')}
          </button>
        </div>

        {/* Autres communes — maillage interne pour le SEO + navigation */}
        <div>
          <h3 className="text-xs uppercase tracking-widest text-muted-foreground text-center mb-4" style={{ fontFamily: 'Jost, sans-serif' }}>
            {t('cityPage.otherCitiesTitle')}
          </h3>
          <div className="flex flex-wrap justify-center gap-2">
            {otherCities.map(c => (
              <Link key={c.slug} to={`/ile-de-re/${c.slug}`}
                className="pill bg-secondary text-foreground hover:bg-ocean-light hover:text-primary transition-colors flex items-center gap-1">
                {c.emoji} {c.name}
              </Link>
            ))}
          </div>
        </div>

        <Link to="/map" className="flex items-center justify-center gap-1.5 text-sm text-primary hover:underline">
          <MapPin className="h-4 w-4" /> {t('cityPage.viewMap')} <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      {user && <BottomNav />}
    </div>
  );
}
