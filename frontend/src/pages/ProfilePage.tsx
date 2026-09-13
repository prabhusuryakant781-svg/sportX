import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
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
  CheckCircle2,
  X,
  Edit3
} from 'lucide-react';

export default function ProfilePage() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [showBugModal, setShowBugModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<'beginner' | 'intermediate' | 'pro'>('beginner');
  const [savingProfile, setSavingProfile] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const openEditProfile = () => {
    setNameInput(user?.name || '');
    const raw = user?.fitnessLevel?.toLowerCase();
    const initial = (raw === 'pro' || raw === 'advanced') ? 'pro' : (raw === 'intermediate' ? 'intermediate' : 'beginner');
    setSelectedLevel(initial);
    setShowEditProfileModal(true);
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await api.updateProfile({
        name: nameInput.trim() || user?.name || 'Athlete',
        fitnessLevel: selectedLevel
      });
      await refreshUser();
      setShowEditProfileModal(false);
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      alert('Could not update profile. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  const athleteLevel = user?.level || Math.max(1, Math.floor((user?.totalXp ?? 0) / 500) + 1);

  const currentLevelDisplay = user?.fitnessLevel
    ? (user.fitnessLevel.toLowerCase() === 'pro' || user.fitnessLevel.toLowerCase() === 'advanced'
        ? 'Pro'
        : user.fitnessLevel.toLowerCase() === 'intermediate'
        ? 'Intermediate'
        : 'Beginner')
    : 'Not set';

  return (
    <div className="space-y-4 pb-8 animate-fade-in">
      {/* Header */}
      <header className="pt-2 flex justify-between items-center">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-neon">Athlete Account</span>
          <h1 className="text-2xl font-black text-white tracking-tight mt-0.5">Profile & Settings</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn btn-sm btn-primary flex items-center gap-1.5 py-1.5 px-3 text-xs font-bold shadow-glow-sm"
            onClick={openEditProfile}
          >
            <Edit3 size={13} />
            <span>Edit Profile</span>
          </button>
          <button
            type="button"
            className="btn btn-sm btn-secondary flex items-center gap-1.5 py-1.5 px-3 text-xs"
            onClick={() => setShowBugModal(true)}
          >
            <Bug size={13} className="text-rose-400" />
            <span>Report Bug</span>
          </button>
        </div>
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
            <span className="badge-pill text-[10px] flex items-center gap-1 border-neon/30 text-neon bg-neon/10">
              <Zap size={10} />
              <span>Fitness: {currentLevelDisplay}</span>
            </span>
          </div>

          {/* Quick Edit Profile Action */}
          <div className="mt-3.5">
            <button
              type="button"
              onClick={openEditProfile}
              className="btn btn-sm btn-secondary py-1.5 px-4 text-xs font-bold flex items-center gap-1.5 border border-white/10 hover:border-neon/40 hover:text-neon transition-colors cursor-pointer"
            >
              <Edit3 size={13} className="text-neon" />
              <span>Edit Profile & Fitness Level</span>
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-4 gap-2 w-full mt-5 pt-4 border-t border-white/5">
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

            <div 
              onClick={openEditProfile}
              className="p-2 rounded-xl bg-surface/50 border border-white/5 hover:border-neon/30 transition-colors cursor-pointer"
            >
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Fitness</span>
              <span className="text-xs font-black text-neon font-outfit capitalize truncate mt-0.5 block">
                {currentLevelDisplay}
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
              icon: Zap,
              label: 'Fitness Level',
              desc: `Current: ${currentLevelDisplay} • Calibrate AI workout intensity & volume`,
              action: openEditProfile,
            },
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

      {/* Edit Profile Modal (Name + Fitness Level) */}
      {showEditProfileModal && (
        <div 
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => !savingProfile && setShowEditProfileModal(false)}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in" />
          <div
            className="relative w-full max-w-[460px] rounded-t-3xl sm:rounded-3xl p-6 animate-slide-up bg-card border border-white/10 shadow-2xl space-y-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-neon/15 flex items-center justify-center text-neon">
                  <Edit3 size={16} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white tracking-tight">Edit Profile</h3>
                  <p className="text-[11px] text-slate-400">Update athlete identity and calibrate fitness level</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditProfileModal(false)}
                disabled={savingProfile}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Athlete Name Field */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Athlete Name
              </label>
              <input
                type="text"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                placeholder="Enter your name"
                maxLength={50}
                className="w-full bg-surface border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-neon transition-colors"
              />
            </div>

            {/* Fitness Level Selector */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Fitness Level
              </label>
              <div className="space-y-2.5">
                {[
                  {
                    id: 'beginner',
                    title: 'Beginner',
                    desc: 'Foundational drills, steady pacing, 40s rest periods. Perfect for building movement confidence.',
                    badge: '2-3 Sets • 8-12 Reps'
                  },
                  {
                    id: 'intermediate',
                    title: 'Intermediate',
                    desc: 'Challenging compound volume, progressive overload, 35s rest periods.',
                    badge: '3-4 Sets • 10-15 Reps'
                  },
                  {
                    id: 'pro',
                    title: 'Pro',
                    desc: 'Advanced athletic conditioning, high-density sets, 25s rest intervals for peak output.',
                    badge: '3-5 Sets • 15-25 Reps'
                  }
                ].map(lvl => {
                  const isSelected = selectedLevel === lvl.id;
                  return (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setSelectedLevel(lvl.id as any)}
                      className={`w-full text-left p-3.5 rounded-2xl transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-neon/15 border-neon shadow-glow-sm'
                          : 'bg-surface/50 border-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-black ${isSelected ? 'text-neon' : 'text-white'}`}>
                          {lvl.title}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/5 text-slate-300">
                          {lvl.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{lvl.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                className="btn btn-secondary flex-1 py-2.5 text-xs font-bold"
                onClick={() => setShowEditProfileModal(false)}
                disabled={savingProfile}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary flex-1 py-2.5 text-xs font-bold"
                onClick={handleSaveProfile}
                disabled={savingProfile}
              >
                {savingProfile ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="spinner w-3.5 h-3.5 border-white/30 border-t-white" />
                    <span>Saving...</span>
                  </span>
                ) : (
                  <span>Save Profile</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <BugReportModal isOpen={showBugModal} onClose={() => setShowBugModal(false)} />
    </div>
  );
}
