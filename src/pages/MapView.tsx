import { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BottomNav from '@/components/BottomNav';
import ErrorBoundary from '@/components/ErrorBoundary';
import PoiDetailModal from '@/components/PoiDetailModal';
import { Map as MapIcon, Calendar, MapPin, Users, X, List, Plus, Compass } from 'lucide-react';
import { ACTIVITY_CATEGORIES } from '@/lib/constants';
import { cn } from '@/lib/utils';

// Centre approximatif de l'Île de Ré, utilisé pour le zoom initial de la carte.
const ILE_DE_RE_CENTER: [number, number] = [46.1833, -1.4167];

interface MapActivity {
  id: string;
  title: string;
  category: string | null;
  location: string | null;
  latitude: number;
  longitude: number;
  activity_date: string | null;
  activity_time: string | null;
  participant_count: number;
}

interface Poi {
  id: string;
  name: string;
  category: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  image_url: string | null;
  website_url: string | null;
  route_waypoints: number[][] | null;
}

// Couleur de marqueur par catégorie, cohérente avec le reste de l'appli.
const CATEGORY_COLOR: Record<string, string> = {
  plage: '#2b8fb3',
  velo: '#3f7a5c',
  surf: '#2b8fb3',
  apero: '#b3863f',
  bateau: '#2b8fb3',
  randonnee: '#3f7a5c',
  sport: '#b3863f',
  autre: '#6b7280',
};

const POI_EMOJI: Record<string, string> = {
  surf: '🏄',
  apero: '🍹',
  sport: '🎾',
  plage: '🏖️',
  velo: '🚴',
};

function createMarkerIcon(category: string | null) {
  const color = CATEGORY_COLOR[category || 'autre'] || CATEGORY_COLOR.autre;
  const emoji = ACTIVITY_CATEGORIES.find(c => c.value === category)?.emoji || '📍';
  return L.divIcon({
    className: 'custom-map-marker',
    html: `<div style="background:${color};width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);border:2px solid white;">
             <span style="transform:rotate(45deg);font-size:16px;">${emoji}</span>
           </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
}

// Marqueur rond (pas en goutte) pour distinguer visuellement les spots connus
// des activités créées par les membres.
function createPoiIcon(category: string) {
  const emoji = POI_EMOJI[category] || '📍';
  return L.divIcon({
    className: 'custom-poi-marker',
    html: `<div style="background:#fffdf8;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.35);border:2.5px solid #da9b2f;">
             <span style="font-size:14px;">${emoji}</span>
           </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });
}

/** Force la carte à se redimensionner correctement après le premier rendu (bug fréquent avec Leaflet dans des conteneurs flex/grid). */
function MapResizeFix() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 150);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

// BUG FIX : clé stable via useRef pour éviter "Map container is already initialized"
function LeafletMap({ activities, pois, activeRoute, onSelectActivity, onSelectPoi }: {
  activities: MapActivity[];
  pois: Poi[];
  activeRoute: number[][] | null;
  onSelectActivity: (a: MapActivity) => void;
  onSelectPoi: (p: Poi) => void;
}) {
  const mapKey = useRef(`map-${Date.now()}`).current;
  return (
    <MapContainer key={mapKey} center={ILE_DE_RE_CENTER} zoom={12}
      style={{ position: 'absolute', inset: 0, zIndex: 0 }} scrollWheelZoom>
      <MapResizeFix />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {activeRoute && (
        <Polyline positions={activeRoute as [number, number][]} pathOptions={{ color: '#da9b2f', weight: 4, opacity: 0.85, dashArray: '1 8', lineCap: 'round' }} />
      )}
      {pois.map(p => (
        <Marker key={p.id} position={[p.latitude, p.longitude]}
          icon={createPoiIcon(p.category)}
          eventHandlers={{ click: () => onSelectPoi(p) }} />
      ))}
      {activities.map(a => (
        <Marker key={a.id} position={[a.latitude, a.longitude]}
          icon={createMarkerIcon(a.category)}
          eventHandlers={{ click: () => onSelectActivity(a) }} />
      ))}
    </MapContainer>
  );
}

