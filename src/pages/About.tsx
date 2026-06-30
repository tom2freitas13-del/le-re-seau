import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Waves, Heart, Users, Shield } from 'lucide-react';
import BottomNav from '@/components/BottomNav';

export default function About() {
  const navigate = useNavigate();

  // BUG FIX (#2) : bouton retour fiable. navigate(-1) seul peut ne rien faire
  // si l'utilisateur arrive directement sur /about (pas d'historique précédent) ;
  // on retombe alors sur l'accueil plutôt que de rester bloqué.
  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen pb-28 bg-background">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={handleBack} className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Retour">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-2xl font-semibold">Qui sommes-nous ?</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-8 space-y-8">
        <div className="text-center">
          <Waves className="h-10 w-10 text-primary mx-auto mb-3" />
          <h2 className="font-display text-3xl font-semibold mb-2">Le Ré-seau</h2>
          <p className="text-muted-foreground text-sm" style={{ fontFamily: 'Jost, sans-serif', lineHeight: 1.7 }}>
            Une plateforme pensée pour celles et ceux qui aiment l'Île de Ré — résidents à l'année,
            habitués du week-end ou vacanciers d'été.
          </p>
        </div>

        <div className="card-premium p-5 flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-ocean-light flex items-center justify-center flex-shrink-0">
            <Heart className="h-6 w-6 text-primary" strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="font-display text-xl font-semibold mb-1">Notre mission</h3>
            <p className="text-sm text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif', lineHeight: 1.6 }}>
              Recréer du lien social sur l'île, faciliter les rencontres et l'entraide entre habitants
              et visiteurs, toute l'année.
            </p>
          </div>
        </div>

        <div className="card-premium p-5 flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-pine-light flex items-center justify-center flex-shrink-0">
            <Users className="h-6 w-6 text-pine" strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="font-display text-xl font-semibold mb-1">Une communauté locale</h3>
            <p className="text-sm text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif', lineHeight: 1.6 }}>
              Trouvez des activités, des coups de main, des discussions par thème — tout est pensé
              pour la vie sur l'île, été comme hiver.
            </p>
          </div>
        </div>

        <div className="card-premium p-5 flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-sand-light flex items-center justify-center flex-shrink-0">
            <Shield className="h-6 w-6 text-gold" strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="font-display text-xl font-semibold mb-1">Vos données</h3>
            <p className="text-sm text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif', lineHeight: 1.6 }}>
              Le Ré-seau ne vend pas vos données et n'affiche aucune publicité. Vous pouvez modifier
              ou supprimer votre profil à tout moment depuis votre page Profil.
            </p>
          </div>
        </div>

        <div className="card-premium p-5 space-y-2.5">
          <h3 className="font-display text-lg font-semibold">En savoir plus</h3>
          <Link to="/community-rules" className="block text-sm text-primary underline" style={{ fontFamily: 'Jost, sans-serif' }}>
            Règles de la communauté
          </Link>
          <Link to="/privacy" className="block text-sm text-primary underline" style={{ fontFamily: 'Jost, sans-serif' }}>
            Politique de confidentialité
          </Link>
          <Link to="/terms" className="block text-sm text-primary underline" style={{ fontFamily: 'Jost, sans-serif' }}>
            Conditions d'utilisation
          </Link>
        </div>

        <p className="text-center text-xs text-muted-foreground pt-2" style={{ fontFamily: 'Jost, sans-serif' }}>
          Fait avec ♥ pour l'Île de Ré 🌊
        </p>
      </div>
      <BottomNav />
    </div>
  );
}
