import { useAuth } from '@/lib/auth-context';
import { ShieldAlert, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Écran affiché en plein écran quand le compte connecté a été banni
 * par la modération. Bloque l'accès au reste de l'application.
 */
export default function BannedScreen() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-background">
      <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-5">
        <ShieldAlert className="h-8 w-8 text-destructive" strokeWidth={1.5} />
      </div>
      <h1 className="font-display text-2xl font-semibold mb-3">Compte suspendu</h1>
      <p className="text-sm text-muted-foreground max-w-sm mb-8" style={{ fontFamily: 'Jost, sans-serif', lineHeight: 1.6 }}>
        Votre compte a été suspendu par la modération de Le Ré-seau, suite à un ou plusieurs
        signalements ou à une violation des règles de la communauté. Si vous pensez qu'il s'agit
        d'une erreur, contactez-nous.
      </p>
      <button
        onClick={async () => { await signOut(); navigate('/'); }}
        className="btn-ghost flex items-center gap-2">
        <LogOut className="h-4 w-4" /> Se déconnecter
      </button>
    </div>
  );
}
