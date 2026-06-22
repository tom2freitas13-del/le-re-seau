import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Home, Waves } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  const handleBack = () => {
    // BUG FIX : un bouton retour fiable doit gérer le cas où il n'y a
    // pas d'historique de navigation (ex: arrivée directe sur l'URL).
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-background">
      <Waves className="h-10 w-10 text-primary mb-4" />
      <h1 className="font-display text-5xl font-bold mb-3">404</h1>
      <p className="text-muted-foreground mb-8" style={{ fontFamily: 'Jost, sans-serif' }}>
        Cette page n'existe pas ou plus.
      </p>
      <div className="flex gap-3">
        <button onClick={handleBack} className="btn-ghost flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>
        <button onClick={() => navigate('/')} className="btn-ocean flex items-center gap-2">
          <Home className="h-4 w-4" /> Accueil
        </button>
      </div>
    </div>
  );
}
