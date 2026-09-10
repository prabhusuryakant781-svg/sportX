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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen bg-obsidian flex flex-col items-center justify-center gap-4">
        <div className="spinner w-10 h-10 border-[3px]" />
        <p className="text-muted text-sm font-medium animate-pulse">Loading SportX…</p>
      </div>
    );
  }

  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <main className="page page-enter">{children}</main>
      <BottomNav />
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
        <Route path="/lobby" element={<ProtectedRoute><AppShell><LobbyPage /></AppShell></ProtectedRoute>} />
        <Route path="/leaderboard" element={<ProtectedRoute><AppShell><LeaderboardPage /></AppShell></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><AppShell><ProfilePage /></AppShell></ProtectedRoute>} />

        {/* Protected Routes without Bottom Nav (Fullscreen experiences) */}
        <Route path="/camera/:planId/:exerciseId" element={<ProtectedRoute><CameraWorkoutPage /></ProtectedRoute>} />
        <Route path="/camera/free/:exerciseId" element={<ProtectedRoute><CameraWorkoutPage /></ProtectedRoute>} />
        <Route path="/camera" element={<Navigate to="/workout" replace />} />
        <Route path="/result" element={<ProtectedRoute><SessionResultPage /></ProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
