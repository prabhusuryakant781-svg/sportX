import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import LoginPage from './pages/LoginPage.jsx';
import OnboardingPage from './pages/OnboardingPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import WorkoutPlanPage from './pages/WorkoutPlanPage.jsx';
import CameraWorkoutPage from './pages/CameraWorkoutPage.jsx';
import SessionResultPage from './pages/SessionResultPage.jsx';
import ProgressPage from './pages/ProgressPage.jsx';
import ChallengesPage from './pages/ChallengesPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import AICoachPage from './pages/AICoachPage.jsx';

function ProtectedRoute({ children }) {
  const { token, loading } = useAuth();
  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div className="spinner" style={{ width: 40, height: 40 }} />
      <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading SportX…</p>
    </div>
  );
  return token ? children : <Navigate to="/login" replace />;
}

function BottomNav() {
  return (
    <nav className="bottom-nav">
      <NavLink to="/dashboard" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
        <span className="nav-icon">🏠</span>
        <span>Home</span>
      </NavLink>
      <NavLink to="/workout" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
        <span className="nav-icon">💪</span>
        <span>Workout</span>
      </NavLink>
      <NavLink to="/camera" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
        <span className="nav-icon">📸</span>
        <span>Camera</span>
      </NavLink>
      <NavLink to="/progress" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
        <span className="nav-icon">📊</span>
        <span>Progress</span>
      </NavLink>
      <NavLink to="/challenges" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
        <span className="nav-icon">⚡</span>
        <span>Compete</span>
      </NavLink>
    </nav>
  );
}

function AppShell({ children }) {
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
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        {/* Protected */}
        <Route path="/dashboard" element={<ProtectedRoute><AppShell><DashboardPage /></AppShell></ProtectedRoute>} />
        <Route path="/workout" element={<ProtectedRoute><AppShell><WorkoutPlanPage /></AppShell></ProtectedRoute>} />
        <Route path="/camera" element={<ProtectedRoute><AppShell><CameraWorkoutPage /></AppShell></ProtectedRoute>} />
        <Route path="/camera/:planId/:exerciseId" element={<ProtectedRoute><AppShell><CameraWorkoutPage /></AppShell></ProtectedRoute>} />
        <Route path="/result" element={<ProtectedRoute><AppShell><SessionResultPage /></AppShell></ProtectedRoute>} />
        <Route path="/progress" element={<ProtectedRoute><AppShell><ProgressPage /></AppShell></ProtectedRoute>} />
        <Route path="/challenges" element={<ProtectedRoute><AppShell><ChallengesPage /></AppShell></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><AppShell><ProfilePage /></AppShell></ProtectedRoute>} />
        <Route path="/ai-coach" element={<ProtectedRoute><AppShell><AICoachPage /></AppShell></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
