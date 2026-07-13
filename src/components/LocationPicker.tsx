import { useState, useEffect, useRef } from 'react';
import { MapPin, Search, X, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { searchAddress, GeocodingResult } from '@/lib/geocoding';

interface LocationPickerProps {
  value: string;
  onChange: (label: string, latitude: number | null, longitude: number | null) => void;
  placeholder?: string;
}

/**
 * Champ de recherche d'adresse avec autocomplétion (API officielle gouv.fr).
 * Quand l'utilisateur choisit un résultat, on récupère à la fois le nom du lieu
 * ET ses coordonnées GPS exactes, nécessaires pour l'affichage sur la carte.
 * Si l'utilisateur tape un nom sans sélectionner de suggestion, on garde le texte
 * libre mais sans coordonnées (l'activité n'apparaîtra simplement pas sur la carte).
 */
export default function LocationPicker({ value, onChange, placeholder }: LocationPickerProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setQuery(value); }, [value]);

  const handleInputChange = (text: string) => {
    setQuery(text);
    onChange(text, null, null); // texte libre tant qu'aucune suggestion n'est choisie
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.trim().length < 3) { setResults([]); setOpen(false); return; }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const r = await searchAddress(text);
      setResults(r);
      setOpen(r.length > 0);
      setLoading(false);
    }, 400);
  };

  const handleSelect = (result: GeocodingResult) => {
    setQuery(result.label);
    onChange(result.label, result.latitude, result.longitude);
    setOpen(false);
    setResults([]);
  };

  const handleClear = () => {
    setQuery('');
    onChange('', null, null);
    setResults([]);
    setOpen(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          value={query}
          onChange={e => handleInputChange(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder || t('locationPicker.defaultPlaceholder')}
          className="w-full pl-9 pr-9 py-3.5 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          style={{ fontFamily: 'Jost, sans-serif' }}
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />}
        {!loading && query && (
          <button type="button" onClick={handleClear} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-30 top-full mt-1 w-full bg-card rounded-xl shadow-lg border border-border/50 py-1 max-h-60 overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(r)}
              className="w-full text-left px-3 py-2.5 text-sm hover:bg-secondary flex items-start gap-2"
              style={{ fontFamily: 'Jost, sans-serif' }}>
              <MapPin className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
              <span>{r.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
