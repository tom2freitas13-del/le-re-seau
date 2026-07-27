import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import ProfileCard from '@/components/ProfileCard';
import BottomNav from '@/components/BottomNav';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Users, Sparkles, MapPin, Wifi, Search } from 'lucide-react';
import { useBlockedUsers } from '@/lib/useBlockedUsers';
import { usePresence } from '@/lib/presence-context';
import StoriesBar from '@/components/StoriesBar';
import { computeMatchScore } from '@/lib/matchScore';
import { INTEREST_OPTIONS } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface Profile {
  id: string;
  user_id: string;
  name: string | null;
  age: number | null;
  bio: string | null;
  photo_url: string | null;
  interests: string[] | null;
  status: string | null;
  availability: string | null;
  city?: string | null;
  instagram?: string | null;
  linkedin?: string | null;
  is_admin?: boolean | null;
}

const tabs = [
  { id: 'suggestions', labelKey: 'social.tabSuggestions', icon: Sparkles },
  { id: 'proximity', labelKey: 'social.tabProximity', icon: MapPin },
  { id: 'online', labelKey: 'social.tabOnline', icon: Wifi },
];

// BUG FIX : le tri par compatibilité ne portait que sur la page déjà chargée
// (20 profils par défaut) — un très bon match plus loin dans l'ordre brut de
// la table restait invisible tant qu'on n'avait pas cliqué "Voir plus de
// membres" assez de fois pour l'atteindre, et il redisparaissait à chaque
// fois qu'on quittait puis revenait sur la page (le chargement repart à la
// première page). La communauté est encore petite : on charge tout le monde
// d'un coup et on trie/score sur l'ensemble réel, puis on ne pagine plus que
// l'affichage (qui, lui, ne perd jamais rien puisqu'il découpe une liste déjà
// complète et déjà triée).
const DISPLAY_PAGE_SIZE = 20;

