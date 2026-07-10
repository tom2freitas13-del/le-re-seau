import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './lib/i18n';
import './index.css';

// Enregistré sans condition (pas seulement à l'activation des notifications push)
// pour que l'app remplisse les critères d'installabilité PWA de Chrome/Edge.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}

createRoot(document.getElementById('root')!).render(<App />);
