import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/integrations/supabase/client';
import { Users, Briefcase, MessageCircle, Calendar, ArrowRight, Waves, TreePine, Sun } from 'lucide-react';
import LocalImage from '@/components/LocalImage';

// Photos locales : mets tes fichiers dans public/images/ et ils seront
// accessibles ici avec le chemin /images/nom-du-fichier.jpg
// Si une image n'existe pas encore, le dégradé de fond reste visible derrière
// (le <img> devient juste invisible via onError plutôt que de planter).

const audiences = [
  { emoji: '🧒', age: '14–25 ans', text: 'Trouve des gens pour faire du surf, du vélo ou un apéro sur la plage.' },
  { emoji: '👨‍👩‍👧', age: '25–50 ans', text: "Connecte-toi avec les familles, organise des sorties, trouve un service local." },
  { emoji: '🧓', age: '50–90 ans', text: "Rencontre tes voisins, partage des bons plans et garde le lien avec l'île." },
];

const features = [
  { icon: Users, color: 'bg-ocean-light', iconColor: 'text-primary', title: 'Communauté', desc: 'Rencontrer et se lier avec les habitants et vacanciers de l\'île.', path: '/social' },
  { icon: Calendar, color: 'bg-pine-light', iconColor: 'text-pine', title: 'Activités', desc: 'Proposer ou rejoindre des sorties organisées sur l\'île.', path: '/activities' },
  { icon: MessageCircle, color: 'bg-pine-light', iconColor: 'text-pine', title: 'Discussions', desc: 'Des salons thématiques et un forum pour s\'entraider et partager.', path: '/discussions' },
  { icon: Briefcase, color: 'bg-sand-light', iconColor: 'text-gold', title: 'Services locaux', desc: 'Trouver ou proposer des coups de main et petits boulots sur l\'île.', path: '/jobs' },
];

interface SiteStats {
  total_members: number;
  available_today: number;
  total_discussions: number;
}

// 8 emplacements pour la mosaïque "L'île en images".
// Renomme `label` selon le vrai lieu (ex: "Phare des Baleines"), et mets ta photo
// dans public/images/iledere/ avec le nom exact indiqué dans `src`.
// `aspect` varie pour donner l'effet mosaïque/Pinterest (certaines plus hautes, d'autres carrées).
const ISLAND_PHOTOS = [
  { src: '/images/iledere/photo-1.jpg', label: 'Lieu 1', emoji: '🏛️', bg: 'bg-ocean-light', aspect: 'aspect-[3/4]' },
  { src: '/images/iledere/photo-2.jpg', label: 'Lieu 2', emoji: '🏖️', bg: 'bg-sand-light', aspect: 'aspect-square' },
  { src: '/images/iledere/photo-3.jpg', label: 'Lieu 3', emoji: '🚲', bg: 'bg-pine-light', aspect: 'aspect-square' },
  { src: '/images/iledere/photo-4.jpg', label: 'Lieu 4', emoji: '⛵', bg: 'bg-ocean-light', aspect: 'aspect-[3/4]' },
  { src: '/images/iledere/photo-5.jpg', label: 'Lieu 5', emoji: '🌅', bg: 'bg-sand-light', aspect: 'aspect-[4/3]' },
  { src: '/images/iledere/photo-6.jpg', label: 'Lieu 6', emoji: '🥾', bg: 'bg-pine-light', aspect: 'aspect-square' },
  { src: '/images/iledere/photo-7.jpg', label: 'Lieu 7', emoji: '🍷', bg: 'bg-ocean-light', aspect: 'aspect-[3/4]' },
  { src: '/images/iledere/photo-8.jpg', label: 'Lieu 8', emoji: '🐚', bg: 'bg-sand-light', aspect: 'aspect-square' },
];

