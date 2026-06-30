import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import BannedScreen from "@/components/BannedScreen";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import Social from "./pages/Social";
import Jobs from "./pages/Jobs";
import NewJob from "./pages/NewJob";
import ChatList from "./pages/ChatList";
import Chat from "./pages/Chat";
import GroupChat from "./pages/GroupChat";
import Discussions from "./pages/Discussions";
import Activities from "./pages/Activities";
import NewActivity from "./pages/NewActivity";
import MapView from "./pages/MapView";
import About from "./pages/About";
import CommunityRules from "./pages/CommunityRules";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Pages toujours accessibles même à un compte banni (pour pouvoir
// se déconnecter, consulter les infos, ou comprendre la situation).
const ALWAYS_ACCESSIBLE = ['/', '/about', '/auth', '/community-rules', '/privacy', '/terms'];

function AppRoutes() {
  const { isBanned, loading } = useAuth();
  const location = useLocation();

  // BUG FIX / sécurité : un compte banni voit un écran de blocage à la place
  // du reste de l'application, sur toutes les pages sauf celles toujours accessibles.
  if (!loading && isBanned && !ALWAYS_ACCESSIBLE.includes(location.pathname)) {
    return <BannedScreen />;
  }

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/about" element={<About />} />
      <Route path="/community-rules" element={<CommunityRules />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/social" element={<Social />} />
      <Route path="/jobs" element={<Jobs />} />
      <Route path="/jobs/new" element={<NewJob />} />
      <Route path="/activities" element={<Activities />} />
      <Route path="/activities/new" element={<NewActivity />} />
      <Route path="/map" element={<MapView />} />
      <Route path="/chat" element={<ChatList />} />
      <Route path="/chat/:partnerId" element={<Chat />} />
      <Route path="/groups/:groupId" element={<GroupChat />} />
      <Route path="/discussions" element={<Discussions />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-center" />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
