import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Calendar, Gift, Users2, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePresence } from '@/lib/presence-context';
import { ACTIVITY_CATEGORIES } from '@/lib/constants';

interface TodayActivity {
  id: string;
  title: string;
  category: string | null;
  location: string | null;
  activity_time: string | null;
}

interface GoodDeal {
  id: string;
  content: string;
}

interface Weather {
  temp: number;
  min: number;
  max: number;
  emoji: string;
}

// Île de Ré (centre approximatif, Saint-Martin-de-Ré) — précis au village
// près n'a pas d'intérêt ici, c'est une météo "à l'échelle de l'île".
const ILE_DE_RE_LAT = 46.2036;
const ILE_DE_RE_LON = -1.3623;

// Codes météo WMO (norme utilisée par Open-Meteo) — juste de quoi choisir un
// emoji parlant, pas besoin de tous les codes possibles.
function weatherEmoji(code: number): string {
  if (code === 0) return '☀️';
  if (code <= 2) return '🌤️';
  if (code === 3) return '☁️';
  if (code === 45 || code === 48) return '🌫️';
  if (code >= 51 && code <= 67) return '🌦️';
  if (code >= 71 && code <= 77) return '🌨️';
  if (code >= 80 && code <= 82) return '🌧️';
  if (code >= 95) return '⛈️';
  return '🌤️';
}

// Point d'entrée voulu par le prompt produit : "quand quelqu'un ouvre
// l'appli" (l'accueil), un résumé de ce qui se passe sur l'île aujourd'hui —
// regroupe des données déjà existantes (activités, forum, présence) plutôt
// que de créer un nouveau système de contenu.
export default function TodayOnIsland() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { onlineCount } = usePresence();
  const [weather, setWeather] = useState<Weather | null>(null);
  const [activities, setActivities] = useState<TodayActivity[]>([]);
  const [goodDeals, setGoodDeals] = useState<GoodDeal[]>([]);

  useEffect(() => {
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${ILE_DE_RE_LAT}&longitude=${ILE_DE_RE_LON}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=Europe%2FParis`)
      .then(res => res.json())
      .then(json => {
        if (json?.current && json?.daily) {
          setWeather({
            temp: Math.round(json.current.temperature_2m),
            min: Math.round(json.daily.temperature_2m_min[0]),
            max: Math.round(json.daily.temperature_2m_max[0]),
            emoji: weatherEmoji(json.current.weather_code),
          });
        }
      })
      .catch(() => { /* météo indisponible : la carte s'affiche simplement sans, pas bloquant */ });

    const today = new Date().toISOString().slice(0, 10);
    supabase.from('activities').select('id, title, category, location, activity_time')
      .eq('activity_date', today).order('activity_time', { ascending: true }).limit(5)
      .then(({ data }) => setActivities(data || []));

    supabase.from('forum_posts').select('id, content').eq('tag', 'bon_plan')
      .order('created_at', { ascending: false }).limit(3)
      .then(({ data }) => setGoodDeals(data || []));
  }, []);

  return (
    <div className="card-premium p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">{t('todayOnIsland.title')}</h2>
        {weather && (
          <span className="text-sm flex items-center gap-1.5" style={{ fontFamily: 'Jost, sans-serif' }}>
            {weather.emoji} {weather.temp}°C
            <span className="text-muted-foreground text-xs">({weather.min}°/{weather.max}°)</span>
          </span>
        )}
      </div>

      <button onClick={() => navigate('/social')} className="w-full flex items-center gap-2.5 text-sm text-left">
        <Users2 className="h-4 w-4 text-green-500 flex-shrink-0" />
        <span style={{ fontFamily: 'Jost, sans-serif' }}>{t('todayOnIsland.onlineNow', { count: onlineCount })}</span>
      </button>

      <div>
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ fontFamily: 'Jost, sans-serif' }}>
          <Calendar className="h-3.5 w-3.5" /> {t('todayOnIsland.activitiesToday', { count: activities.length })}
        </h3>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif' }}>{t('todayOnIsland.noActivities')}</p>
        ) : (
          <div className="space-y-1.5">
            {activities.map(a => {
              const cat = ACTIVITY_CATEGORIES.find(c => c.value === a.category);
              return (
                <button key={a.id} onClick={() => navigate(`/activities/${a.id}`)}
                  className="w-full flex items-center gap-2 text-sm text-left hover:text-primary transition-colors">
                  <span className="flex-shrink-0">{cat?.emoji || '✨'}</span>
                  <span className="flex-1 truncate" style={{ fontFamily: 'Jost, sans-serif' }}>{a.title}</span>
                  {a.activity_time && <span className="text-xs text-muted-foreground flex-shrink-0">{a.activity_time}</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {goodDeals.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ fontFamily: 'Jost, sans-serif' }}>
            <Gift className="h-3.5 w-3.5" /> {t('todayOnIsland.goodDeals')}
          </h3>
          <div className="space-y-1.5">
            {goodDeals.map(p => (
              <p key={p.id} className="text-sm text-muted-foreground line-clamp-1" style={{ fontFamily: 'Jost, sans-serif' }}>
                🎁 {p.content}
              </p>
            ))}
          </div>
        </div>
      )}

      <button onClick={() => navigate('/map')} className="flex items-center justify-center gap-1.5 text-xs text-primary hover:underline w-full pt-1">
        <MapPin className="h-3.5 w-3.5" /> {t('todayOnIsland.viewMap')}
      </button>
    </div>
  );
}
