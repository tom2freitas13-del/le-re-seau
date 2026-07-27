import { useEffect, useState } from 'react';

// Force un re-render périodique pour que les horodatages relatifs
// ("il y a 5min" -> "il y a 6min"...) se mettent à jour sans recharger la
// page, sans avoir à re-fetcher les messages eux-mêmes.
export function useTimeTick(intervalMs = 60_000) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}
