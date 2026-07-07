import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import BottomNav from '@/components/BottomNav';

export default function LegalNotice() {
  const navigate = useNavigate();
  const handleBack = () => (window.history.length > 1 ? navigate(-1) : navigate('/'));

  return (
    <div className="min-h-screen pb-28 bg-background">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={handleBack} className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Retour">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-2xl font-semibold">Mentions légales</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-8 space-y-6" style={{ fontFamily: 'Jost, sans-serif' }}>
        <p className="text-xs text-muted-foreground">Dernière mise à jour : 7 juillet 2026</p>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold">Éditeur du site</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            Le site « Le Ré-seau » est édité à titre non-commercial par Hector De Giorgio, Noé Derain
            et Tom De Freitas, personnes physiques, dans le cadre d'un projet personnel.
          </p>
          <p className="text-sm text-foreground/80 leading-relaxed">
            Directeur de la publication : Hector De Giorgio.
          </p>
          <p className="text-sm text-foreground/80 leading-relaxed">
            Contact :{' '}
            <a href="mailto:hectordegiorgio@gmail.com" className="text-primary underline">hectordegiorgio@gmail.com</a>
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold">Hébergement</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            Le site est hébergé par Netlify, Inc. (2325 3rd Street, Suite 296, San Francisco,
            California 94107, États-Unis). La base de données, l'authentification et le stockage des
            fichiers sont assurés par Supabase Inc.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold">Propriété intellectuelle</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            La structure générale, le design et le code du site sont la propriété de leurs auteurs.
            Toute reproduction non autorisée est interdite. Les contenus publiés par les membres
            (textes, photos) restent la propriété de leurs auteurs respectifs, qui accordent au
            Ré-seau le droit de les afficher dans le cadre du fonctionnement du service.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold">Données personnelles</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            Le traitement de vos données personnelles est détaillé dans notre{' '}
            <a href="/privacy" className="text-primary underline">politique de confidentialité</a>.
          </p>
        </section>
      </div>
      <BottomNav />
    </div>
  );
}
