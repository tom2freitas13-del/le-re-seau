import { useEffect } from 'react';

// Pas de librairie dédiée (react-helmet...) : cette appli est une SPA sans
// rendu serveur, donc de toute façon le titre/la description ne comptent
// vraiment que pour l'onglet du navigateur et les moteurs qui exécutent le
// JS (Google le fait). Une fonction custom suffit, cohérent avec le reste du
// projet qui évite les dépendances pour ce genre de besoin ponctuel.
export function useSeo(title: string, description: string) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;

    let meta = document.querySelector('meta[name="description"]');
    const prevDescription = meta?.getAttribute('content') ?? null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', description);

    return () => {
      document.title = prevTitle;
      if (meta && prevDescription !== null) meta.setAttribute('content', prevDescription);
    };
  }, [title, description]);
}
