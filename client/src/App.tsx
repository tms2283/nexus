import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { PersonalizationProvider } from "./contexts/PersonalizationContext";
import Navigation from "./components/Navigation";
import GamificationHUD from "./components/GamificationHUD";
import AIChat from "./components/AIChat";
import CommandPalette from "./components/CommandPalette";
import PageLoadingSpinner from "./components/PageLoadingSpinner";

// Lazy-loaded page components for code splitting
const Home = lazy(() => import("./pages/Home"));
const About = lazy(() => import("./pages/About"));
const Learn = lazy(() => import("./pages/Learn"));
const Research = lazy(() => import("./pages/Research"));
const DepthEngine = lazy(() => import("./pages/DepthEngine"));
const Library = lazy(() => import("./pages/Library"));
const Lab = lazy(() => import("./pages/Lab"));
const Contact = lazy(() => import("./pages/Contact"));
const Flashcards = lazy(() => import("./pages/Flashcards"));
const MindMap = lazy(() => import("./pages/MindMap"));
const Settings = lazy(() => import("./pages/Settings"));
const TestingCenter = lazy(() => import("./pages/TestingCenter"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const StudyBuddy = lazy(() => import("./pages/StudyBuddy"));
const Daily = lazy(() => import("./pages/Daily"));
const Lesson = lazy(() => import("./pages/Lesson"));
const Progress = lazy(() => import("./pages/Progress"));
const Profile = lazy(() => import("./pages/Profile"));
const ReadingList = lazy(() => import("./pages/ReadingList"));
const Skills = lazy(() => import("./pages/Skills"));
const NotFound = lazy(() => import("./pages/NotFound"));

function Router() {
  const [location] = useLocation();
  return (
    <Suspense fallback={<PageLoadingSpinner />}>
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
    </Suspense>
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
