import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import BottomNav from '@/components/BottomNav';

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  const handleBack = () => (window.history.length > 1 ? navigate(-1) : navigate('/'));

  return (
    <div className="min-h-screen pb-28 bg-background">
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={handleBack} className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Retour">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-2xl font-semibold">Politique de confidentialité</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-8 space-y-6" style={{ fontFamily: 'Jost, sans-serif' }}>
        <p className="text-xs text-muted-foreground">Dernière mise à jour : 29 juin 2026</p>

        <p className="text-sm text-foreground/80 leading-relaxed">
          Le Ré-seau (« nous ») respecte votre vie privée. Cette page explique de manière simple
          quelles données nous collectons, pourquoi, et comment vous pouvez les gérer.
        </p>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold">Données collectées</h2>
          <ul className="space-y-1.5 text-sm text-foreground/80 leading-relaxed list-disc pl-5">
            <li>Email et mot de passe (ou compte Google) pour la création de votre compte.</li>
            <li>Informations de profil que vous renseignez : prénom, âge, photo, bio, statut, intérêts, réseaux sociaux.</li>
            <li>Contenus que vous publiez : messages, posts du forum, annonces, activités, signalements.</li>
            <li>Données techniques minimales nécessaires à la sécurité du service (date de connexion).</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold">Finalités</h2>
          <ul className="space-y-1.5 text-sm text-foreground/80 leading-relaxed list-disc pl-5">
            <li>Vous permettre d'accéder à la communauté et d'y interagir.</li>
            <li>Vous proposer des suggestions de profils et d'activités correspondant à vos intérêts.</li>
            <li>Garantir la sécurité du service et lutter contre les abus (signalements, blocage, modération).</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold">Hébergement et sous-traitants</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            L'application est hébergée sur Netlify et utilise Supabase pour l'authentification, la
            base de données et le stockage des photos. Aucune donnée n'est revendue à des tiers.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold">Vos droits (RGPD)</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            Conformément au Règlement Général sur la Protection des Données, vous pouvez à tout moment :
          </p>
          <ul className="space-y-1.5 text-sm text-foreground/80 leading-relaxed list-disc pl-5">
            <li>Consulter et modifier vos informations depuis la page Profil.</li>
            <li>Supprimer définitivement votre compte et toutes vos données depuis la page Profil (bouton « Supprimer mon compte »).</li>
            <li>Demander une copie de vos données par email.</li>
            <li>Demander l'effacement complet de vos données par email.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold">Contact</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            Pour toute demande relative à vos données :{' '}
            <a href="mailto:CONTACT_EMAIL@exemple.com" className="text-primary underline">CONTACT_EMAIL@exemple.com</a>
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold">Cookies</h2>
          <p className="text-sm text-foreground/80 leading-relaxed">
            Nous utilisons uniquement les cookies techniques nécessaires à l'authentification et au
            fonctionnement du site. Aucun cookie publicitaire ni de suivi tiers.
          </p>
        </section>
      </div>
      <BottomNav />
    </div>
  );
}
