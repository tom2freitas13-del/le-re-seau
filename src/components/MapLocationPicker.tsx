import { useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { X, Loader2 } from 'lucide-react';
import { reverseGeocode } from '@/lib/geocoding';
import ErrorBoundary from '@/components/ErrorBoundary';

const ILE_DE_RE_CENTER: [number, number] = [46.1833, -1.4167];

const pinIcon = L.divIcon({
  className: 'custom-map-marker',
  html: `<div style="background:#2b8fb3;width:36px;height:36px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);border:2px solid white;"><span style="transform:rotate(45deg);font-size:16px;">📍</span></div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});

interface MapLocationPickerProps {
  initialPosition?: { lat: number; lng: number } | null;
  onConfirm: (label: string, lat: number, lng: number) => void;
  onClose: () => void;
}

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) { onPick(e.latlng.lat, e.latlng.lng); },
  });
  return null;
}

/**
 * Modale plein écran : l'utilisateur touche/clique un point sur la carte
 * pour placer un marqueur exactement à cet endroit, sans passer par la
 * recherche d'adresse. On tente un géocodage inverse pour proposer un nom
 * de lieu lisible, avec repli sur les coordonnées brutes si ça échoue.
 */
export default function MapLocationPicker({ initialPosition, onConfirm, onClose }: MapLocationPickerProps) {
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(initialPosition || null);
  const [label, setLabel] = useState('');
  const [resolving, setResolving] = useState(false);
  const mapKey = useRef(`picker-map-${Date.now()}`).current;

  const handlePick = async (lat: number, lng: number) => {
    setPicked({ lat, lng });
    setResolving(true);
    const found = await reverseGeocode(lat, lng);
    setLabel(found || `Point sélectionné (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
    setResolving(false);
  };

  const handleConfirm = () => {
    if (!picked) return;
    onConfirm(label || `Point sélectionné (${picked.lat.toFixed(4)}, ${picked.lng.toFixed(4)})`, picked.lat, picked.lng);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border/50 px-4 py-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Touchez la carte pour placer le lieu</h2>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 relative">
        <ErrorBoundary fallbackTitle="La carte n'a pas pu s'afficher." fallbackMessage="Rechargez la page pour réessayer.">
          <MapContainer key={mapKey} center={picked ? [picked.lat, picked.lng] : ILE_DE_RE_CENTER} zoom={13}
            style={{ position: 'absolute', inset: 0, zIndex: 0 }} scrollWheelZoom>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ClickHandler onPick={handlePick} />
            {picked && <Marker position={[picked.lat, picked.lng]} icon={pinIcon} />}
          </MapContainer>
        </ErrorBoundary>
      </div>

      <div className="sticky bottom-0 bg-background/95 backdrop-blur-md border-t border-border/50 px-4 py-3 safe-area-bottom">
        {picked ? (
          <p className="text-sm mb-2 flex items-center gap-1.5" style={{ fontFamily: 'Jost, sans-serif' }}>
            {resolving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : '📍'} {resolving ? 'Recherche du nom du lieu...' : label}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground mb-2" style={{ fontFamily: 'Jost, sans-serif' }}>
            Touchez un endroit sur la carte
          </p>
        )}
        <button onClick={handleConfirm} disabled={!picked || resolving}
          className="btn-ocean w-full py-3 text-sm font-semibold disabled:opacity-50">
          Valider ce lieu
        </button>
      </div>
    </div>
  );
}
