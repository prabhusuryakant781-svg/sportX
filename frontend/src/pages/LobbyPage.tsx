import { useNavigate } from 'react-router-dom';
import CompetitiveLobby from '../components/CompetitiveLobby';
import { useAuth } from '../context/AuthContext';

export default function LobbyPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-obsidian">
      <div className="page-header">
        <h1 className="text-white">Lobby</h1>
        <p className="text-sm mt-1">Multiplayer competitive mode.</p>
      </div>

      <CompetitiveLobby
        currentUser={user}
        onExit={() => navigate('/dashboard')}
      />
    </div>
  );
}
