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
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isAdmin: false,
  isBanned: false,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBanned, setIsBanned] = useState(false);

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

  // Vérifie le statut admin/banni dès qu'un utilisateur est connecté.
  // C'est ce qui permet d'afficher partout l'écran de blocage si le compte
  // a été banni, et de débloquer l'accès aux outils de modération pour les admins.
  useEffect(() => {
    if (!user) { setIsAdmin(false); setIsBanned(false); return; }
    supabase.from('profiles').select('is_admin, is_banned, language').eq('user_id', user.id).single().then(({ data }) => {
      setIsAdmin(!!data?.is_admin);
      setIsBanned(!!data?.is_banned);
      if (data?.language) {
        const localChoice = localStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (!localChoice) {
          // Pas de préférence locale explicite sur cet appareil : on applique celle du compte.
          setLanguage(data.language);
        } else if (localChoice !== data.language) {
          // Un choix explicite existe déjà sur cet appareil (ex: visiteur qui a
          // changé la langue avant de se connecter) : il gagne, on le remonte sur le compte.
          supabase.from('profiles').update({ language: localChoice }).eq('user_id', user.id).then();
        }
      }
    });
  }, [user]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, isBanned, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
