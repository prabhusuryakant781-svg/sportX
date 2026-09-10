import { useState } from 'react';
import { useLobbySocket } from '../hooks/useLobbySocket';
import type { LobbyPlayer, LobbySettings } from '../types';
import GoalRing from './GoalRing';

interface CompetitiveLobbyProps {
  currentUser?: { id: string; name: string } | null;
  onExit: () => void;
}

export default function CompetitiveLobby({ currentUser, onExit }: CompetitiveLobbyProps) {
  const {
    roomCode, matchState, countdown, lobbySettings, players,
    createRoom, joinRoom, toggleReady, startMatch, finishMatch, setLobbySettings,
  } = useLobbySocket(null, currentUser);

  const [joinCode, setJoinCode] = useState('');
  const [view, setView] = useState<'menu' | 'lobby'>('menu');

  // Menu — Create or Join
  if (view === 'menu' && matchState === 'LOBBY' && !roomCode) {
    return (
      <div className="section animate-in">
        <div className="text-center mb-4">
          <span className="text-5xl">⚔️</span>
          <h2 className="text-white mt-2">Competitive Mode</h2>
          <p className="text-sm text-muted mt-1">Challenge friends to a rep battle!</p>
        </div>

        <button className="btn btn-primary btn-full" onClick={() => { createRoom(); setView('lobby'); }}>
          🏟️ Create Room
        </button>

        <div className="flex items-center gap-3 my-2">
          <div className="divider flex-1" />
          <span className="text-xs text-muted">or</span>
          <div className="divider flex-1" />
        </div>

        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="Enter room code"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase())}
            maxLength={6}
          />
          <button
            className="btn btn-secondary"
            onClick={() => { joinRoom(joinCode); setView('lobby'); }}
            disabled={joinCode.length < 6}
          >
            Join
          </button>
        </div>

        <button className="btn btn-secondary btn-full mt-4" onClick={onExit}>
          ← Back
        </button>
      </div>
    );
  }

  // Lobby — Waiting Room
  if (matchState === 'LOBBY') {
    const allReady = players.every(p => p.isReady);
    const host = players.find(p => p.isHost);

    return (
      <div className="section animate-in">
        <div className="flex justify-between items-center">
          <h3 className="text-white">Room: <span className="text-neon font-mono">{roomCode}</span></h3>
          <button className="btn btn-sm btn-secondary" onClick={onExit}>✕</button>
        </div>

        {/* Settings */}
        <div className="card">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">Exercise</span>
            <select
              className="input py-1.5 px-3 text-sm w-auto"
              value={lobbySettings.exerciseId}
              onChange={e => setLobbySettings((s: LobbySettings) => ({ ...s, exerciseId: e.target.value }))}
            >
              <option value="squat">🏋️ Squats</option>
              <option value="pushup">💪 Push-ups</option>
              <option value="bicep_curl">💪 Bicep Curls</option>
            </select>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm text-muted">Mode</span>
            <span className="badge-pill">{lobbySettings.mode}</span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm text-muted">Target</span>
            <span className="text-sm text-white font-bold">{lobbySettings.targetReps} reps</span>
          </div>
        </div>

        {/* Players */}
        <h4 className="text-muted text-sm">Players ({players.length})</h4>
        <div className="flex flex-col gap-2">
          {players.map(p => (
            <div key={p.userId} className="card flex items-center gap-3 py-3">
              <span className="text-2xl">{p.avatar}</span>
              <div className="flex-1">
                <div className="font-semibold text-sm text-white">
                  {p.username} {p.isHost && <span className="text-amber text-xs">👑</span>}
                </div>
                <div className="text-xs text-muted">{p.college}</div>
              </div>
              <span className={`text-xs font-semibold ${p.isReady ? 'text-neon' : 'text-muted'}`}>
                {p.isReady ? '✅ Ready' : '⏳ Waiting'}
              </span>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button className="btn btn-secondary flex-1" onClick={toggleReady}>
            {host?.isReady ? '🔓 Unready' : '✅ Ready'}
          </button>
          {host?.isReady && allReady && (
            <button className="btn btn-primary flex-1" onClick={startMatch}>
              🚀 Start Match
            </button>
          )}
        </div>
      </div>
    );
  }

  // Countdown
  if (matchState === 'COUNTDOWN') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center scale-in">
          <div className="text-8xl font-black text-neon animate-pulse">{countdown}</div>
          <p className="text-muted mt-4">Get in position!</p>
        </div>
      </div>
    );
  }

  // Live Match HUD
  if (matchState === 'LIVE') {
    return (
      <div className="section animate-in">
        <div className="flex justify-between items-center">
          <h3 className="text-white">🔴 LIVE</h3>
          <button className="btn btn-sm btn-danger" onClick={finishMatch}>End</button>
        </div>

        {/* Leaderboard */}
        <div className="flex flex-col gap-2">
          {players.map((p, i) => {
            const pct = Math.min(100, (p.currentReps / lobbySettings.targetReps) * 100);
            return (
              <div key={p.userId} className={`card py-3 ${p.isHost ? 'border-neon/30' : ''}`}>
                <div className="flex items-center gap-3">
                  <span className="text-xl font-bold text-muted w-6">#{i + 1}</span>
                  <span className="text-xl">{p.avatar}</span>
                  <div className="flex-1">
                    <div className="font-semibold text-sm text-white">{p.username}</div>
                    <div className="xp-bar-track mt-1">
                      <div className="xp-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-neon">{p.currentReps}</div>
                    <div className="text-[10px] text-muted">Form: {p.formScore}%</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Podium
  if (matchState === 'PODIUM') {
    const sorted = [...players].sort(
      (a, b) => b.currentReps * (b.formScore / 100) - a.currentReps * (a.formScore / 100)
    );
    const medals = ['🥇', '🥈', '🥉'];

    return (
      <div className="section animate-in">
        <div className="text-center mb-4">
          <span className="text-5xl">🏆</span>
          <h2 className="text-white mt-2">Match Complete!</h2>
        </div>

        <div className="flex flex-col gap-3">
          {sorted.map((p, i) => (
            <div key={p.userId} className={`card py-4 ${i === 0 ? 'border-amber/40 bg-amber/5' : ''}`}>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{medals[i] || `#${i + 1}`}</span>
                <span className="text-2xl">{p.avatar}</span>
                <div className="flex-1">
                  <div className="font-bold text-white">{p.username}</div>
                  <div className="text-xs text-muted">{p.college}</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-black text-neon">{p.currentReps}</div>
                  <div className="text-xs text-muted">Form: {p.formScore}%</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button className="btn btn-primary btn-full mt-4" onClick={onExit}>
          🏠 Back to Home
        </button>
      </div>
    );
  }

  return null;
}
