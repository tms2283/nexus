import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { PersonalizationProvider } from "./contexts/PersonalizationContext";
import Navigation from "./components/Navigation";
import GamificationHUD from "./components/GamificationHUD";
import AIChat from "./components/AIChat";
import Home from "./pages/Home";
import About from "./pages/About";
import Learn from "./pages/Learn";
import Research from "./pages/Research";
import DepthEngine from "./pages/DepthEngine";
import Library from "./pages/Library";
import Lab from "./pages/Lab";
import Contact from "./pages/Contact";
import Flashcards from "./pages/Flashcards";
import MindMap from "./pages/MindMap";
import Settings from "./pages/Settings";
import TestingCenter from "./pages/TestingCenter";
import Dashboard from "./pages/Dashboard";
import Leaderboard from "./pages/Leaderboard";
import StudyBuddy from "./pages/StudyBuddy";
import Daily from "./pages/Daily";
import Lesson from "./pages/Lesson";
import CommandPalette from "./components/CommandPalette";
import Progress from "./pages/Progress";
import Profile from "./pages/Profile";
import ReadingList from "./pages/ReadingList";
import Skills from "./pages/Skills";

function Router() {
  const [location] = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.18, ease: "easeInOut" }}
        style={{ minHeight: "100vh" }}
      >
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/learn" component={Learn} />
          <Route path="/research" component={Research} />
          <Route path="/depth" component={DepthEngine} />
          <Route path="/library" component={Library} />
          <Route path="/lab" component={Lab} />
          <Route path="/about" component={About} />
          <Route path="/contact" component={Contact} />
          <Route path="/flashcards" component={Flashcards} />
          <Route path="/mindmap" component={MindMap} />
          <Route path="/settings" component={Settings} />
          <Route path="/testing" component={TestingCenter} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/leaderboard" component={Leaderboard} />
          <Route path="/study-buddy" component={StudyBuddy} />
          <Route path="/daily" component={Daily} />
          <Route path="/lesson/:lessonId" component={Lesson} />
          <Route path="/progress" component={Progress} />
          <Route path="/404" component={NotFound} />
          <Route path="/profile" component={Profile} />
          <Route path="/reading-list" component={ReadingList} />
          <Route path="/skills" component={Skills} />
          <Route component={NotFound} />
        </Switch>
      </motion.div>
    </AnimatePresence>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <PersonalizationProvider>
          <TooltipProvider>
            <Toaster position="bottom-right" theme="dark" />
            <Navigation />
            <CommandPalette />
            <Router />
            <GamificationHUD />
            <AIChat />
          </TooltipProvider>
        </PersonalizationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