export default function Index() {
  const navigate = useNavigate();
  const { user } = useAuth();
  // BUG FIX (#8) : les statistiques ("+X membres", "Y disponibles aujourd'hui"...)
  // étaient des constantes en dur dans l'ancienne version, donc toujours identiques.
  // Ici on interroge réellement la base via la vue `site_stats`.
  const [stats, setStats] = useState<SiteStats | null>(null);

  useEffect(() => {
    supabase
      .from('site_stats')
      .select('*')
      .single()
      .then(({ data }) => { if (data) setStats(data as SiteStats); });
  }, []);

  return (
    <div className="min-h-screen bg-background">

      {/* ── HERO ── */}
      <div className="relative h-screen min-h-[600px] max-h-[900px] overflow-hidden"
        style={{ background: 'linear-gradient(160deg, hsl(196 55% 28%) 0%, hsl(199 60% 18%) 55%, hsl(200 65% 12%) 100%)' }}>
        {/* Photo locale : public/images/hero.jpg — si le fichier n'existe pas,
            l'image disparaît simplement et le dégradé CSS reste visible */}
        <img
          src="/images/hero.jpg"
          alt="Île de Ré"
          className="absolute inset-0 h-full w-full object-cover"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(10,30,42,0.1) 0%, rgba(10,30,42,0.15) 40%, rgba(10,30,42,0.75) 80%, rgba(8,24,34,0.95) 100%)' }} />

        <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-2 glass-dark text-white rounded-full px-4 py-2 text-xs tracking-wider uppercase"
          style={{ fontFamily: 'Jost, sans-serif' }}>
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Île de Ré · Communauté locale
        </div>

        <div className="absolute inset-0 flex flex-col items-center justify-end pb-16 px-6 text-center">
          <div className="animate-fade-up anim-d1">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Waves className="h-5 w-5 text-sky-300" />
              <span className="text-sky-200 text-sm tracking-widest uppercase" style={{ fontFamily: 'Jost, sans-serif' }}>
                Bienvenue sur
              </span>
              <Waves className="h-5 w-5 text-sky-300" />
            </div>
            <h1 className="font-display text-6xl md:text-7xl font-bold text-white mb-3" style={{ letterSpacing: '-0.03em', textShadow: '0 2px 30px rgba(0,0,0,0.3)' }}>
              Le Ré-seau
            </h1>
            <p className="text-white/80 text-lg md:text-xl max-w-sm mx-auto mb-8 font-light" style={{ fontFamily: 'Jost, sans-serif', fontWeight: 300 }}>
              La communauté de ceux qui aiment l'Île de Ré — été comme hiver.
            </p>
          </div>

          <div className="animate-fade-up anim-d2 flex flex-col sm:flex-row gap-3 w-full max-w-sm">
            <button
              onClick={() => navigate(user ? '/social' : '/auth')}
              className="flex-1 btn-ocean text-center py-4 text-base font-semibold"
              style={{ boxShadow: '0 8px 32px rgba(28,94,120,0.4)' }}>
              {user ? 'Rejoindre la communauté' : 'Créer mon profil'}
            </button>
            <button
              onClick={() => navigate('/social')}
              className="flex-1 glass text-foreground rounded-full px-6 py-4 text-sm font-medium tracking-wide transition-all hover:bg-white/90"
              style={{ fontFamily: 'Jost, sans-serif' }}>
              Découvrir →
            </button>
          </div>

          {/* Social proof — donnée réelle, plus une constante en dur */}
          <div className="animate-fade-up anim-d3 mt-6 flex items-center gap-3 text-white/60 text-sm"
            style={{ fontFamily: 'Jost, sans-serif' }}>
            <div className="flex -space-x-2">
              {['🏄', '⛵', '🚲', '🍷'].map((e, i) => (
                <div key={i} className="h-8 w-8 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center text-sm">{e}</div>
              ))}
            </div>
            <span>
              {stats ? `${stats.total_members} membre${stats.total_members !== 1 ? 's' : ''} sur l'île` : 'Rejoignez les premiers membres'}
            </span>
          </div>
        </div>
      </div>

      {/* ── POUR TOUS LES ÂGES ── */}
      <div className="px-4 py-14 max-w-lg mx-auto">
        <div className="text-center mb-10">
          <span className="pill bg-sand-light text-sand-dark mb-3 inline-block">Une île, une communauté</span>
          <h2 className="section-title mb-3">Fait pour tout le monde</h2>
          <p className="text-muted-foreground text-sm" style={{ fontFamily: 'Jost, sans-serif' }}>
            Que vous soyez résident toute l'année ou vacancier en été, Le Ré-seau est votre espace.
          </p>
        </div>

        <div className="space-y-4">
          {audiences.map((a) => (
            <div key={a.age} className="card-premium p-5 flex items-start gap-4">
              <div className="text-3xl flex-shrink-0">{a.emoji}</div>
              <div>
                <div className="pill bg-ocean-light text-primary inline-block mb-1.5">{a.age}</div>
                <p className="text-sm text-foreground/80" style={{ fontFamily: 'Jost, sans-serif', lineHeight: 1.6 }}>{a.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── STATS RÉELLES ── */}
      {stats && (
        <div className="px-4 pb-14 max-w-lg mx-auto grid grid-cols-3 gap-3">
          <div className="card-premium p-4 text-center">
            <p className="font-display text-2xl font-semibold text-primary">{stats.total_members}</p>
            <p className="text-xs text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif' }}>Membres</p>
          </div>
          <div className="card-premium p-4 text-center">
            <p className="font-display text-2xl font-semibold text-primary">{stats.available_today}</p>
            <p className="text-xs text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif' }}>Disponibles</p>
          </div>
          <div className="card-premium p-4 text-center">
            <p className="font-display text-2xl font-semibold text-primary">{stats.total_discussions}</p>
            <p className="text-xs text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif' }}>Discussions</p>
          </div>
        </div>
      )}

      {/* ── FEATURES ── */}
      <div className="px-4 pb-14 max-w-lg mx-auto">
        <div className="text-center mb-8">
          <h2 className="section-title mb-2">Tout ce dont vous avez besoin</h2>
        </div>
        <div className="space-y-3">
          {features.map((f) => (
            <button key={f.title} onClick={() => navigate(user ? f.path : '/auth')}
              className="card-premium p-5 flex items-center gap-4 w-full text-left group">
              <div className={`h-14 w-14 rounded-2xl ${f.color} flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105`}>
                <f.icon className={`h-7 w-7 ${f.iconColor}`} strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-xl font-semibold mb-0.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif', lineHeight: 1.5 }}>{f.desc}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* ── ILE EN IMAGES ── */}
      <div className="px-4 pb-14 max-w-lg mx-auto">
        <h2 className="section-title mb-6 text-center">L'île en images</h2>
        {/* Mosaïque façon Pinterest : mets tes photos dans public/images/iledere/
            avec les noms ci-dessous (photo-1.jpg à photo-8.jpg). Tant qu'une photo
            n'y est pas, un visuel emoji+couleur s'affiche à la place de celle-ci. */}
        <div style={{ columns: 2, columnGap: '0.75rem' }}>
          {ISLAND_PHOTOS.map((p, i) => (
            <LocalImage
              key={p.src}
              src={p.src}
              alt={p.label}
              fallbackEmoji={p.emoji}
              fallbackLabel={p.label}
              fallbackBg={p.bg}
              className={`rounded-2xl w-full mb-3 break-inside-avoid ${p.aspect}`}
            />
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-3" style={{ fontFamily: 'Jost, sans-serif' }}>
          🌊 Quelques coins de l'île · ajoute tes propres photos !
        </p>
      </div>

      {/* ── CTA FINAL ── */}
      <div className="mx-4 mb-8 rounded-3xl overflow-hidden relative" style={{ background: 'linear-gradient(135deg, hsl(196 60% 22%), hsl(200 65% 15%))' }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='white' fill-opacity='1'%3E%3Ccircle cx='20' cy='20' r='1'/%3E%3C/g%3E%3C/svg%3E")` }} />
        <div className="relative px-8 py-10 text-center">
          <Sun className="h-8 w-8 text-yellow-300 mx-auto mb-3 animate-float" />
          <h2 className="font-display text-3xl font-semibold text-white mb-2">
            Rejoignez l'aventure
          </h2>
          <p className="text-white/70 text-sm mb-6 max-w-xs mx-auto" style={{ fontFamily: 'Jost, sans-serif' }}>
            Gratuit, sans pub, fait avec ♥ pour l'île.
          </p>
          <button onClick={() => navigate(user ? '/social' : '/auth')}
            className="bg-white text-primary rounded-full px-8 py-3.5 font-semibold text-sm tracking-wide hover:shadow-xl transition-all hover:-translate-y-0.5"
            style={{ fontFamily: 'Jost, sans-serif' }}>
            {user ? 'Voir la communauté →' : 'Créer mon profil gratuit →'}
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-8 text-xs text-muted-foreground border-t border-border/50"
        style={{ fontFamily: 'Jost, sans-serif' }}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <TreePine className="h-3 w-3" />
          <span className="font-semibold tracking-widest uppercase text-foreground/40">Le Ré-seau</span>
          <TreePine className="h-3 w-3" />
        </div>
        <Link to="/about" className="underline hover:text-foreground transition-colors">Qui sommes-nous ?</Link>
        <p className="mt-2">Fait avec amour pour l'Île de Ré 🌊</p>
      </div>

    </div>
  );
}
