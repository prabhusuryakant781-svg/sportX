import { useNavigate } from 'react-router-dom';
import CompetitiveLobby from '../components/CompetitiveLobby';
import SportxBackground from '../components/SportxBackground';
import { useAuth } from '../context/AuthContext';
import { Swords, Trophy, Users, Zap } from 'lucide-react';

export default function LobbyPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <SportxBackground src="/images/bg-compete.jpg" overlayOpacity={0.86} accentGlow="neon">
      <div className="space-y-4 pb-8 animate-fade-in relative z-10">
        {/* Arena Header */}
        <header className="pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/30 shadow-glow-sm">
                <Swords size={18} />
              </div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400">
                COMPETITIVE ARENA LOBBY
              </span>
            </div>
            <button
              onClick={() => navigate('/leaderboard')}
              className="text-xs font-mono font-bold text-slate-400 hover:text-amber-400 transition-colors flex items-center gap-1.5 cursor-pointer bg-white/5 px-3 py-1 rounded-lg border border-white/10"
            >
              <Trophy size={14} className="text-amber-400" />
              <span>LEADERBOARD</span>
            </button>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight uppercase font-outfit mt-1.5">
            MULTIPLAYER BATTLES
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time synchronized computer-vision rep competitions and room lobbies.
          </p>

          {/* Mode Selector Tabs */}
          <div className="flex rounded-xl p-1 mt-3 bg-obsidian-card/90 border border-white/10 backdrop-blur-md">
            <button
              type="button"
              className="flex-1 py-2.5 rounded-lg border-none cursor-pointer font-outfit font-black text-xs tracking-wider uppercase bg-neon text-obsidian shadow-glow-sm transition-all flex items-center justify-center gap-1.5"
            >
              <Users size={14} />
              <span>Room Code Lobby</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/competitive')}
              className="flex-1 py-2.5 rounded-lg border-none cursor-pointer font-outfit font-black text-xs tracking-wider uppercase bg-transparent text-slate-400 hover:text-white transition-all flex items-center justify-center gap-1.5"
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
    </SportxBackground>
  );
}