export default function Social() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState('suggestions');
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(DISPLAY_PAGE_SIZE);
  const { isBlocked } = useBlockedUsers();
  const { onlineUserIds, onlineCount } = usePresence();
  const [onlineProfiles, setOnlineProfiles] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [interestFilter, setInterestFilter] = useState<string[]>([]);

  const toggleInterestFilter = (value: string) =>
    setInterestFilter(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);

  const loadMyProfile = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
    if (data) setMyProfile(data);
  }, [user]);

  const loadAllProfiles = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .not('name', 'is', null)
      .neq('user_id', user.id)
      .limit(1000);
    setProfiles(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    loadMyProfile();
    loadAllProfiles();
  }, [user, navigate, loadMyProfile, loadAllProfiles]);

  // Revenir à l'affichage court quand on change d'onglet, sinon le nombre de
  // cartes déjà "dépliées" sur un onglet resterait affiché en changeant d'onglet.
  useEffect(() => { setVisibleCount(DISPLAY_PAGE_SIZE); }, [activeTab]);

  // BUG FIX : l'onglet "En ligne" filtrait la liste déjà paginée (20 profils
  // chargés par défaut) — si les membres en ligne n'étaient pas dans cette
  // première page, l'onglet affichait "personne" alors que le compteur du
  // header (basé sur la présence temps réel, indépendant de la pagination)
  // les comptait bien. On récupère donc directement les profils des membres
  // en ligne, quelle que soit la page chargée par ailleurs.
  useEffect(() => {
    if (!user) return;
    const ids = Array.from(onlineUserIds).filter(id => id !== user.id);
    if (ids.length === 0) { setOnlineProfiles([]); return; }
    supabase.from('profiles').select('*').in('user_id', ids).then(({ data }) => setOnlineProfiles(data || []));
  }, [user, onlineUserIds]);

  // Recherche par nom sur l'ensemble des membres (pas seulement la page
  // déjà chargée), pour retrouver tout le monde même au-delà de la pagination.
  useEffect(() => {
    if (!user) return;
    const q = search.trim();
    if (!q) { setSearchResults(null); return; }
    setSearching(true);
    const handle = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .ilike('name', `${q}%`)
        .not('name', 'is', null)
        .neq('user_id', user.id)
        .limit(50);
      setSearchResults(data || []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(handle);
  }, [search, user]);

  const loadMore = () => setVisibleCount(v => v + DISPLAY_PAGE_SIZE);

  // Sécurité : on retire les profils des utilisateurs bloqués par la personne connectée,
  // pour qu'elle ne voie plus jamais leur contenu nulle part dans l'appli.
  const withScores = profiles
    .filter(p => !isBlocked(p.user_id))
    .map(p => ({
      profile: p,
      score: myProfile ? computeMatchScore(myProfile, p) : 0,
    }));

  // Les membres actuellement en ligne remontent en tête de chaque liste —
  // ça donne plus de chances d'avoir une réponse immédiate.
  const onlineFirst = (a: { profile: Profile }, b: { profile: Profile }) =>
    Number(onlineUserIds.has(b.profile.user_id)) - Number(onlineUserIds.has(a.profile.user_id));

  const suggestions = withScores
    .filter(({ score }) => score > 0)
    .sort((a, b) => onlineFirst(a, b) || b.score - a.score);

  // "À proximité" = même ville de résidence (profile.city, rempli dans
  // Profil) plutôt qu'une notion de disponibilité — l'île ne fait que 30km,
  // la commune suffit à repérer les gens du coin.
  const proximity = withScores
    .filter(({ profile }) => !!profile.city && profile.city === myProfile?.city)
    .sort((a, b) => b.score - a.score);

  const online = onlineProfiles
    .filter(profile => !isBlocked(profile.user_id))
    .map(profile => ({ profile, score: myProfile ? computeMatchScore(myProfile, profile) : 0 }))
    .sort((a, b) => b.score - a.score);

  const currentList = activeTab === 'suggestions' ? suggestions
    : activeTab === 'proximity' ? proximity
    : online;

  const isSearching = searchResults !== null;
  const matchesInterestFilter = ({ profile }: { profile: Profile }) =>
    interestFilter.length === 0 || interestFilter.some(i => profile.interests?.includes(i));

  const displayedList = (isSearching
    ? searchResults.filter(p => !isBlocked(p.user_id)).map(p => ({ profile: p, score: 0 }))
    : currentList
  ).filter(matchesInterestFilter);
  const visibleList = isSearching ? displayedList : displayedList.slice(0, visibleCount);
  const hasMore = !isSearching && displayedList.length > visibleCount;

  return (
    <div className="min-h-screen pb-28 bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border/50">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-2xl bg-ocean-light flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="font-display text-2xl font-semibold">{t('social.title')}</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5" style={{ fontFamily: 'Jost, sans-serif' }}>
                {t('social.membersLoaded', { count: profiles.length })}
                {onlineCount > 0 && (
                  <span className="flex items-center gap-1">
                    · <span className="h-1.5 w-1.5 rounded-full bg-green-400" /> {t('home.onlineCount', { count: onlineCount })}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Recherche par nom */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('social.searchPlaceholder')}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20"
              style={{ fontFamily: 'Jost, sans-serif' }}
            />
          </div>

          {/* Filtre par centre d'intérêt — se compose avec les onglets et la
              recherche par nom plutôt que de les remplacer, pour pouvoir
              chercher "qui aime le surf" sans perdre le tri par compatibilité. */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3 -mx-4 px-4">
            {INTEREST_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => toggleInterestFilter(opt.value)}
                className={cn(
                  'flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium border transition-all duration-200',
                  interestFilter.includes(opt.value)
                    ? 'border-primary bg-ocean-light text-primary shadow-sm'
                    : 'border-border bg-background text-muted-foreground hover:bg-secondary'
                )}
                style={{ fontFamily: 'Jost, sans-serif' }}>
                {opt.emoji} {t(`interestOptions.${opt.value}`)}
              </button>
            ))}
          </div>

          {/* Tabs */}
          <div className={`flex gap-2 ${isSearching ? 'opacity-40 pointer-events-none' : ''}`}>
            {tabs.map(({ id, labelKey, icon: Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  activeTab === id
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
                style={{ fontFamily: 'Jost, sans-serif' }}>
                <Icon className="h-3.5 w-3.5" />
                {t(labelKey)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!isSearching && (
        <div className="max-w-lg mx-auto px-4 border-b border-border/50">
          <StoriesBar />
        </div>
      )}

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 pt-6">
        {(loading && !isSearching) || (isSearching && searching) ? (
          <div className="grid grid-cols-2 gap-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="rounded-2xl bg-muted animate-pulse aspect-[3/4]" />
            ))}
          </div>
        ) : displayedList.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">{isSearching ? '🔍' : '🏖️'}</div>
            <h3 className="font-display text-xl mb-2">{isSearching ? t('social.noResults') : t('social.noOneYet')}</h3>
            <p className="text-sm text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif' }}>
              {interestFilter.length > 0
                ? t('social.emptyInterestFilter')
                : isSearching
                ? t('social.noResultsFor', { query: search.trim() })
                : activeTab === 'suggestions'
                ? t('social.emptySuggestions')
                : activeTab === 'proximity'
                ? (myProfile?.city ? t('social.emptyProximity') : t('social.emptyProximityNoCity'))
                : t('social.emptyOnline')}
            </p>
          </div>
        ) : (
          <>
            {!isSearching && activeTab === 'suggestions' && myProfile?.interests?.length && (
              <div className="mb-4 px-4 py-3 rounded-2xl bg-ocean-light border border-primary/10 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
                <p className="text-sm text-primary" style={{ fontFamily: 'Jost, sans-serif' }}>
                  {t('social.sortedByMatch')}
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {visibleList.map(({ profile, score }) => (
                <ProfileCard key={profile.id} profile={profile} matchScore={score} />
              ))}
            </div>
            {hasMore && (
              <button onClick={loadMore} className="btn-ghost w-full mt-4">
                {t('social.loadMore')}
              </button>
            )}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
