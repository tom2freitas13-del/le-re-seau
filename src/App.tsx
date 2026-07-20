import { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { PresenceProvider } from "@/lib/presence-context";
import { UnreadProvider } from "@/lib/unread-context";
import BannedScreen from "@/components/BannedScreen";
import InstallBanner from "@/components/InstallBanner";
import { useGlobalMessageNotifications } from "@/lib/useGlobalMessageNotifications";
import { captureReferralFromUrl } from "@/lib/referral";

// Chargées à la demande par route plutôt que toutes d'un bloc au premier
// chargement — la carte (Leaflet) notamment pèse lourd et n'est utile
// qu'à ceux qui visitent /map.
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Profile = lazy(() => import("./pages/Profile"));
const Social = lazy(() => import("./pages/Social"));
const Jobs = lazy(() => import("./pages/Jobs"));
const NewJob = lazy(() => import("./pages/NewJob"));
const Chat = lazy(() => import("./pages/Chat"));
const GroupChat = lazy(() => import("./pages/GroupChat"));
const Discussions = lazy(() => import("./pages/Discussions"));
const Activities = lazy(() => import("./pages/Activities"));
const NewActivity = lazy(() => import("./pages/NewActivity"));
const MapView = lazy(() => import("./pages/MapView"));
const About = lazy(() => import("./pages/About"));
const CommunityRules = lazy(() => import("./pages/CommunityRules"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const LegalNotice = lazy(() => import("./pages/LegalNotice"));
const Admin = lazy(() => import("./pages/Admin"));
const NotFound = lazy(() => import("./pages/NotFound"));

function RouteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="h-8 w-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
    </div>
  );
}

const queryClient = new QueryClient();

// Pages toujours accessibles même à un compte banni (pour pouvoir
// se déconnecter, consulter les infos, ou comprendre la situation).
const ALWAYS_ACCESSIBLE = ['/', '/about', '/auth', '/community-rules', '/privacy', '/terms', '/legal-notice'];

function AppRoutes() {
  const { isBanned, loading } = useAuth();
  const location = useLocation();
  useGlobalMessageNotifications();
  useEffect(() => { captureReferralFromUrl(location.search); }, [location.search]);

  // BUG FIX / sécurité : un compte banni voit un écran de blocage à la place
  // du reste de l'application, sur toutes les pages sauf celles toujours accessibles.
  if (!loading && isBanned && !ALWAYS_ACCESSIBLE.includes(location.pathname)) {
    return <BannedScreen />;
  }

  return (
    <>
      <InstallBanner />
      <Suspense fallback={<RouteLoading />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/about" element={<About />} />
          <Route path="/community-rules" element={<CommunityRules />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/legal-notice" element={<LegalNotice />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/social" element={<Social />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/jobs/new" element={<NewJob />} />
          <Route path="/activities" element={<Activities />} />
          <Route path="/activities/new" element={<NewActivity />} />
          <Route path="/map" element={<MapView />} />
          <Route path="/chat" element={<Discussions />} />
          <Route path="/chat/:partnerId" element={<Chat />} />
          <Route path="/groups/:groupId" element={<GroupChat />} />
          <Route path="/discussions" element={<Discussions />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-center" />
      <BrowserRouter>
        <AuthProvider>
          <PresenceProvider>
            <UnreadProvider>
              <AppRoutes />
            </UnreadProvider>
          </PresenceProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
