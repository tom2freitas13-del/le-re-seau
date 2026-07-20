import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './lib/i18n';
import './index.css';

// Suivi d'erreurs en production — permet d'être alerté quand quelque chose
// casse en prod, au lieu de l'apprendre par un utilisateur qui se plaint.
// Pas de DSN en dev pour ne pas polluer Sentry avec des erreurs locales.
const sentryDsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
if (sentryDsn && import.meta.env.PROD) {
  Sentry.init({
    dsn: sentryDsn,
    sendDefaultPii: false,
  });
}

// Enregistré sans condition (pas seulement à l'activation des notifications push)
// pour que l'app remplisse les critères d'installabilité PWA de Chrome/Edge.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary fallbackTitle="Un problème est survenu" fallbackMessage="Rechargez la page pour réessayer.">
    <App />
  </ErrorBoundary>
);
