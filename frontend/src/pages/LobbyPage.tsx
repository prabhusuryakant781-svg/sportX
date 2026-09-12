import { useNavigate } from 'react-router-dom';
import CompetitiveLobby from '../components/CompetitiveLobby';
import { useAuth } from '../context/AuthContext';

export default function LobbyPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-obsidian">
      <div className="page-header">
        <h1 className="text-white">Multiplayer Modes</h1>
        <p className="text-sm mt-1 text-slate-400">Join friends via room code or battle in global matchmaking.</p>

        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-2 mt-4 p-1 bg-slate-900/90 rounded-xl border border-white/10">
          <button
            className="flex-1 py-2 px-3 rounded-lg text-xs font-bold bg-blue-600 text-white shadow transition"
          >
            🏷️ Room Code Lobby
          </button>
          <button
            onClick={() => navigate('/competitive')}
            className="flex-1 py-2 px-3 rounded-lg text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            ⚡ Global Matchmaking
          </button>
        </div>
      </div>

      {/* Existing Room-Code Lobby Component Preserved Exactly As Is */}
      <CompetitiveLobby
        currentUser={user}
        onExit={() => navigate('/dashboard')}
      />
    </div>
  );
}
