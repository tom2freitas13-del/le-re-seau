import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';

/**
 * Nombre de signalements en attente — pour le badge sur l'icône ⚙️
 * Paramètres (Profile.tsx) et sur le lien Modération (Settings.tsx). Un seul
 * hook pour les deux, sinon le compteur affiché sur l'icône (visible partout)
 * et celui dans la page Settings elle-même risquent de diverger.
 */
export function usePendingReportsCount() {
  const { isAdmin } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isAdmin) { setCount(0); return; }

    const load = async () => {
      const { count } = await supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      setCount(count || 0);
    };
    load();

    const channel = supabase
      .channel('pending-reports-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAdmin]);

  return count;
}
