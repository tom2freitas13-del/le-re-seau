import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Waves, Heart, Users, Shield, Instagram } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import BottomNav from '@/components/BottomNav';

const TEAM = [
  {
    name: 'Hector De Giorgio',
    role: 'Co-fondateur',
    bio: 'À l’origine de la vision sociale du projet.',
    insta: 'hector_dgrg',
    initials: 'HD',
  },
  {
    name: 'Noé Derain',
    role: 'Co-fondateur',
    bio: 'Ancrage local et développement de la communauté.',
    insta: 'noe.drn',
    initials: 'ND',
  },
  {
    name: 'Tom De Freitas',
    role: 'Lead Développeur Web',
    bio: 'Conception et développement de la plateforme officielle.',
    insta: 'tom_defts',
    initials: 'TF',
  },
];

export default function About() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/');
  };

  return (
    <div className="min-h-screen pb-28 bg-background">

      {/* HEADER SIMPLE + PREMIUM */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={handleBack} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-display text-xl md:text-2xl font-semibold">
            Qui sommes-nous
          </h1>
        </div>
      </div>

      {/* HERO */}
      <section className="relative h-[45vh] min-h-[320px] overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1692208790949-e5742b9d6f3a?auto=format&fit=crop&w=2000&q=80"
          className="absolute inset-0 w-full h-full object-cover"
          alt="Île de Ré"
        />
        <div className="absolute inset-0 bg-black/40" />

        <div className="relative h-full flex flex-col justify-center items-center text-center px-6 text-white">
          <Waves className="h-10 w-10 mb-4" />
          <h2 className="font-display text-3xl md:text-5xl font-semibold max-w-2xl leading-tight">
            Une équipe passionnée, une île, une communauté
          </h2>
          <p className="text-sm md:text-base mt-3 opacity-90 max-w-xl">
            Le Ré-seau connecte les habitants et visiteurs de l’Île de Ré.
          </p>
        </div>
      </section>

      {/* STORY */}
      <section className="max-w-3xl mx-auto px-4 py-14 space-y-6">
        <h3 className="text-center text-xs uppercase tracking-widest text-primary font-medium">
          Notre histoire
        </h3>

        <p className="text-muted-foreground leading-relaxed">
          Le Ré-seau est né d’un constat simple : sur l’Île de Ré, on croise chaque été des dizaines de personnes formidables sans vraiment garder le contact.
        </p>

        <p className="text-muted-foreground leading-relaxed">
          Hector et Noé ont imaginé une solution locale pour créer du lien. Tom a ensuite conçu et développé la plateforme complète.
        </p>

        <p className="text-muted-foreground leading-relaxed">
          Pas de publicité, pas d’exploitation des données : uniquement une plateforme utile, locale et humaine.
        </p>

        <p className="text-muted-foreground leading-relaxed">
          Le Ré-seau n’est pas une application de rencontre amoureuse ou pour adultes. C’est un
          espace pour se faire de nouveaux amis sur l’île, se donner rendez-vous, discuter,
          s’organiser et s’entraider.
        </p>
      </section>

      {/* VALUES */}
      <section className="max-w-5xl mx-auto px-4 grid md:grid-cols-3 gap-5 pb-14">

        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <Heart className="text-primary mb-3" />
            <h3 className="font-semibold mb-1">Mission</h3>
            <p className="text-sm text-muted-foreground">
              Créer du lien social sur l’île toute l’année.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <Users className="text-primary mb-3" />
            <h3 className="font-semibold mb-1">Communauté</h3>
            <p className="text-sm text-muted-foreground">
              Une plateforme locale pour rencontrer et partager.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <Shield className="text-primary mb-3" />
            <h3 className="font-semibold mb-1">Confidentialité</h3>
            <p className="text-sm text-muted-foreground">
              Pas de pub, pas de revente de données.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* TEAM */}
      <section className="bg-sand/30 py-14">
        <div className="max-w-5xl mx-auto px-4">
          <h3 className="text-center text-xs uppercase tracking-widest text-primary mb-10">
            L’équipe
          </h3>

          <div className="grid md:grid-cols-3 gap-6">
            {TEAM.map((m) => (
              <Card key={m.insta} className="rounded-2xl">
                <CardContent className="p-6 text-center">
                  <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center font-semibold mb-4">
                    {m.initials}
                  </div>

                  <h4 className="font-semibold">{m.name}</h4>

                  <span className="text-xs text-primary">{m.role}</span>

                  <p className="text-xs text-muted-foreground mt-3 mb-4">
                    {m.bio}
                  </p>

                  <a
                    href={`https://instagram.com/${m.insta}`}
                    target="_blank"
                    className="text-xs flex items-center justify-center gap-2 text-primary underline"
                  >
                    <Instagram className="h-3 w-3" />
                    @{m.insta}
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* LINKS */}
      <section className="max-w-lg mx-auto px-4 py-12 space-y-3">
        <h3 className="font-semibold text-center mb-4">En savoir plus</h3>

        <Link className="block text-primary underline text-sm" to="/community-rules">
          Règles de la communauté
        </Link>

        <Link className="block text-primary underline text-sm" to="/privacy">
          Politique de confidentialité
        </Link>

        <Link className="block text-primary underline text-sm" to="/terms">
          Conditions d’utilisation
        </Link>

        <Link className="block text-primary underline text-sm" to="/legal-notice">
          Mentions légales
        </Link>
      </section>

      {/* CTA */}
      <section className="text-center px-4 pb-20">
        <h3 className="text-2xl font-semibold mb-3">Rejoignez l’aventure</h3>
        <p className="text-muted-foreground mb-6">
          Le Ré-seau grandit avec vous.
        </p>

        <Button
          onClick={() => navigate(user ? '/social' : '/auth')}
          className="rounded-full px-8"
        >
          {user ? 'Voir la communauté' : 'Rejoindre'}
        </Button>
      </section>

      <BottomNav />
    </div>
  );
}