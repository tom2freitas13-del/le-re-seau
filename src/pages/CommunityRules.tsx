import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Flag, ShieldAlert } from 'lucide-react';
import BottomNav from '@/components/BottomNav';

export default function CommunityRules() {
  const navigate = useNavigate();
  const handleBack = () => (window.history.length > 1 ? navigate(-1) : navigate('/'));

  return (
    <div className="min-h-screen pb-28 bg-background">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={handleBack} className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Retour">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-2xl font-semibold">Règles de la communauté</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-8 space-y-6" style={{ fontFamily: 'Jost, sans-serif' }}>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Le Ré-seau est un espace de confiance entre habitants et amoureux de l'Île de Ré.
          Pour que ça reste vrai, quelques règles simples s'appliquent à tout le monde.
        </p>

        <div className="card-premium p-5">
          <h2 className="font-display text-xl font-semibold mb-3 flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" /> 🚫 Ce qui est interdit
          </h2>
          <ul className="space-y-2 text-sm text-foreground/80 leading-relaxed list-disc pl-5">
            <li>Le harcèlement, les insultes, les propos haineux ou discriminatoires.</li>
            <li>Les contenus illégaux, violents, sexuels, ou impliquant des mineurs.</li>
            <li>L'usurpation d'identité.</li>
            <li>Le spam et les arnaques.</li>
            <li>La diffusion d'informations privées de quelqu'un sans son accord.</li>
          </ul>
        </div>

        <div className="card-premium p-5">
          <h2 className="font-display text-xl font-semibold mb-3 flex items-center gap-2">
            <Flag className="h-5 w-5 text-primary" /> 🛡️ Modération
          </h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            Vous pouvez à tout moment signaler un post, un profil ou un message via l'icône drapeau 🚩.
            L'équipe de modération examinera le signalement et prendra les mesures nécessaires :
            avertissement, suppression du contenu, ou suspension du compte concerné.
          </p>
        </div>

        <p className="text-xs text-muted-foreground text-center pt-2">
          Pour le détail complet des règles, consultez nos{' '}
          <a href="/terms" className="text-primary underline">Conditions d'utilisation</a>.
        </p>
      </div>
      <BottomNav />
    </div>
  );
}
