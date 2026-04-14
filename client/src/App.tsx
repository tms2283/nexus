import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, useLocation, Redirect } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { PersonalizationProvider } from "./contexts/PersonalizationContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Navigation from "./components/Navigation";
import GamificationHUD from "./components/GamificationHUD";
import AIChat from "./components/AIChat";
import CommandPalette from "./components/CommandPalette";

// ─── Eagerly loaded ───────────────────────────────────────────────────────────
import Welcome from "./pages/Welcome";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Onboarding from "./pages/Onboarding";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";

// ─── Lazily loaded ────────────────────────────────────────────────────────────
const About        = lazy(() => import("./pages/About"));
const Learn        = lazy(() => import("./pages/Learn"));
const Research     = lazy(() => import("./pages/Research"));
const DepthEngine  = lazy(() => import("./pages/DepthEngine"));
const Library      = lazy(() => import("./pages/Library"));
const Lab          = lazy(() => import("./pages/Lab"));
const Contact      = lazy(() => import("./pages/Contact"));
const Flashcards   = lazy(() => import("./pages/Flashcards"));
const MindMap      = lazy(() => import("./pages/MindMap"));
const Settings     = lazy(() => import("./pages/Settings"));
const TestingCenter = lazy(() => import("./pages/TestingCenter"));
const Dashboard    = lazy(() => import("./pages/Dashboard"));
const Leaderboard  = lazy(() => import("./pages/Leaderboard"));
const StudyBuddy   = lazy(() => import("./pages/StudyBuddy"));
const Daily        = lazy(() => import("./pages/Daily"));
const Lesson       = lazy(() => import("./pages/Lesson"));
const Progress     = lazy(() => import("./pages/Progress"));
const Profile      = lazy(() => import("./pages/Profile"));
const ReadingList  = lazy(() => import("./pages/ReadingList"));
const Skills       = lazy(() => import("./pages/Skills"));

function PageSkeleton() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid oklch(0.65 0.22 200 / 0.3)", borderTopColor: "oklch(0.65 0.22 200)", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// Guard: redirects to / if not authenticated or guest
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isGuest, isLoading } = useAuth();
  if (isLoading) return <PageSkeleton />;
  if (!isAuthenticated && !isGuest) return <Redirect to="/" />;
  return <>{children}</>;
}

function Router() {
  const [location] = useLocation();
  const { isAuthenticated, isGuest, isLoading } = useAuth();

  // Show loading spinner while resolving auth
  if (isLoading) return <PageSkeleton />;

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
        <Suspense fallback={<PageSkeleton />}>
          <Switch>
            {/* Public auth routes */}
            <Route path="/" component={Welcome} />
            <Route path="/login" component={Login} />
            <Route path="/register" component={Register} />
            <Route path="/onboarding" component={Onboarding} />

            {/* /app and all sub-routes — require auth or guest */}
            <Route path="/app">
              <RequireAuth><Home /></RequireAuth>
            </Route>
            <Route path="/learn">
              <RequireAuth><Suspense fallback={<PageSkeleton />}><Learn /></Suspense></RequireAuth>
            </Route>
            <Route path="/research">
              <RequireAuth><Suspense fallback={<PageSkeleton />}><Research /></Suspense></RequireAuth>
            </Route>
            <Route path="/depth">
              <RequireAuth><Suspense fallback={<PageSkeleton />}><DepthEngine /></Suspense></RequireAuth>
            </Route>
            <Route path="/library">
              <RequireAuth><Suspense fallback={<PageSkeleton />}><Library /></Suspense></RequireAuth>
            </Route>
            <Route path="/lab">
              <RequireAuth><Suspense fallback={<PageSkeleton />}><Lab /></Suspense></RequireAuth>
            </Route>
            <Route path="/about" component={About} />
            <Route path="/contact" component={Contact} />
            <Route path="/flashcards">
              <RequireAuth><Suspense fallback={<PageSkeleton />}><Flashcards /></Suspense></RequireAuth>
            </Route>
            <Route path="/mindmap">
              <RequireAuth><Suspense fallback={<PageSkeleton />}><MindMap /></Suspense></RequireAuth>
            </Route>
            <Route path="/settings">
              <RequireAuth><Suspense fallback={<PageSkeleton />}><Settings /></Suspense></RequireAuth>
            </Route>
            <Route path="/testing">
              <RequireAuth><Suspense fallback={<PageSkeleton />}><TestingCenter /></Suspense></RequireAuth>
            </Route>
            <Route path="/dashboard">
              <RequireAuth><Suspense fallback={<PageSkeleton />}><Dashboard /></Suspense></RequireAuth>
            </Route>
            <Route path="/leaderboard" component={Leaderboard} />
            <Route path="/study-buddy">
              <RequireAuth><Suspense fallback={<PageSkeleton />}><StudyBuddy /></Suspense></RequireAuth>
            </Route>
            <Route path="/daily">
              <RequireAuth><Suspense fallback={<PageSkeleton />}><Daily /></Suspense></RequireAuth>
            </Route>
            <Route path="/lesson/:lessonId">
              <RequireAuth><Suspense fallback={<PageSkeleton />}><Lesson /></Suspense></RequireAuth>
            </Route>
            <Route path="/progress">
              <RequireAuth><Suspense fallback={<PageSkeleton />}><Progress /></Suspense></RequireAuth>
            </Route>
            <Route path="/profile">
              <RequireAuth><Suspense fallback={<PageSkeleton />}><Profile /></Suspense></RequireAuth>
            </Route>
            <Route path="/reading-list">
              <RequireAuth><Suspense fallback={<PageSkeleton />}><ReadingList /></Suspense></RequireAuth>
            </Route>
            <Route path="/skills">
              <RequireAuth><Suspense fallback={<PageSkeleton />}><Skills /></Suspense></RequireAuth>
            </Route>
            <Route path="/404" component={NotFound} />
            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

function AppShell() {
  const { isAuthenticated, isGuest, isLoading } = useAuth();
  const showNav = isAuthenticated || isGuest;

  return (
    <TooltipProvider>
      <Toaster position="bottom-right" theme="dark" />
      {showNav && <Navigation />}
      {showNav && <CommandPalette />}
      <Router />
      {showNav && <GamificationHUD />}
      {showNav && <AIChat />}
    </TooltipProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <PersonalizationProvider>
          <AuthProvider>
            <AppShell />
          </AuthProvider>
        </PersonalizationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
