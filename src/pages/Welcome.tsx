import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { usePresence } from '@/lib/presence-context';
import { Waves, UserRound, CalendarHeart, Map, ArrowRight, Sparkles } from 'lucide-react';

// Premier écran vu juste après l'inscription : preuve de vie immédiate
// (vrais chiffres de la communauté), explication du fonctionnement en
// 3 étapes, puis un seul objectif — donner envie de créer son profil.
// Sans profil complété, le matching ne fonctionne pas (computeMatchScore
// renvoie 0 sans centres d'intérêt) : tout converge vers ce CTA.

interface WelcomeStats {
  total_members: number;
  total_activities: number;
  total_discussions: number;
}

export default function Welcome() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { onlineCount } = usePresence();
  const [stats, setStats] = useState<WelcomeStats | null>(null);
  const [upcomingCount, setUpcomingCount] = useState<number | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    supabase.from('site_stats').select('total_members, total_activities, total_discussions').single()
      .then(({ data }) => { if (data) setStats(data as WelcomeStats); });
    supabase.from('activities')
      .select('id', { count: 'exact', head: true })
      .gte('activity_date', new Date().toISOString().slice(0, 10))
      .then(({ count }) => setUpcomingCount(count ?? 0));
  }, []);

  const steps = [
    { icon: UserRound, bg: 'bg-ocean-light', color: 'text-primary', titleKey: 'welcome.step1Title', descKey: 'welcome.step1Desc' },
    { icon: CalendarHeart, bg: 'bg-pine-light', color: 'text-pine', titleKey: 'welcome.step2Title', descKey: 'welcome.step2Desc' },
    { icon: Map, bg: 'bg-sand-light', color: 'text-gold', titleKey: 'welcome.step3Title', descKey: 'welcome.step3Desc' },
  ] as const;

  return (
    <div className="min-h-screen bg-background pb-32">

      {/* ── En-tête océan, même langage visuel que le hero de l'accueil ── */}
      <div className="relative overflow-hidden px-6 pt-14 pb-12 text-center"
        style={{ background: 'linear-gradient(160deg, hsl(196 55% 28%) 0%, hsl(199 60% 18%) 55%, hsl(200 65% 12%) 100%)' }}>
        {/* Halo décoratif */}
        <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-sky-400/20 blur-3xl" />

        <div className="animate-fade-up anim-d1 relative">
          <div className="mb-4 flex items-center justify-center gap-2">
            <Waves className="h-5 w-5 text-sky-300" />
            <span className="text-xs uppercase tracking-widest text-sky-200" style={{ fontFamily: 'Jost, sans-serif' }}>
              {t('welcome.eyebrow')}
            </span>
            <Waves className="h-5 w-5 text-sky-300" />
          </div>
          {/* Le nom de la marque ne doit jamais être coupé en fin de ligne */}
          <h1 className="font-display mb-3 text-4xl font-bold text-white" style={{ letterSpacing: '-0.02em' }}>
            {t('welcome.title')} <span className="whitespace-nowrap">Le Ré-seau 🏝️</span>
          </h1>
          <p className="mx-auto max-w-sm text-base font-light text-white/85" style={{ fontFamily: 'Jost, sans-serif' }}>
            {t('welcome.subtitle')}
          </p>
        </div>

        {/* ── Preuve de vie : vrais chiffres, pas des promesses. Chaque
            carte bascule sur une statistique cumulative plutôt que
            d'afficher un zéro démotivant (0 sortie à venir, 0 en ligne). ── */}
        <div className="animate-fade-up anim-d2 relative mx-auto mt-8 grid max-w-sm grid-cols-3 gap-2">
          <div className="glass-dark rounded-2xl px-2 py-3 text-white">
            <p className="font-display text-2xl font-semibold">{stats ? stats.total_members : '···'}</p>
            <p className="text-[11px] text-white/70" style={{ fontFamily: 'Jost, sans-serif' }}>{t('welcome.statMembers')}</p>
          </div>
          <div className="glass-dark rounded-2xl px-2 py-3 text-white">
            {upcomingCount ? (
              <>
                <p className="font-display text-2xl font-semibold">{upcomingCount}</p>
                <p className="text-[11px] text-white/70" style={{ fontFamily: 'Jost, sans-serif' }}>{t('welcome.statActivities')}</p>
              </>
            ) : (
              <>
                <p className="font-display text-2xl font-semibold">{stats ? stats.total_activities : '···'}</p>
                <p className="text-[11px] text-white/70" style={{ fontFamily: 'Jost, sans-serif' }}>{t('welcome.statActivitiesTotal')}</p>
              </>
            )}
          </div>
          <div className="glass-dark rounded-2xl px-2 py-3 text-white">
            {onlineCount > 0 ? (
              <>
                <p className="font-display text-2xl font-semibold">
                  <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-green-400 align-middle" />
                  {onlineCount}
                </p>
                <p className="text-[11px] text-white/70" style={{ fontFamily: 'Jost, sans-serif' }}>{t('welcome.statOnline')}</p>
              </>
            ) : (
              <>
                <p className="font-display text-2xl font-semibold">{stats ? stats.total_discussions : '···'}</p>
                <p className="text-[11px] text-white/70" style={{ fontFamily: 'Jost, sans-serif' }}>{t('welcome.statMessages')}</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Comment ça marche, en 3 étapes ── */}
      <div className="mx-auto max-w-lg px-4 pt-10">
        <div className="animate-fade-up anim-d3 mb-8 text-center">
          <span className="pill mb-3 inline-block bg-sand-light text-sand-dark">{t('welcome.howBadge')}</span>
          <h2 className="section-title">{t('welcome.howTitle')}</h2>
        </div>

        <div className="space-y-4">
          {steps.map((step, i) => (
            <div key={step.titleKey} className={`animate-fade-up anim-d${i + 3} card-premium flex items-start gap-4 p-5`}>
              <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ${step.bg}`}>
                <step.icon className={`h-6 w-6 ${step.color}`} strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <p className="mb-1 flex items-baseline gap-2">
                  <span className="font-display text-sm font-semibold text-muted-foreground">{i + 1}.</span>
                  <span className="font-display text-lg font-semibold">{t(step.titleKey)}</span>
                </p>
                <p className="text-sm text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif', lineHeight: 1.6 }}>
                  {t(step.descKey)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Ce que ce n'est PAS : lever l'ambiguïté tout de suite ── */}
        <div className="animate-fade-up anim-d5 mt-8 rounded-2xl border border-border/60 bg-secondary/50 p-4 text-center">
          <p className="text-sm text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif', lineHeight: 1.6 }}>
            <Sparkles className="mr-1.5 inline h-4 w-4 text-gold" />
            {t('welcome.notADatingApp')}
          </p>
        </div>
      </div>

      {/* ── CTA fixe : toujours visible, un seul objectif ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/50 bg-background/90 px-4 pb-5 pt-3 backdrop-blur-md">
        <div className="mx-auto max-w-lg space-y-2">
          <button
            onClick={() => navigate('/profile')}
            className="btn-ocean flex w-full items-center justify-center gap-2 py-4 text-base font-semibold"
            style={{ boxShadow: '0 8px 32px rgba(28,94,120,0.35)' }}>
            {t('welcome.ctaProfile')} <ArrowRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => navigate('/activities')}
            className="w-full py-2 text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
            style={{ fontFamily: 'Jost, sans-serif' }}>
            {t('welcome.ctaExplore')}
          </button>
        </div>
      </div>
    </div>
  );
}
