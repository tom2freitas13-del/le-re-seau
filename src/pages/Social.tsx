import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import ProfileCard from '@/components/ProfileCard';
import BottomNav from '@/components/BottomNav';
import { useNavigate } from 'react-router-dom';
import { Users, Sparkles, Compass, Clock } from 'lucide-react';
import { useBlockedUsers } from '@/lib/useBlockedUsers';

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
}

function computeMatchScore(me: Profile, other: Profile): number {
  if (!me.interests?.length) return 0;
  const mySet = new Set(me.interests);
  const common = (other.interests || []).filter(i => mySet.has(i)).length;
  const total = Math.max(me.interests.length, (other.interests || []).length, 1);
  let score = Math.round((common / total) * 70);
  if (me.status && other.status === me.status) score += 15;
  if (me.availability && other.availability === me.availability) score += 15;
  return Math.min(score, 99);
}

const tabs = [
  { id: 'suggestions', label: 'Pour vous', icon: Sparkles },
  { id: 'discover', label: 'Découvrir', icon: Compass },
  { id: 'nearby', label: 'Présents', icon: Clock },
];

// BUG FIX (#15) : pagination simple pour éviter de charger des centaines
// de profils d'un coup si la communauté grandit.
const PAGE_SIZE = 20;

export default function Social() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState('suggestions');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const { isBlocked } = useBlockedUsers();

  useEffect(() => {
    if (!user) { navigate('/auth'); return; }
    loadMyProfile();
    loadProfilesPage(0, true);
  }, [user]);

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

  const suggestions = withScores
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  const nearby = withScores.filter(({ profile }) =>
    profile.availability && myProfile?.availability && profile.availability === myProfile.availability
  );

  const currentList = activeTab === 'suggestions' ? suggestions
    : activeTab === 'nearby' ? nearby
    : withScores;

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
              <h1 className="font-display text-2xl font-semibold">Communauté</h1>
              <p className="text-xs text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif' }}>
                {profiles.length} membre{profiles.length > 1 ? 's' : ''} chargé{profiles.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  activeTab === id
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
                style={{ fontFamily: 'Jost, sans-serif' }}>
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 pt-6">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="rounded-2xl bg-muted animate-pulse aspect-[3/4]" />
            ))}
          </div>
        ) : currentList.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🏖️</div>
            <h3 className="font-display text-xl mb-2">Personne ici pour l'instant</h3>
            <p className="text-sm text-muted-foreground" style={{ fontFamily: 'Jost, sans-serif' }}>
              {activeTab === 'suggestions'
                ? "Remplis tes centres d'intérêt dans ton profil pour voir des suggestions !"
                : activeTab === 'nearby'
                ? 'Personne avec la même disponibilité pour le moment.'
                : 'Soyez le premier à rejoindre la communauté !'}
            </p>
          </div>
        ) : (
          <>
            {activeTab === 'suggestions' && myProfile?.interests?.length && (
              <div className="mb-4 px-4 py-3 rounded-2xl bg-ocean-light border border-primary/10 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
                <p className="text-sm text-primary" style={{ fontFamily: 'Jost, sans-serif' }}>
                  Profils triés par compatibilité avec vos intérêts
                </p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {currentList.map(({ profile, score }) => (
                <ProfileCard key={profile.id} profile={profile} matchScore={score} />
              ))}
            </div>
            {activeTab === 'discover' && hasMore && (
              <button onClick={loadMore} className="btn-ghost w-full mt-4">
                Voir plus de membres
              </button>
            )}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
