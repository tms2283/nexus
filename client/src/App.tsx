import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch, useLocation, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { PersonalizationProvider } from "./contexts/PersonalizationContext";
import { LearnerProfileProvider } from "./contexts/LearnerProfileContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { EditModeProvider } from "./contexts/EditModeContext";
import { usePsychSignalTracker } from "./hooks/usePsychSignalTracker";
import Navigation from "./components/Navigation";
import GamificationHUD from "./components/GamificationHUD";
import AIChat from "./components/AIChat";
import CommandPalette from "./components/CommandPalette";
import EditModeOverlay from "./components/EditModeOverlay";

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
const AILiteracy   = lazy(() => import("./pages/AILiteracy"));
const Lesson       = lazy(() => import("./pages/Lesson"));
const Progress     = lazy(() => import("./pages/Progress"));
const Profile      = lazy(() => import("./pages/Profile"));
const ReadingList  = lazy(() => import("./pages/ReadingList"));
const Skills       = lazy(() => import("./pages/Skills"));
const AdminHome    = lazy(() => import("./pages/AdminHome"));
const AdminPages   = lazy(() => import("./pages/AdminPages"));
const AdminPageEditor = lazy(() => import("./pages/AdminPageEditor"));
const AdminAI      = lazy(() => import("./pages/AdminAI"));
const AdminAudit   = lazy(() => import("./pages/AdminAudit"));
const AdminUsers   = lazy(() => import("./pages/AdminUsers"));
const Studio       = lazy(() => import("./pages/Studio"));
const MyLearnerProfile = lazy(() => import("./pages/MyLearnerProfile"));

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
  const { isLoading } = useAuth();

  // Show loading spinner while resolving auth
  if (isLoading) return <PageSkeleton />;

  return (
    <div style={{ minHeight: "100vh" }}>
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
            {/* The /learn route renders the rich cognitive-science AI Literacy
                course. The legacy hardcoded Learn.tsx is no longer routed — it
                contained thin one-sentence segments that did not consume the
                foundationSeeds curriculum. */}
            <RequireAuth><Suspense fallback={<PageSkeleton />}><AILiteracy /></Suspense></RequireAuth>
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
          <Route path="/ai-literacy">
            <RequireAuth><Suspense fallback={<PageSkeleton />}><AILiteracy /></Suspense></RequireAuth>
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
          <Route path="/learn/my-profile">
            <RequireAuth><Suspense fallback={<PageSkeleton />}><MyLearnerProfile /></Suspense></RequireAuth>
          </Route>
          <Route path="/reading-list">
            <RequireAuth><Suspense fallback={<PageSkeleton />}><ReadingList /></Suspense></RequireAuth>
          </Route>
          <Route path="/skills">
            <RequireAuth><Suspense fallback={<PageSkeleton />}><Skills /></Suspense></RequireAuth>
          </Route>
          <Route path="/admin">
            <RequireAuth><Suspense fallback={<PageSkeleton />}><AdminHome /></Suspense></RequireAuth>
          </Route>
          <Route path="/admin/pages">
            <RequireAuth><Suspense fallback={<PageSkeleton />}><AdminPages /></Suspense></RequireAuth>
          </Route>
          <Route path="/admin/pages/:pageId">
            <RequireAuth><Suspense fallback={<PageSkeleton />}><AdminPageEditor /></Suspense></RequireAuth>
          </Route>
          <Route path="/admin/ai">
            <RequireAuth><Suspense fallback={<PageSkeleton />}><AdminAI /></Suspense></RequireAuth>
          </Route>
          <Route path="/admin/audit">
            <RequireAuth><Suspense fallback={<PageSkeleton />}><AdminAudit /></Suspense></RequireAuth>
          </Route>
          <Route path="/admin/users">
            <RequireAuth><Suspense fallback={<PageSkeleton />}><AdminUsers /></Suspense></RequireAuth>
          </Route>
          <Route path="/studio">
            <RequireAuth><Suspense fallback={<PageSkeleton />}><Studio /></Suspense></RequireAuth>
          </Route>
          <Route path="/404" component={NotFound} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </div>
  );
}

function AppShell() {
  const { isAuthenticated, isGuest, isLoading } = useAuth();
  const { theme } = useTheme();
  const showNav = isAuthenticated || isGuest;
  usePsychSignalTracker(isAuthenticated);

  return (
    <TooltipProvider>
      <Toaster position="bottom-right" theme={theme} />
      {showNav && <Navigation />}
      {showNav && <CommandPalette />}
      {showNav && <EditModeOverlay />}
      <Router />
      {showNav && <GamificationHUD />}
      {showNav && <AIChat />}
    </TooltipProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <PersonalizationProvider>
          <AuthProvider>
            <LearnerProfileProvider>
              <EditModeProvider>
                <AppShell />
              </EditModeProvider>
            </LearnerProfileProvider>
          </AuthProvider>
        </PersonalizationProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
