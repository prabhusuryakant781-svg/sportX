import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import BugReportModal from '../components/BugReportModal';
import PerformanceScoreCard from '../components/PerformanceScoreCard';
import GoalsModal from '../components/GoalsModal';
import FriendsModal from '../components/FriendsModal';
import FriendChallengeModal from '../components/FriendChallengeModal';
import SportxBackground from '../components/SportxBackground';
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
  Edit3,
  Trophy,
  Swords,
  Crown,
  Lock,
  Plus,
  Sparkles,
  Users
} from 'lucide-react';
import { getRankTierFromRP, getNextRankTier, getRPNeededForNextTier, CompetitiveRankTier } from '../types/competitive';

interface TitleItem {
  id: string;
  name: string;
  description: string;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';
  category: string;
  unlockRequirement: string;
  unlocked: boolean;
  isEquipped: boolean;
}

interface BadgeItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: string;
  category: string;
  unlocked: boolean;
}

const TITLE_RARITY_THEMES: Record<string, { badge: string; text: string; border: string }> = {
  Common: { badge: 'bg-slate-800 text-slate-300 border-slate-700', text: 'text-slate-300', border: 'border-slate-700' },
  Uncommon: { badge: 'bg-emerald-950 text-emerald-400 border-emerald-700/60', text: 'text-emerald-400', border: 'border-emerald-700/50' },
  Rare: { badge: 'bg-cyan-950 text-cyan-400 border-cyan-700/60', text: 'text-cyan-400', border: 'border-cyan-600/50' },
  Epic: { badge: 'bg-purple-950 text-purple-300 border-purple-700/60', text: 'text-purple-300', border: 'border-purple-600/50' },
  Legendary: { badge: 'bg-amber-950 text-amber-300 border-amber-500/80', text: 'text-amber-400', border: 'border-amber-500/60' },
};

