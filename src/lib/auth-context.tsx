import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { LANGUAGE_STORAGE_KEY, setLanguage } from '@/lib/i18n';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isBanned: boolean;
  // Exploitant unique du site (profiles.is_owner). Distinct de isAdmin :
  // seul lui peut consulter toutes les conversations privées pour la modération.
  isOwner: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isAdmin: false,
  isBanned: false,
  isOwner: false,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Vérifie le statut admin/banni/propriétaire dès qu'un utilisateur est
  // connecté, PUIS le re-vérifie quand l'onglet reprend le focus : sans ça,
  // un bannissement (ou une promotion admin) prononcé en cours de session ne
  // prenait effet qu'au rechargement complet de la page — l'écran de blocage
  // ne s'affichait pas tant que la personne gardait l'appli ouverte.
  useEffect(() => {
    if (!user) { setIsAdmin(false); setIsBanned(false); setIsOwner(false); return; }

    let cancelled = false;

    const refreshFlags = async () => {
      const { data } = await supabase.from('profiles').select('is_admin, is_banned, is_owner').eq('user_id', user.id).single();
      if (cancelled) return;
      setIsAdmin(!!data?.is_admin);
      setIsBanned(!!data?.is_banned);
      setIsOwner(!!data?.is_owner);
    };

    // Premier chargement : les drapeaux + la langue du compte.
    supabase.from('profiles').select('is_admin, is_banned, is_owner, language').eq('user_id', user.id).single().then(({ data }) => {
      if (cancelled) return;
      setIsAdmin(!!data?.is_admin);
      setIsBanned(!!data?.is_banned);
      setIsOwner(!!data?.is_owner);
      if (data?.language) {
        const localChoice = localStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (!localChoice) {
          // Pas de préférence locale explicite sur cet appareil : on applique celle du compte.
          setLanguage(data.language as 'fr' | 'en');
        } else if (localChoice !== data.language) {
          // Un choix explicite existe déjà sur cet appareil (ex: visiteur qui a
          // changé la langue avant de se connecter) : il gagne, on le remonte sur le compte.
          supabase.from('profiles').update({ language: localChoice as 'fr' | 'en' }).eq('user_id', user.id).then();
        }
      }
    });

    const onVisible = () => { if (document.visibilityState === 'visible') refreshFlags(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', refreshFlags);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', refreshFlags);
    };
  }, [user]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, isBanned, isOwner, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
