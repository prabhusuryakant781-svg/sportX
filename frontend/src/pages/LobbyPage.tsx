import { useNavigate } from 'react-router-dom';
import CompetitiveLobby from '../components/CompetitiveLobby';
import { useAuth } from '../context/AuthContext';
import { Swords, Trophy, Users, Shield } from 'lucide-react';

export default function LobbyPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="space-y-4 pb-8 animate-fade-in">
      {/* Arena Header */}
      <header className="pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <Swords size={18} />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Competitive Arena</span>
          </div>
          <button
            onClick={() => navigate('/leaderboard')}
            className="text-xs font-semibold text-slate-400 hover:text-amber-400 transition-colors flex items-center gap-1 cursor-pointer"
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
        <div className="flex rounded-xl p-1 mt-3 bg-surface/60 border border-white/5">
          <button
            type="button"
            className="flex-1 py-2 rounded-lg border-none cursor-pointer font-outfit font-bold text-xs tracking-wider uppercase bg-gradient-hero text-white shadow-glow-sm transition-all"
          >
            🏷️ Room Code Lobby
          </button>
          <button
            type="button"
            onClick={() => navigate('/competitive')}
            className="flex-1 py-2 rounded-lg border-none cursor-pointer font-outfit font-bold text-xs tracking-wider uppercase bg-transparent text-slate-400 hover:text-white transition-all"
          >
            ⚡ Global Matchmaking
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
