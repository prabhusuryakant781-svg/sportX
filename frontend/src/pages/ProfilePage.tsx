import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BugReportModal from '../components/BugReportModal';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showBugModal, setShowBugModal] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-obsidian">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1 className="text-white">Profile</h1>
          <p className="text-sm mt-1">Manage your account and settings.</p>
        </div>
        <button className="btn btn-sm btn-secondary" onClick={() => setShowBugModal(true)}>
          🐛 Report Bug
        </button>
      </div>

      <div className="section">
        {/* User Info Card */}
        <div className="card text-center py-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-24 bg-gradient-hero opacity-20" />
          <div className="w-24 h-24 rounded-full bg-surface border-4 border-obsidian mx-auto mb-4 relative z-10 flex items-center justify-center text-4xl shadow-card">
            {user?.name?.[0] || '👤'}
          </div>
          <h2 className="text-white relative z-10">{user?.name || 'Student Athlete'}</h2>
          <p className="text-muted text-sm relative z-10 mt-1">{user?.email || 'student@college.edu'}</p>
          {user?.collegeName && (
            <span className="badge-pill mt-3 inline-flex relative z-10">🎓 {user.collegeName}</span>
          )}
        </div>

        {/* Settings Links */}
        <h3 className="text-white mt-4">Settings</h3>
        <div className="flex flex-col gap-2">
          {[
            { icon: '🎯', label: 'Edit Fitness Goals', action: () => navigate('/onboarding') },
            { icon: '🔒', label: 'Privacy & Data', action: () => alert('Privacy settings coming soon') },
            { icon: '🔔', label: 'Notifications', action: () => alert('Notification settings coming soon') },
          ].map(item => (
            <button key={item.label} className="card py-4 flex items-center justify-between hover:border-neon/20 transition-colors text-left" onClick={item.action}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{item.icon}</span>
                <span className="font-semibold text-white">{item.label}</span>
              </div>
              <span className="text-muted">➔</span>
            </button>
          ))}
        </div>

        {/* Danger Zone */}
        <h3 className="text-crimson mt-6">Danger Zone</h3>
        <div className="card border-crimson/20 bg-crimson/5">
          <button className="w-full text-left py-3 px-1 flex items-center gap-3" onClick={handleLogout}>
            <span className="text-xl">🚪</span>
            <span className="font-bold text-crimson">Log Out</span>
          </button>
        </div>
      </div>

      <BugReportModal isOpen={showBugModal} onClose={() => setShowBugModal(false)} />
    </div>
  );
}
