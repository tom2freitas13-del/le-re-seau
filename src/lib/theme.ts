export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'app-theme';

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

function getInitialTheme(): Theme {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  // Pas de choix explicite : on suit la préférence système plutôt que de
  // toujours démarrer en clair.
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// Appliqué dès l'import (main.tsx, avant le premier rendu) pour éviter un
// flash du mauvais thème au chargement — même principe que lib/i18n.ts.
applyTheme(getInitialTheme());

export function getTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export function setTheme(theme: Theme) {
  applyTheme(theme);
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}
