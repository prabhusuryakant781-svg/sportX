import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import BottomNav from './components/BottomNav';

// Pages
import LoginPage from './pages/LoginPage';
import OnboardingPage from './pages/OnboardingPage';
import DashboardPage from './pages/DashboardPage';
import WorkoutLibraryPage from './pages/WorkoutLibraryPage';
import CameraWorkoutPage from './pages/CameraWorkoutPage';
import SessionResultPage from './pages/SessionResultPage';
import ProgressPage from './pages/ProgressPage';
import LobbyPage from './pages/LobbyPage';
import LeaderboardPage from './pages/LeaderboardPage';
import ProfilePage from './pages/ProfilePage';
import AICoachPage from './pages/AICoachPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-obsidian flex flex-col items-center justify-center gap-4">
        <div className="relative flex items-center justify-center">
          <div className="absolute w-20 h-20 bg-neon/20 rounded-full blur-xl animate-pulse" />
          <div className="spinner w-10 h-10 border-[3px] border-neon/20 border-t-neon" />
        </div>
        <p className="text-slate-400 text-xs font-semibold tracking-wider uppercase animate-pulse">
          Calibrating SportX Telemetry…
        </p>
      </div>
    );
  }

  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-obsidian flex justify-center relative overflow-x-hidden">
      {/* Background ambient lighting matching LoginPage.tsx */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-neon/[0.08] rounded-full blur-[110px] pointer-events-none z-0" />
      <div className="fixed bottom-1/4 left-1/3 w-72 h-72 bg-cyan/[0.08] rounded-full blur-[100px] pointer-events-none z-0" />

      <div className="app-shell border-x border-white/[0.05] relative z-10">
        <main className="page page-enter">{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />

        {/* Protected Routes inside AppShell (with Bottom Nav) */}
        <Route path="/" element={<ProtectedRoute><AppShell><DashboardPage /></AppShell></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><AppShell><DashboardPage /></AppShell></ProtectedRoute>} />
        <Route path="/workout" element={<ProtectedRoute><AppShell><WorkoutLibraryPage /></AppShell></ProtectedRoute>} />
        <Route path="/progress" element={<ProtectedRoute><AppShell><ProgressPage /></AppShell></ProtectedRoute>} />
        <Route path="/ai-coach" element={<ProtectedRoute><AppShell><AICoachPage /></AppShell></ProtectedRoute>} />
        <Route path="/lobby" element={<ProtectedRoute><AppShell><LobbyPage /></AppShell></ProtectedRoute>} />
        <Route path="/leaderboard" element={<ProtectedRoute><AppShell><LeaderboardPage /></AppShell></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><AppShell><ProfilePage /></AppShell></ProtectedRoute>} />

        {/* Protected Routes without Bottom Nav (Fullscreen experiences) */}
        <Route path="/camera/:planId/:exerciseId" element={<ProtectedRoute><CameraWorkoutPage /></ProtectedRoute>} />
        <Route path="/camera/free/:exerciseId" element={<ProtectedRoute><CameraWorkoutPage /></ProtectedRoute>} />
        <Route path="/camera/:exerciseId" element={<ProtectedRoute><CameraWorkoutPage /></ProtectedRoute>} />
        <Route path="/camera" element={<Navigate to="/camera/free/squat" replace />} />
        <Route path="/result" element={<ProtectedRoute><SessionResultPage /></ProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
