import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BugReportModal from '../components/BugReportModal';
import { 
  User, 
  Target, 
  Shield, 
  Bell, 
  Bug, 
  LogOut, 
  ChevronRight, 
  School, 
  Award, 
  Flame, 
  Zap, 
  CheckCircle2 
} from 'lucide-react';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showBugModal, setShowBugModal] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const athleteLevel = user?.level || Math.max(1, Math.floor((user?.totalXp ?? 0) / 500) + 1);

  return (
    <div className="space-y-4 pb-8 animate-fade-in">
      {/* Header */}
      <header className="pt-2 flex justify-between items-center">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-neon">Athlete Account</span>
          <h1 className="text-2xl font-black text-white tracking-tight mt-0.5">Profile & Settings</h1>
        </div>
        <button
          type="button"
          className="btn btn-sm btn-secondary flex items-center gap-1.5 py-1.5 px-3 text-xs"
          onClick={() => setShowBugModal(true)}
        >
          <Bug size={13} className="text-rose-400" />
          <span>Report Bug</span>
        </button>
      </header>

      {/* Athlete Identity Card */}
      <div className="card-glass border border-white/10 p-6 text-center relative overflow-hidden shadow-card">
        {/* Glow backdrop */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-neon/15 blur-3xl rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          <div className="relative mb-3">
            <div className="w-20 h-20 rounded-3xl bg-gradient-hero p-0.5 shadow-glow">
              <div className="w-full h-full bg-obsidian rounded-[22px] flex items-center justify-center text-3xl font-black text-white">
                {user?.name?.[0]?.toUpperCase() || 'A'}
              </div>
            </div>
            <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-neon text-obsidian text-[10px] font-black border-2 border-obsidian">
              L{athleteLevel}
            </span>
          </div>

          <h2 className="text-lg font-black text-white tracking-tight">
            {user?.name || 'Student Athlete'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">{user?.email || 'athlete@campus.edu'}</p>

          <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
            {user?.collegeName && (
              <span className="badge-pill text-[10px] flex items-center gap-1">
                <School size={11} />
                <span>{user.collegeName}</span>
              </span>
            )}
            {user?.department && (
              <span className="badge-cyan text-[10px]">
                {user.department}
              </span>
            )}
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-2 w-full mt-5 pt-4 border-t border-white/5">
            <div className="p-2 rounded-xl bg-surface/50 border border-white/5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">XP</span>
              <span className="text-sm font-black text-neon font-outfit tabular-nums mt-0.5 block">
                {(user?.totalXp ?? 0).toLocaleString()}
              </span>
            </div>

            <div className="p-2 rounded-xl bg-surface/50 border border-white/5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Streak</span>
              <span className="text-sm font-black text-amber-400 font-outfit tabular-nums mt-0.5 block">
                🔥 {user?.currentStreak ?? 0}d
              </span>
            </div>

            <div className="p-2 rounded-xl bg-surface/50 border border-white/5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Goal</span>
              <span className="text-xs font-black text-white font-outfit capitalize truncate mt-0.5 block">
                {user?.fitnessGoal || 'Fitness'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Navigation List */}
      <section className="space-y-2">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
          Preferences & Calibration
        </h3>

        <div className="space-y-2">
          {[
            {
              icon: Target,
              label: 'Recalibrate Fitness Goals',
              desc: 'Update sports, duration, and target conditioning focus',
              action: () => navigate('/onboarding'),
            },
            {
              icon: Shield,
              label: 'Privacy & Telemetry Data',
              desc: 'Review camera sensor agreement & on-device privacy',
              action: () => alert('Privacy & on-device telemetry settings are active.'),
            },
            {
              icon: Bell,
              label: 'Training Reminders',
              desc: 'Manage workout schedule notifications',
              action: () => alert('Notification settings are up to date.'),
            },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                type="button"
                onClick={item.action}
                className="card p-4 flex items-center justify-between hover:border-neon/30 transition-all text-left w-full cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center text-slate-300 group-hover:text-neon group-hover:bg-neon/10 transition-colors">
                    <Icon size={18} />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white group-hover:text-neon transition-colors">
                      {item.label}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{item.desc}</div>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-500 group-hover:text-white transition-colors" />
              </button>
            );
          })}
        </div>
      </section>

      {/* Account Security / Danger Zone */}
      <section className="pt-2">
        <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider px-1 mb-2">
          Session Security
        </h3>
        <div className="card border-rose-500/20 bg-rose-950/10 p-4">
          <button
            type="button"
            className="w-full text-left flex items-center justify-between cursor-pointer bg-transparent border-none text-rose-300 hover:text-rose-200"
            onClick={handleLogout}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/15 flex items-center justify-center text-rose-400">
                <LogOut size={16} />
              </div>
              <div>
                <span className="font-bold text-sm text-rose-300">Sign Out of Athlete Account</span>
                <p className="text-[11px] text-slate-400 mt-0.5">End current session on this device</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-rose-400" />
          </button>
        </div>
      </section>

      <BugReportModal isOpen={showBugModal} onClose={() => setShowBugModal(false)} />
    </div>
  );
}
