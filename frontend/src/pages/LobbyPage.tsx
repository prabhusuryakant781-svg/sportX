import { useNavigate } from 'react-router-dom';
import CompetitiveLobby from '../components/CompetitiveLobby';
import { useAuth } from '../context/AuthContext';
import { Swords, Trophy, Users, Zap } from 'lucide-react';

export default function LobbyPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-4 pb-8 animate-fade-in">
      {/* Arena Header */}
      <header className="pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Swords size={18} />
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-amber-400">Competitive Arena</span>
          </div>
          <button
            onClick={() => navigate('/leaderboard')}
            className="text-xs font-bold text-slate-400 hover:text-amber-400 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Trophy size={14} className="text-amber-400" />
            <span>Leaderboard</span>
          </button>
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight mt-1">Multiplayer Battles</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Real-time synchronized computer-vision rep competitions.
        </p>

        {/* Mode Selector Tabs */}
        <div className="flex rounded-xl p-1 mt-3 bg-surface border border-white/5">
          <button
            type="button"
            className="flex-1 py-2 rounded-lg border-none cursor-pointer font-outfit font-black text-xs tracking-wider uppercase bg-neon text-obsidian shadow-glow-sm transition-all flex items-center justify-center gap-1.5"
          >
            <Users size={14} />
            <span>Room Code Lobby</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/competitive')}
            className="flex-1 py-2 rounded-lg border-none cursor-pointer font-outfit font-black text-xs tracking-wider uppercase bg-transparent text-slate-400 hover:text-white transition-all flex items-center justify-center gap-1.5"
          >
            <Zap size={14} className="text-cyan" />
            <span>Global Matchmaking</span>
          </button>
        </div>
      </header>

      {/* Existing Room-Code Lobby Component Preserved Exactly As Is */}
      <CompetitiveLobby
        currentUser={user}
        onExit={() => navigate('/dashboard')}
      />
    </div>
  );
}