export default function ProfilePage() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [showBugModal, setShowBugModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<'beginner' | 'intermediate' | 'pro'>('beginner');
  const [savingProfile, setSavingProfile] = useState(false);

  // Titles State
  const [showTitlesModal, setShowTitlesModal] = useState(false);
  const [titles, setTitles] = useState<TitleItem[]>([]);
  const [loadingTitles, setLoadingTitles] = useState(false);
  const [equippingTitleId, setEquippingTitleId] = useState<string | null>(null);

  // Featured Badges State
  const [showShowcaseModal, setShowShowcaseModal] = useState(false);
  const [availableBadges, setAvailableBadges] = useState<BadgeItem[]>([]);
  const [selectedFeatured, setSelectedFeatured] = useState<string[]>([]);
  const [savingShowcase, setSavingShowcase] = useState(false);

  // Step 7 Goals & Friends State
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [showFriendChallengeModal, setShowFriendChallengeModal] = useState(false);
  const [targetFriend, setTargetFriend] = useState<any>(null);
  const [goalsSummary, setGoalsSummary] = useState<{ active: number; completed: number }>({ active: 0, completed: 0 });
  const [friendsCount, setFriendsCount] = useState<number>(0);

  const fetchSocialStats = () => {
    api.getGoals(true).then((res: any) => {
      const list = res?.data || [];
      setGoalsSummary({
        active: list.filter((g: any) => g.status === 'active').length,
        completed: list.filter((g: any) => g.status === 'completed').length,
      });
    }).catch(() => null);

    api.getFriends().then((res: any) => {
      setFriendsCount(Array.isArray(res?.data) ? res.data.length : 0);
    }).catch(() => null);
  };

  useEffect(() => {
    fetchSocialStats();
  }, []);

  useEffect(() => {
    if (user?.featuredBadges) {
      setSelectedFeatured(user.featuredBadges);
    }
  }, [user]);

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

  const openTitlesModal = async () => {
    setShowTitlesModal(true);
    setLoadingTitles(true);
    try {
      const res: any = await api.getTitles();
      if (res?.success && Array.isArray(res.data)) {
        setTitles(res.data);
      }
    } catch (err) {
      console.error('Failed to load titles:', err);
    } finally {
      setLoadingTitles(false);
    }
  };

  const handleEquipTitle = async (titleId: string) => {
    setEquippingTitleId(titleId);
    try {
      const targetId = user?.equippedTitle === titleId ? '' : titleId;
      const res: any = await api.equipTitle(targetId);
      if (res?.success) {
        await refreshUser();
        // Update local list
        setTitles(prev => prev.map(t => ({
          ...t,
          isEquipped: t.id === targetId,
        })));
      } else {
        alert(res?.error || 'Could not equip title.');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to equip title');
    } finally {
      setEquippingTitleId(null);
    }
  };

  const openShowcaseModal = async () => {
    setShowShowcaseModal(true);
    try {
      const res: any = await api.getBadges();
      if (res?.success && Array.isArray(res.data)) {
        setAvailableBadges(res.data);
      }
      setSelectedFeatured(user?.featuredBadges || []);
    } catch (err) {
      console.error('Failed to load badges for showcase:', err);
    }
  };

  const toggleFeaturedBadge = (badgeId: string) => {
    if (selectedFeatured.includes(badgeId)) {
      setSelectedFeatured(selectedFeatured.filter(id => id !== badgeId));
    } else {
      if (selectedFeatured.length >= 6) {
        alert('You can showcase up to 6 achievements at once.');
        return;
      }
      setSelectedFeatured([...selectedFeatured, badgeId]);
    }
  };

  const handleSaveShowcase = async () => {
    setSavingShowcase(true);
    try {
      const res: any = await api.updateFeaturedBadges(selectedFeatured);
      if (res?.success) {
        await refreshUser();
        setShowShowcaseModal(false);
      } else {
        alert(res?.error || 'Could not update showcase.');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update showcase');
    } finally {
      setSavingShowcase(false);
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

  const userRP = user?.rankPoints ?? 0;
  const currentRankTier = (user?.rankTier as CompetitiveRankTier) || getRankTierFromRP(userRP);
  const nextRankTier = getNextRankTier(currentRankTier);
  const rpNeeded = getRPNeededForNextTier(userRP);

  const activeTitle = titles.find(t => t.id === user?.equippedTitle) || (user?.equippedTitle ? {
    id: user.equippedTitle,
    name: user.equippedTitle.replace('title_', '').replace(/_/g, ' ').toUpperCase(),
    rarity: 'Rare' as const,
  } : null);

  const activeTitleTheme = activeTitle ? (TITLE_RARITY_THEMES[activeTitle.rarity] || TITLE_RARITY_THEMES.Rare) : null;

  return (
    <SportxBackground src="/images/bg-profile.jpg" overlayOpacity={0.88} accentGlow="neon">
      <div className="space-y-4 pb-12 animate-fade-in relative z-10 max-w-4xl mx-auto">
        {/* Header */}
        <header className="pt-2 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-neon animate-pulse" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-neon">
                ATHLETE PASSPORT & BIOMETRICS
              </span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight uppercase font-outfit">
              PROFILE & PROGRESSION
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-sm btn-primary flex items-center gap-1.5 py-2 px-3.5 text-xs font-outfit font-black uppercase tracking-wider shadow-glow cursor-pointer"
              onClick={openEditProfile}
            >
              <Edit3 size={13} />
              <span>Edit Profile</span>
            </button>
            <button
              type="button"
              className="btn btn-sm btn-secondary flex items-center gap-1.5 py-2 px-3 text-xs font-mono font-bold cursor-pointer border border-white/10 hover:border-rose-500/40 hover:text-rose-400"
              onClick={() => setShowBugModal(true)}
            >
              <Bug size={13} className="text-rose-400" />
              <span>Report Bug</span>
            </button>
          </div>
        </header>

        {/* Athlete Identity Card (Passport ID) */}
        <div className="hud-panel-neon p-6 text-center relative overflow-hidden">
          {/* Glow backdrop */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-neon/15 blur-3xl rounded-full pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center">
            <div className="relative mb-3">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-neon via-cyan to-blue-500 p-0.5 shadow-glow">
                <div className="w-full h-full bg-obsidian rounded-[22px] flex items-center justify-center text-3xl font-black text-white font-outfit">
                  {user?.name?.[0]?.toUpperCase() || 'A'}
                </div>
              </div>
              <span className="absolute -bottom-1 -right-1 px-2.5 py-0.5 rounded-full bg-neon text-obsidian text-[10px] font-black border-2 border-obsidian font-mono">
                LVL {athleteLevel}
              </span>
            </div>

            <h2 className="text-xl font-black text-white tracking-tight uppercase font-outfit">
              {user?.name || 'Student Athlete'}
            </h2>

            {/* Equipped Athlete Title Chip */}
            <div className="mt-1.5 mb-1 flex items-center justify-center">
              {user?.equippedTitle && activeTitle ? (
                <button
                  onClick={openTitlesModal}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[11px] font-mono font-black uppercase tracking-wider border shadow-glow-sm hover:scale-105 transition cursor-pointer ${activeTitleTheme?.badge}`}
                >
                  <Crown size={13} />
                  <span>{activeTitle.name}</span>
                  <span className="text-[9px] text-slate-400 font-normal ml-0.5 underline">Change</span>
                </button>
              ) : (
                <button
                  onClick={openTitlesModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold text-slate-400 border border-dashed border-white/20 hover:border-neon/50 hover:text-neon transition cursor-pointer bg-white/5"
                >
                  <Crown size={12} />
                  <span>+ Equip Athlete Title</span>
                </button>
              )}
            </div>

            <p className="text-xs font-mono text-slate-400 mt-0.5">{user?.email || 'athlete@campus.edu'}</p>

            <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
              {user?.collegeName && (
                <span className="badge-pill text-[10px] font-mono flex items-center gap-1">
                  <School size={11} />
                  <span>{user.collegeName}</span>
                </span>
              )}
              {user?.department && (
                <span className="badge-cyan text-[10px] font-mono">
                  {user.department}
                </span>
              )}
              <span className="badge-pill text-[10px] font-mono flex items-center gap-1 border-neon/30 text-neon bg-neon/10">
                <Zap size={10} />
                <span>Fitness: {currentLevelDisplay}</span>
              </span>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-4 gap-2 w-full mt-5 pt-4 border-t border-white/10">
              <div className="p-2.5 rounded-xl bg-obsidian/70 border border-white/5">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">XP</span>
                <span className="text-sm font-black text-neon font-outfit tabular-nums mt-0.5 block">
                  {(user?.totalXp ?? 0).toLocaleString()}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-obsidian/70 border border-white/5">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Streak</span>
                <span className="text-sm font-black text-amber-400 font-outfit tabular-nums mt-0.5 flex items-center justify-center gap-1">
                  <Flame size={14} className="text-amber-400 fill-amber-400/20" />
                  <span>{user?.currentStreak ?? 0}d</span>
                </span>
                <span className="text-[9px] font-mono text-slate-400 font-bold block truncate">
                  Best: {user?.longestStreak || user?.bestStreak || 0}d
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-obsidian/70 border border-white/5">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Goal</span>
                <span className="text-xs font-black text-white font-outfit capitalize truncate mt-0.5 block">
                  {user?.fitnessGoal || 'Fitness'}
                </span>
              </div>

              <div 
                onClick={openEditProfile}
                className="p-2.5 rounded-xl bg-obsidian/70 border border-white/5 hover:border-neon/40 transition-colors cursor-pointer"
              >
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Fitness</span>
                <span className="text-xs font-black text-neon font-outfit capitalize truncate mt-0.5 block">
                  {currentLevelDisplay}
                </span>
              </div>
            </div>
          </div>
        </div>

      {/* ── Step 7: Performance Score ─────────────────────────── */}
      <PerformanceScoreCard />

      {/* ── Step 7: Goals & Friends Hub Summary ────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Goals Summary Card */}
        <div
          onClick={() => setShowGoalsModal(true)}
          className="hud-panel p-4 flex flex-col justify-between group cursor-pointer hover:border-neon/50 transition-all shadow-glow-sm"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-xl bg-neon/15 text-neon flex items-center justify-center border border-neon/30">
                <Target size={16} />
              </div>
              <span className="text-[10px] font-mono font-bold text-neon uppercase tracking-wider">MANAGE</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">ATHLETIC GOALS</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-white font-outfit tabular-nums">{goalsSummary.active}</span>
              <span className="text-xs text-slate-400 font-medium">Active</span>
              <span className="text-[10px] text-slate-500 ml-1">({goalsSummary.completed} done)</span>
            </div>
          </div>
          <div className="mt-3 text-[10px] font-mono font-bold text-slate-400 flex items-center gap-0.5 group-hover:text-neon transition">
            <span>VIEW GOALS HUB</span>
            <ChevronRight size={12} />
          </div>
        </div>

        {/* Friends Count Card */}
        <div
          onClick={() => setShowFriendsModal(true)}
          className="hud-panel p-4 flex flex-col justify-between group cursor-pointer hover:border-cyan/50 transition-all"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-xl bg-cyan/15 text-cyan flex items-center justify-center border border-cyan/30">
                <Users size={16} />
              </div>
              <span className="text-[10px] font-mono font-bold text-cyan uppercase tracking-wider">ROSTER</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">CONNECTED ATHLETES</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-black text-white font-outfit tabular-nums">{friendsCount}</span>
              <span className="text-xs text-slate-400 font-medium">Athletes</span>
            </div>
          </div>
          <div className="mt-3 text-[10px] font-mono font-bold text-slate-400 flex items-center gap-0.5 group-hover:text-cyan transition">
            <span>FIND & CHALLENGE</span>
            <ChevronRight size={12} />
          </div>
        </div>
      </div>

      {/* Featured Achievements Showcase */}
      <div className="hud-panel p-4 relative overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-neon/15 text-neon flex items-center justify-center border border-neon/30">
              <Award size={16} />
            </div>
            <div>
              <span className="text-[10px] font-mono font-black uppercase tracking-wider text-neon block">ATHLETE TROPHY CASE</span>
              <h3 className="text-sm font-black text-white font-outfit uppercase">FEATURED ACHIEVEMENTS</h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={openShowcaseModal}
              className="btn btn-sm btn-secondary py-1.5 px-3 text-[11px] font-mono font-bold flex items-center gap-1 border border-white/10 hover:text-neon cursor-pointer"
            >
              <Edit3 size={11} />
              <span>EDIT CASE</span>
            </button>
            <button
              onClick={() => navigate('/badges')}
              className="btn btn-sm btn-primary py-1.5 px-3 text-[11px] font-mono font-bold flex items-center gap-1 shadow-glow-sm cursor-pointer"
            >
              <span>ALL BADGES</span>
              <ChevronRight size={12} />
            </button>
          </div>
        </div>

        {/* 3 to 6 Showcase Slots */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1">
          {[0, 1, 2, 3, 4, 5].map((idx) => {
            const badgeId = (user?.featuredBadges || [])[idx];
            return (
              <div
                key={idx}
                onClick={openShowcaseModal}
                className="group relative flex flex-col items-center justify-center p-2.5 rounded-xl border border-white/10 bg-obsidian/70 hover:border-neon/50 hover:shadow-glow-sm transition cursor-pointer min-h-[72px]"
              >
                {badgeId ? (
                  <>
                    <Trophy size={22} className="text-amber-400 mb-1 filter drop-shadow" />
                    <span className="text-[10px] font-mono font-bold text-slate-300 text-center truncate max-w-full">
                      {badgeId.replace(/_/g, ' ').replace('streak', 'Day Streak').replace('reps', 'Reps')}
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-6 h-6 rounded-lg border border-dashed border-white/20 flex items-center justify-center text-slate-500 group-hover:text-neon group-hover:border-neon transition">
                      <Plus size={12} />
                    </div>
                    <span className="text-[9px] font-mono text-slate-500 font-bold mt-1 uppercase">Empty Slot</span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Authoritative Competitive Ranking Standing */}
      <div className="hud-panel-amber p-4 relative overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Trophy size={16} />
            </div>
            <div>
              <span className="text-[10px] font-mono font-black uppercase tracking-wider text-amber-400 block">COMPETITIVE DIVISION</span>
              <h3 className="text-sm font-black text-white font-outfit uppercase">RANKED ARENA TELEMETRY</h3>
            </div>
          </div>
          <button
            onClick={() => navigate('/competitive')}
            className="btn btn-sm btn-primary py-1.5 px-3 text-[11px] font-outfit font-black uppercase tracking-wider flex items-center gap-1 shadow-glow-sm cursor-pointer"
          >
            <Swords size={12} />
            <span>Enter Arena</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-2 border-t border-white/10">
          <div className="p-2.5 rounded-xl bg-obsidian/70 border border-white/5">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Current Rank</span>
            <span className="text-sm font-black text-amber-300 font-outfit mt-0.5 block">
              {currentRankTier}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-obsidian/70 border border-white/5">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">RP</span>
            <span className="text-sm font-black text-white font-outfit tabular-nums mt-0.5 block">
              {userRP}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-obsidian/70 border border-white/5">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Next Rank</span>
            <span className="text-sm font-black text-cyan font-outfit mt-0.5 block">
              {nextRankTier || 'None (Max)'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-obsidian/70 border border-white/5">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">RP Needed</span>
            <span className="text-sm font-black text-neon font-outfit tabular-nums mt-0.5 block">
              {rpNeeded !== null ? rpNeeded : '0 (Max)'}
            </span>
          </div>
        </div>
      </div>

      {/* Settings Navigation List */}
      <section className="space-y-2">
        <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider px-1">
          PREFERENCES & CALIBRATION
        </h3>

        <div className="space-y-2">
          {[
            {
              icon: Crown,
              label: 'Athlete Titles',
              desc: 'Manage and equip prestigious earned titles',
              action: openTitlesModal,
            },
            {
              icon: Award,
              label: 'Achievements & Milestones',
              desc: 'Explore the full trophy room & progression catalog',
              action: () => navigate('/badges'),
            },
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
                className="hud-panel p-3.5 flex items-center justify-between hover:border-neon/40 transition-all text-left w-full cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-surface border border-white/10 flex items-center justify-center text-slate-300 group-hover:text-neon group-hover:border-neon/40 transition-all">
                    <Icon size={18} />
                  </div>
                  <div>
                    <div className="font-bold text-sm text-white group-hover:text-neon transition-colors font-outfit">
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
        <h3 className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wider px-1 mb-2">
          SESSION SECURITY
        </h3>
        <div className="hud-panel border-rose-500/30 bg-rose-950/15 p-4">
          <button
            type="button"
            className="w-full text-left flex items-center justify-between cursor-pointer bg-transparent border-none text-rose-300 hover:text-rose-200"
            onClick={handleLogout}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <LogOut size={16} />
              </div>
              <div>
                <span className="font-bold text-sm text-rose-300 font-outfit">Sign Out of Athlete Account</span>
                <p className="text-[11px] text-slate-400 mt-0.5">End current session on this device</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-rose-400" />
          </button>
        </div>
      </section>

      {/* Manage Titles Modal */}
      {showTitlesModal && (
        <div
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowTitlesModal(false)}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in" />
          <div
            className="relative w-full max-w-[500px] max-h-[85vh] overflow-hidden rounded-t-3xl sm:rounded-3xl p-6 animate-slide-up bg-card border border-white/10 shadow-2xl flex flex-col space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                  <Crown size={16} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white tracking-tight">Athlete Titles</h3>
                  <p className="text-[11px] text-slate-400">Equip an earned title to showcase your status</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTitlesModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Titles List */}
            <div className="overflow-y-auto space-y-2.5 pr-1 flex-1">
              {loadingTitles ? (
                <div className="py-12 text-center text-slate-500 text-xs font-bold animate-pulse">
                  Loading Athlete Titles…
                </div>
              ) : titles.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs font-bold">
                  No titles found.
                </div>
              ) : (
                titles.map(title => {
                  const theme = TITLE_RARITY_THEMES[title.rarity] || TITLE_RARITY_THEMES.Common;
                  const isEquipped = user?.equippedTitle === title.id;

                  return (
                    <div
                      key={title.id}
                      className={`p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 ${
                        isEquipped
                          ? 'bg-amber-950/30 border-amber-500/70 shadow-glow-sm'
                          : title.unlocked
                          ? 'bg-surface/60 border-white/10 hover:border-white/20'
                          : 'bg-surface/20 border-white/5 opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                          title.unlocked ? theme.border + ' bg-slate-900 text-white' : 'border-slate-800 bg-slate-950 text-slate-600'
                        }`}>
                          {title.unlocked ? <Crown size={16} className={theme.text} /> : <Lock size={14} />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-black text-white truncate">
                              {title.name}
                            </span>
                            <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded border ${theme.badge}`}>
                              {title.rarity}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                            {title.unlocked ? title.description : `Unlock requirement: ${title.unlockRequirement}`}
                          </p>
                        </div>
                      </div>

                      {title.unlocked ? (
                        <button
                          type="button"
                          onClick={() => handleEquipTitle(title.id)}
                          disabled={equippingTitleId === title.id}
                          className={`btn btn-sm py-1.5 px-3 text-xs font-bold shrink-0 cursor-pointer ${
                            isEquipped
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                              : 'btn-primary shadow-glow-sm'
                          }`}
                        >
                          {isEquipped ? 'Equipped' : 'Equip'}
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 py-1 shrink-0">
                          Locked
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Featured Showcase Modal */}
      {showShowcaseModal && (
        <div
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowShowcaseModal(false)}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in" />
          <div
            className="relative w-full max-w-[500px] max-h-[85vh] overflow-hidden rounded-t-3xl sm:rounded-3xl p-6 animate-slide-up bg-card border border-white/10 shadow-2xl flex flex-col space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-neon/15 flex items-center justify-center text-neon">
                  <Award size={16} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white tracking-tight">Edit Featured Showcase</h3>
                  <p className="text-[11px] text-slate-400">Select up to 6 unlocked achievements to display on your profile ({selectedFeatured.length}/6)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowShowcaseModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Badges List */}
            <div className="overflow-y-auto space-y-2 pr-1 flex-1">
              {availableBadges.filter(b => b.unlocked).length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs font-bold">
                  No unlocked achievements yet. Complete workouts to earn badges!
                </div>
              ) : (
                availableBadges
                  .filter(b => b.unlocked)
                  .map(badge => {
                    const isSelected = selectedFeatured.includes(badge.id);
                    return (
                      <div
                        key={badge.id}
                        onClick={() => toggleFeaturedBadge(badge.id)}
                        className={`p-3 rounded-2xl border transition flex items-center justify-between gap-3 cursor-pointer ${
                          isSelected
                            ? 'bg-neon/15 border-neon shadow-glow-sm'
                            : 'bg-surface/50 border-white/5 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-2xl">{badge.icon}</span>
                          <div className="min-w-0">
                            <span className="text-xs font-black text-white block truncate">
                              {badge.name}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate block">
                              {badge.description}
                            </span>
                          </div>
                        </div>
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                          isSelected ? 'bg-neon border-neon text-black' : 'border-slate-700 bg-slate-900'
                        }`}>
                          {isSelected && <CheckCircle2 size={13} />}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2 shrink-0 border-t border-white/10">
              <button
                type="button"
                className="btn btn-secondary flex-1 py-2 text-xs font-bold"
                onClick={() => setShowShowcaseModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary flex-1 py-2 text-xs font-bold"
                onClick={handleSaveShowcase}
                disabled={savingShowcase}
              >
                {savingShowcase ? 'Saving…' : `Save Showcase (${selectedFeatured.length}/6)`}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Step 7 Modals */}
      <GoalsModal
        isOpen={showGoalsModal}
        onClose={() => setShowGoalsModal(false)}
        onGoalUpdated={fetchSocialStats}
      />
      <FriendsModal
        isOpen={showFriendsModal}
        onClose={() => setShowFriendsModal(false)}
        onChallengeFriend={(friend) => {
          setTargetFriend(friend);
          setShowFriendChallengeModal(true);
        }}
        onFriendsUpdated={fetchSocialStats}
      />
      <FriendChallengeModal
        isOpen={showFriendChallengeModal}
        onClose={() => {
          setShowFriendChallengeModal(false);
          setTargetFriend(null);
        }}
        targetFriend={targetFriend}
      />
    </div>
  </SportxBackground>
  );
}
