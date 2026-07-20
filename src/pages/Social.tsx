import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import ProfileCard from '@/components/ProfileCard';
import BottomNav from '@/components/BottomNav';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Users, Sparkles, Compass, Clock, Search } from 'lucide-react';
import { useBlockedUsers } from '@/lib/useBlockedUsers';
import { usePresence } from '@/lib/presence-context';
import StoriesBar from '@/components/StoriesBar';
import { computeMatchScore } from '@/lib/matchScore';

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
  instagram?: string | null;
  linkedin?: string | null;
  is_admin?: boolean | null;
}

const tabs = [
  { id: 'suggestions', labelKey: 'social.tabSuggestions', icon: Sparkles },
  { id: 'discover', labelKey: 'social.tabDiscover', icon: Compass },
  { id: 'nearby', labelKey: 'social.tabNearby', icon: Clock },
];

// BUG FIX (#15) : pagination simple pour éviter de charger des centaines
// de profils d'un coup si la communauté grandit.
const PAGE_SIZE = 20;

export default function Social() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState('suggestions');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const { isBlocked } = useBlockedUsers();
  const { onlineUserIds, onlineCount } = usePresence();
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[] | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    loadMyProfile();
    loadProfilesPage(0, true);
  }, [user]);

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

  const loadMyProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
    if (data) setMyProfile(data);
  };

  const loadProfilesPage = async (pageNum: number, reset: boolean) => {
    if (!user) return;
    setLoading(reset);
    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .not('name', 'is', null)
      .neq('user_id', user.id)
      .range(from, to);
    if (data) {
      setProfiles(prev => reset ? data : [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
    }
    setLoading(false);
  };

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    loadProfilesPage(next, false);
  };

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

  const nearby = withScores
    .filter(({ profile }) => profile.availability && myProfile?.availability && profile.availability === myProfile.availability)
    .sort(onlineFirst);

  const discover = [...withScores].sort(onlineFirst);

  const currentList = activeTab === 'suggestions' ? suggestions
    : activeTab === 'nearby' ? nearby
    : discover;

  const isSearching = searchResults !== null;
  const displayedList = isSearching
    ? searchResults.filter(p => !isBlocked(p.user_id)).map(p => ({ profile: p, score: 0 }))
    : currentList;

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
              {isSearching
                ? t('social.noResultsFor', { query: search.trim() })
                : activeTab === 'suggestions'
                ? t('social.emptySuggestions')
                : activeTab === 'nearby'
                ? t('social.emptyNearby')
                : t('social.emptyDiscover')}
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
              {displayedList.map(({ profile, score }) => (
                <ProfileCard key={profile.id} profile={profile} matchScore={score} />
              ))}
            </div>
            {!isSearching && activeTab === 'discover' && hasMore && (
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
