import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import BottomNav from '@/components/BottomNav';

export default function TermsOfService() {
  const navigate = useNavigate();
  const handleBack = () => (window.history.length > 1 ? navigate(-1) : navigate('/'));

  return (
    <div className="min-h-screen pb-28 bg-background">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={handleBack} className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Retour">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-2xl font-semibold">Conditions d'utilisation</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-8 space-y-6" style={{ fontFamily: 'Jost, sans-serif' }}>
        <p className="text-xs text-muted-foreground">Dernière mise à jour : 7 juillet 2026</p>

        <p className="text-sm text-foreground/80 leading-relaxed">
          En utilisant Le Ré-seau, vous acceptez les règles suivantes. Notre objectif est de garder
          cette communauté locale, bienveillante et sûre.
        </p>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold">1. Objet du service</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            Le Ré-seau n'est pas une application de rencontre amoureuse ou pour adultes. C'est une
            application communautaire locale destinée aux habitants et amoureux de l'Île de Ré, pour
            faire de nouvelles rencontres amicales, se donner rendez-vous entre amis, discuter,
            s'organiser (activités, covoiturage, petits services entre voisins) et s'entraider. Toute
            utilisation du service à des fins de rencontre amoureuse, de drague ou à caractère sexuel
            est contraire à sa vocation et peut entraîner la suspension du compte.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold">2. Compte</h2>
          <ul className="space-y-1.5 text-sm text-foreground/80 leading-relaxed list-disc pl-5">
            <li>Vous devez avoir au moins 15 ans pour créer un compte. En dessous de cet âge, la réglementation française impose l'accord d'un parent ou tuteur légal pour tout traitement de données personnelles ; nous ne proposons pas ce mécanisme et n'acceptons donc pas d'inscription en dessous de 15 ans.</li>
            <li>Les informations renseignées doivent être exactes. Aucune usurpation d'identité.</li>
            <li>Vous êtes responsable de la confidentialité de votre mot de passe.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold">3. Contenus interdits</h2>
          <ul className="space-y-1.5 text-sm text-foreground/80 leading-relaxed list-disc pl-5">
            <li>Harcèlement, insultes, propos haineux ou discriminatoires.</li>
            <li>Contenus illégaux, violents, sexuels, ou portant atteinte à un mineur.</li>
            <li>Spam, escroqueries, contenus commerciaux non sollicités.</li>
            <li>Diffusion d'informations personnelles d'autrui sans son accord.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold">4. Modération</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            L'équipe Le Ré-seau peut supprimer ou masquer tout contenu contraire à ces règles, et
            suspendre les comptes contrevenants. Vous pouvez signaler un post, un profil ou un
            message via le bouton « Signaler ».
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold">5. Responsabilité sur les contenus publiés</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            Le Ré-seau agit en tant qu'hébergeur technique des contenus publiés par ses membres
            (messages, posts, annonces, activités, profils) au sens de la loi n° 2004-575 du 21 juin
            2004 pour la confiance dans l'économie numérique (LCEN). Nous ne contrôlons pas a priori
            les contenus publiés par les utilisateurs.
          </p>
          <p className="text-sm text-foreground/80 leading-relaxed">
            Chaque utilisateur est seul responsable des propos, images et contenus qu'il publie sur
            la plateforme, ainsi que de leur conformité à la loi. Le Ré-seau décline toute
            responsabilité quant aux contenus publiés par ses membres et quant aux conséquences,
            directes ou indirectes, de leur utilisation ou de rencontres organisées via le service.
          </p>
          <p className="text-sm text-foreground/80 leading-relaxed">
            Tout contenu illicite ou contraire à ces conditions peut être signalé via le bouton
            « Signaler » ; il sera examiné et retiré dans les meilleurs délais si nécessaire,
            conformément à l'article 6-I-2 de la LCEN.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold">6. Disponibilité du service</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            Le Ré-seau est un service en phase de lancement, fourni « en l'état ». Nous mettons tout
            en œuvre pour garantir la disponibilité et la sécurité, sans pouvoir le garantir
            absolument, et ne pourrons être tenus responsables d'une interruption temporaire du
            service.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold">7. Comptes officiels</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            Certains contenus de lancement peuvent être publiés par l'équipe Le Ré-seau. Aucun faux
            profil n'est créé pour donner une fausse impression d'activité.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold">8. Droit applicable</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            Les présentes conditions sont régies par le droit français. Tout litige relatif à leur
            interprétation ou leur exécution relève de la compétence des tribunaux français.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold">9. Évolution</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            Ces conditions peuvent évoluer. La version en vigueur est toujours celle affichée sur
            cette page.
          </p>
        </section>
      </div>
      <BottomNav />
    </div>
  );
}
