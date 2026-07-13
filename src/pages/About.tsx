import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Waves, Heart, Users, Shield, Instagram } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import BottomNav from '@/components/BottomNav';

const TEAM = [
  { name: 'Hector De Giorgio', key: 'hector', insta: 'hector_dgrg', initials: 'HD' },
  { name: 'Noé Derain', key: 'noe', insta: 'noe.drn', initials: 'ND' },
  { name: 'Tom De Freitas', key: 'tom', insta: 'tom_defts', initials: 'TF' },
] as const;

export default function About() {
  const { t } = useTranslation();
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
            {t('about.title')}
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
            {t('about.heroTitle')}
          </h2>
          <p className="text-sm md:text-base mt-3 opacity-90 max-w-xl">
            {t('about.heroSubtitle')}
          </p>
        </div>
      </section>

      {/* STORY */}
      <section className="max-w-3xl mx-auto px-4 py-14 space-y-6">
        <h3 className="text-center text-xs uppercase tracking-widest text-primary font-medium">
          {t('about.storyTitle')}
        </h3>

        <p className="text-muted-foreground leading-relaxed">
          {t('about.story1')}
        </p>

        <p className="text-muted-foreground leading-relaxed">
          {t('about.story2')}
        </p>

        <p className="text-muted-foreground leading-relaxed">
          {t('about.story3')}
        </p>

        <p className="text-muted-foreground leading-relaxed">
          {t('about.story4')}
        </p>
      </section>

      {/* VALUES */}
      <section className="max-w-5xl mx-auto px-4 grid md:grid-cols-3 gap-5 pb-14">

        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <Heart className="text-primary mb-3" />
            <h3 className="font-semibold mb-1">{t('about.missionTitle')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('about.missionDesc')}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <Users className="text-primary mb-3" />
            <h3 className="font-semibold mb-1">{t('about.communityTitle')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('about.communityDesc')}
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-5">
            <Shield className="text-primary mb-3" />
            <h3 className="font-semibold mb-1">{t('about.privacyTitle')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('about.privacyDesc')}
            </p>
          </CardContent>
        </Card>
      </section>

      {/* TEAM */}
      <section className="bg-sand/30 py-14">
        <div className="max-w-5xl mx-auto px-4">
          <h3 className="text-center text-xs uppercase tracking-widest text-primary mb-10">
            {t('about.teamTitle')}
          </h3>

          <div className="grid md:grid-cols-3 gap-6">
            {TEAM.map((m) => (
              <Card key={m.insta} className="rounded-2xl">
                <CardContent className="p-6 text-center">
                  <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center font-semibold mb-4">
                    {m.initials}
                  </div>

                  <h4 className="font-semibold">{m.name}</h4>

                  <span className="text-xs text-primary">{t(`about.team.${m.key}.role`)}</span>

                  <p className="text-xs text-muted-foreground mt-3 mb-4">
                    {t(`about.team.${m.key}.bio`)}
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
        <h3 className="font-semibold text-center mb-4">{t('about.learnMore')}</h3>

        <Link className="block text-primary underline text-sm" to="/community-rules">
          {t('about.communityRules')}
        </Link>

        <Link className="block text-primary underline text-sm" to="/privacy">
          {t('about.privacyPolicy')}
        </Link>

        <Link className="block text-primary underline text-sm" to="/terms">
          {t('about.terms')}
        </Link>

        <Link className="block text-primary underline text-sm" to="/legal-notice">
          {t('about.legalNotice')}
        </Link>
      </section>

      {/* CTA */}
      <section className="text-center px-4 pb-20">
        <h3 className="text-2xl font-semibold mb-3">{t('about.ctaTitle')}</h3>
        <p className="text-muted-foreground mb-6">
          {t('about.ctaSubtitle')}
        </p>

        <Button
          onClick={() => navigate(user ? '/social' : '/auth')}
          className="rounded-full px-8"
        >
          {user ? t('about.ctaJoined') : t('about.ctaJoin')}
        </Button>
      </section>

      <BottomNav />
    </div>
  );
}