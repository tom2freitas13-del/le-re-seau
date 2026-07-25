import { useCallback, useRef } from 'react';

const LONG_PRESS_MS = 500;

// Un seul appui à la fois est possible, donc un seul timer suffit — ça
// permet d'appeler ce hook une seule fois en haut d'un écran de messages
// (pas dans le .map() qui les affiche, ce que les règles des Hooks React
// interdisent) et de générer les handlers pour chaque message via bind(id).
export function useLongPress() {
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const bind = useCallback((onLongPress: () => void) => ({
    onTouchStart: () => { timer.current = setTimeout(onLongPress, LONG_PRESS_MS); },
    onTouchEnd: clear,
    onTouchMove: clear,
    onMouseDown: () => { timer.current = setTimeout(onLongPress, LONG_PRESS_MS); },
    onMouseUp: clear,
    onMouseLeave: clear,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  }), [clear]);

  return bind;
}
