import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth-context";
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
import About from "./pages/About";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-center" />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<About />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/social" element={<Social />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/jobs/new" element={<NewJob />} />
            <Route path="/activities" element={<Activities />} />
            <Route path="/activities/new" element={<NewActivity />} />
            <Route path="/chat" element={<ChatList />} />
            <Route path="/chat/:partnerId" element={<Chat />} />
            <Route path="/groups/:groupId" element={<GroupChat />} />
            <Route path="/discussions" element={<Discussions />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