export default function MapView() {
  const { t, i18n } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activities, setActivities] = useState<MapActivity[]>([]);
  const [pois, setPois] = useState<Poi[]>([]);
  const [showPois, setShowPois] = useState(true);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [selected, setSelected] = useState<MapActivity | null>(null);
  const [selectedPoi, setSelectedPoi] = useState<Poi | null>(null);
  const [activeRoute, setActiveRoute] = useState<number[][] | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/auth'); return; }
    loadActivities();
    loadPois();
  }, [user, authLoading]);

  const loadPois = async () => {
    const { data } = await supabase.from('points_of_interest').select('*');
    if (data) setPois(data as Poi[]);
  };

  const handleSelectPoi = (p: Poi) => {
    setSelectedPoi(p);
    setActiveRoute(p.category === 'velo' && p.route_waypoints ? p.route_waypoints : null);
  };

  const loadActivities = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('activities')
        .select('id, title, category, location, latitude, longitude, activity_date, activity_time')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (data) {
        const { data: parts } = await supabase.from('activity_participants').select('activity_id');
        const counts: Record<string, number> = {};
        (parts || []).forEach(p => { counts[p.activity_id] = (counts[p.activity_id] || 0) + 1; });

        setActivities(data.map(a => ({
          ...a,
          latitude: a.latitude as number,
          longitude: a.longitude as number,
          participant_count: counts[a.id] || 0,
        })));
      }
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(
    () => categoryFilter ? activities.filter(a => a.category === categoryFilter) : activities,
    [activities, categoryFilter]
  );

  const formatDate = (d: string | null) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen pb-28 bg-background flex flex-col">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-2xl bg-ocean-light flex items-center justify-center">
              <MapIcon className="h-5 w-5 text-primary" strokeWidth={1.5} />
            </div>
            <div className="flex-1">
              <h1 className="font-display text-2xl font-semibold">{t('mapView.title')}</h1>
              <p className="text-xs text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif' }}>
                {t('mapView.activityCount', { count: filtered.length })}
              </p>
            </div>
            <button onClick={() => setShowPois(v => !v)} title={t('mapView.togglePois')}
              className={cn('h-10 w-10 rounded-full flex items-center justify-center transition-colors',
                showPois ? 'bg-ocean-light text-primary' : 'bg-secondary text-foreground hover:bg-ocean-light hover:text-primary')}>
              <Compass className="h-4 w-4" />
            </button>
            <button onClick={() => navigate('/activities')} title={t('mapView.viewList')}
              className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-ocean-light hover:text-primary transition-colors">
              <List className="h-4 w-4" />
            </button>
          </div>

          {/* Filtres par catégorie */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button onClick={() => setCategoryFilter(null)}
              className={cn('rounded-full px-3.5 py-1.5 text-xs font-medium transition-all flex-shrink-0',
                !categoryFilter ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground')}
              style={{ fontFamily: 'Jost, sans-serif' }}>
              {t('mapView.all')}
            </button>
            {ACTIVITY_CATEGORIES.map(c => (
              <button key={c.value} onClick={() => setCategoryFilter(categoryFilter === c.value ? null : c.value)}
                className={cn('rounded-full px-3.5 py-1.5 text-xs font-medium transition-all flex-shrink-0',
                  categoryFilter === c.value ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground')}
                style={{ fontFamily: 'Jost, sans-serif' }}>
                {c.emoji} {t(`activityCategories.${c.value}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Carte */}
      <div className="flex-1 relative" style={{ minHeight: '60vh' }}>
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <p className="text-sm text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif' }}>{t('mapView.loadingMap')}</p>
          </div>
        ) : (
          <ErrorBoundary fallbackTitle={t('mapView.mapErrorTitle')} fallbackMessage={t('mapView.mapErrorMessage')}>
            <LeafletMap
              activities={filtered}
              pois={showPois ? pois : []}
              activeRoute={activeRoute}
              onSelectActivity={setSelected}
              onSelectPoi={handleSelectPoi}
            />
          </ErrorBoundary>
        )}

        {!loading && filtered.length === 0 && (!showPois || pois.length === 0) && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 pointer-events-none">
            <div className="text-center px-6">
              <p className="text-4xl mb-3">🗺️</p>
              <p className="text-sm text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif' }}>
                {t('mapView.noneLocated')}
              </p>
            </div>
          </div>
        )}
      </div>

      <button onClick={() => navigate('/activities/new')}
        className="fixed bottom-24 right-4 z-40 h-14 w-14 rounded-full bg-primary text-white shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        style={{ boxShadow: '0 8px 24px rgba(28,94,120,0.4)' }} aria-label={t('mapView.createAria')}>
        <Plus className="h-6 w-6" />
      </button>

      {/* Fiche activité sélectionnée — s'affiche en bas comme une bottom sheet */}
      {selected && (
        <div className="fixed bottom-16 left-0 right-0 z-40 px-4 pb-2 animate-fade-up">
          <div className="max-w-lg mx-auto card-premium p-4 relative shadow-xl">
            <button onClick={() => setSelected(null)} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
            <span className="pill bg-ocean-light text-primary mb-2 inline-block">
              {ACTIVITY_CATEGORIES.find(c => c.value === selected.category)?.emoji}{' '}
              {selected.category ? t(`activityCategories.${selected.category}`) : t('mapView.activity')}
            </span>
            <h3 className="font-display text-lg font-semibold mb-2">{selected.title}</h3>
            <div className="flex flex-wrap gap-2 text-xs mb-3">
              {selected.activity_date && (
                <span className="pill bg-secondary text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> {formatDate(selected.activity_date)}{selected.activity_time ? ` · ${selected.activity_time}` : ''}
                </span>
              )}
              {selected.location && (
                <span className="pill bg-secondary text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {selected.location}
                </span>
              )}
              <span className="pill bg-pine-light text-pine flex items-center gap-1">
                <Users className="h-3 w-3" /> {selected.participant_count}
              </span>
            </div>
            <button onClick={() => navigate('/activities')} className="btn-ocean w-full py-2.5 text-sm">
              {t('mapView.viewActivity')}
            </button>
          </div>
        </div>
      )}

      {selectedPoi && (
        <PoiDetailModal
          poi={selectedPoi}
          onClose={() => { setSelectedPoi(null); setActiveRoute(null); }}
        />
      )}

      <BottomNav />
    </div>
  );
}
