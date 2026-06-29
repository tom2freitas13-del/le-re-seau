import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Instagram, Heart, Code2, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import BottomNav from '@/components/BottomNav';

const FOUNDERS = [
  {
    name: 'Hector De Giorgio',
    role: 'Co-fondateur',
    insta: 'hector_dgrg',
    initials: 'HD',
  },
  {
    name: 'Noé Derain',
    role: 'Co-fondateur',
    insta: 'noe.drn',
    initials: 'ND',
  },
];

export default function About() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // BUG FIX (#2) : bouton retour fiable réintégré
  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen pb-24 bg-background">
      {/* Hero */}
      <section className="relative h-[50vh] min-h-[360px] w-full overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1692208790949-e5742b9d6f3a?auto=format&fit=crop&w=2000&q=80"
          alt="Île de Ré"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/30 via-foreground/20 to-background" />
        <button
          onClick={handleBack}
          className="absolute top-6 left-6 inline-flex items-center gap-1.5 rounded-full bg-card/30 backdrop-blur-md border border-card/40 px-4 py-2 text-sm text-card hover:bg-card/40 transition-colors z-10"
        >
          <ArrowLeft className="h-4 w-4" /> Retour
        </button>
        <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
          <span className="mb-3 rounded-full bg-card/30 backdrop-blur-md border border-card/40 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-card">
            Qui sommes-nous
          </span>
          <h1 className="font-display text-4xl md:text-6xl font-medium text-card drop-shadow-xl max-w-2xl leading-[1.05]">
            Une île, une vision, une appli officielle
          </h1>
        </div>
      </section>

      {/* Notre histoire */}
      <section className="px-4 py-16 max-w-3xl mx-auto">
        <p className="text-xs uppercase tracking-widest text-pine font-medium mb-3 text-center">Notre histoire</p>
        <h2 className="font-display text-3xl md:text-4xl font-medium text-center mb-8">Le Ré-seau, c'est quoi ?</h2>
        <div className="space-y-5 text-base md:text-lg text-muted-foreground leading-relaxed">
          <p>
            <span className="font-display italic text-foreground">Le Ré-seau</span> est né d'un constat tout simple :
            sur l'Île de Ré, on croise des dizaines de personnes formidables chaque été — voisins de plage,
            partenaires de surf, amis d'amis croisés au marché — sans jamais vraiment se reconnecter ensuite.
          </p>
          <p>
            Nous sommes <strong className="text-foreground">Hector</strong> et <strong className="text-foreground">Noé</strong>,
            deux étudiants amoureux de l'île. Nous voulions créer l'espace numérique de référence pour que jeunes, familles et résidents
            puissent se rencontrer, échanger des bons plans et s'entraider toute l'année.
          </p>
          <p>
            Pas de pub, pas d'algorithme opaque. Juste une communauté locale, bienveillante et utile —
            de Rivedoux aux Portes-en-Ré.
          </p>
        </div>
      </section>

      {/* Fondateurs */}
      <section className="px-4 pt-16 pb-8 bg-sand/40">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-xs uppercase tracking-widest text-pine font-medium mb-3">L'origine du projet</p>
            <h2 className="font-display text-3xl md:text-4xl font-medium">Les fondateurs</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {FOUNDERS.map((f) => (
              <Card key={f.insta} className="rounded-3xl border-border/50 shadow-sm hover:shadow-lg transition-shadow overflow-hidden bg-card">
                <CardContent className="p-8 text-center">
                  <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-ocean-light to-pine/20 font-display text-3xl font-medium text-ocean-dark">
                    {f.initials}
                  </div>
                  <h3 className="font-display text-2xl font-semibold mb-1">{f.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{f.role}</p>
                  <a
                    href={`https://instagram.com/${f.insta}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-background border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
                  >
                    <Instagram className="h-4 w-4 text-pink-600" />
                    @{f.insta}
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Développeur - Tom DE FREITAS */}
      <section className="px-4 pb-16 pt-8 bg-sand/40">
        <div className="max-w-xl mx-auto">
          <div className="text-center mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary mb-2">
              <Sparkles className="w-3.5 h-3.5" /> Architecture & Code
            </span>
            <h2 className="font-display text-2xl md:text-3xl font-medium">Le moteur derrière l'appli</h2>
          </div>

          <Card className="rounded-3xl border-primary/20 shadow-md hover:shadow-xl transition-all overflow-hidden relative bg-gradient-to-b from-card to-card/95">
            <CardContent className="p-8 text-center">
              <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-primary relative group">
                <Code2 className="h-10 w-10 transition-transform group-hover:scale-110 duration-300" />
              </div>
              <h3 className="font-display text-2xl font-semibold mb-1">Tom DE FREITAS</h3>
              <p className="text-sm font-medium text-primary mb-3">Développeur & Concepteur Web App</p>
              
              <a
                href="https://instagram.com/tom_defts"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-foreground text-background px-6 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity shadow-sm"
              >
                <Instagram className="h-4 w-4" />
                Suivre @tom_defts
              </a>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16 max-w-2xl mx-auto text-center">
        <Heart className="h-8 w-8 text-pine mx-auto mb-4" />
        <h2 className="font-display text-3xl md:text-4xl font-medium mb-3">Rejoignez-nous</h2>
        <p className="text-muted-foreground mb-8">
          Le Ré-seau grandit avec vous. Inscrivez-vous, complétez votre profil, et commencez à rencontrer
          la communauté qui aime l'île autant que vous.
        </p>
        <Button size="lg" onClick={() => navigate(user ? '/social' : '/auth')} className="shadow-lg">
          {user ? 'Voir la communauté' : 'Rejoindre Le Ré-seau'}
        </Button>
      </section>

      {user && <BottomNav />}
    </div>
  );
}