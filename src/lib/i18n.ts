import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from '@/locales/fr.json';
import en from '@/locales/en.json';

export const LANGUAGE_STORAGE_KEY = 'app-language';

const stored = typeof window !== 'undefined' ? localStorage.getItem(LANGUAGE_STORAGE_KEY) : null;

i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
  },
  lng: stored === 'en' ? 'en' : 'fr',
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
});

// Change la langue affichée et mémorise le choix localement. La synchro
// avec profiles.language (pour un compte connecté) se fait à l'appelant
// (Profile.tsx), pas ici, pour garder ce module indépendant de Supabase.
export function setLanguage(lang: 'fr' | 'en') {
  i18n.changeLanguage(lang);
  localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
}

export default i18n;
