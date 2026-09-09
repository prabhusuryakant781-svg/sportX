import React, { useState } from 'react';
import { useLobbySocket } from '../hooks/useLobbySocket.js';
import CameraWorkout from './CameraWorkout.jsx';

export default function CompetitiveLobby({ currentUser = null, onExit = null }) {
  const [inputCode, setInputCode] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState({
    exerciseId: 'squat',
    durationSeconds: 60,
    targetReps: 20,
    mode: '60s Blitz',
  });

  const {
    roomCode,
    matchState,
    countdown,
    lobbySettings,
    players,
    createRoom,
    joinRoom,
    toggleReady,
    startMatch,
    updateLocalTelemetry,
    finishMatch,
  } = useLobbySocket(null, currentUser);

  const handleCreateLobby = (e) => {
    e.preventDefault();
    createRoom(config);
    setShowConfig(false);
  };

  const handleJoinLobby = (e) => {
    e.preventDefault();
    if (inputCode.length >= 4) {
      joinRoom(inputCode);
    }
  };

  // 1. Initial Room Code Selection / Creation Screen
  if (!roomCode) {
    return (
      <div className="section">
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <h1 style={{ fontSize: 26, fontWeight: 900 }}>⚔️ Live Duel Lobby</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
            Compete in real-time camera workout battles against fellow students!
          </p>
        </div>

        {showConfig ? (
          <div className="card scale-in" style={{ border: '1px solid rgba(108,99,255,0.4)' }}>
            <h3 style={{ marginBottom: 14 }}>⚙️ Configure Duel Match</h3>
            <form onSubmit={handleCreateLobby} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="form-group">
                <label>Exercise Type</label>
                <select
                  className="input"
                  value={config.exerciseId}
                  onChange={e => setConfig(c => ({ ...c, exerciseId: e.target.value }))}
                >
                  <option value="squat">Squats</option>
                  <option value="pushup">Push-ups</option>
                  <option value="jumping_jacks">Jumping Jacks</option>
                </select>
              </div>

              <div className="form-group">
                <label>Target Reps: {config.targetReps}</label>
                <input
                  type="range"
                  min="10"
                  max="50"
                  step="5"
                  value={config.targetReps}
                  onChange={e => setConfig(c => ({ ...c, targetReps: Number(e.target.value) }))}
                  style={{ width: '100%', accentColor: 'var(--accent)' }}
                />
              </div>

              <div className="form-group">
                <label>Duel Mode</label>
                <select
                  className="input"
                  value={config.mode}
                  onChange={e => setConfig(c => ({ ...c, mode: e.target.value }))}
                >
                  <option value="60s Blitz">60s Blitz</option>
                  <option value="Target Race">First to Target Reps</option>
                  <option value="Survival Mode">Form Survival</option>
                </select>
              </div>

              <div className="flex gap-8" style={{ marginTop: 8 }}>
                <button type="button" className="btn btn-secondary btn-full" onClick={() => setShowConfig(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-full">
                  ⚡ Generate Room Code
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Create Room Card */}
            <div className="card text-center" style={{ border: '1px dashed rgba(108,99,255,0.5)', padding: 24 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>👑</div>
              <h3 style={{ marginBottom: 6 }}>Host a New Room</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
                Create a 6-character room code and invite your campus peers.
              </p>
              <button className="btn btn-primary btn-full" onClick={() => setShowConfig(true)}>
                + Create Competitive Lobby
              </button>
            </div>

            {/* Join Room Card */}
            <div className="card">
              <h4 style={{ marginBottom: 10 }}>🔑 Join Room with Code</h4>
              <form onSubmit={handleJoinLobby} className="flex gap-8">
                <input
                  type="text"
                  placeholder="Enter 6-char code (e.g. SPORTX)"
                  value={inputCode}
                  onChange={e => setInputCode(e.target.value.toUpperCase())}
                  className="input"
                  maxLength={6}
                  style={{ textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700 }}
                />
                <button type="submit" className="btn btn-secondary" disabled={inputCode.length < 4}>
                  Join
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. Pre-Match Waiting Room
  if (matchState === 'LOBBY') {
    return (
      <div className="section">
        <div className="card text-center" style={{ background: 'linear-gradient(135deg, rgba(108,99,255,0.15) 0%, rgba(13,14,21,0.9) 100%)', border: '1px solid rgba(108,99,255,0.4)', padding: 20 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>ROOM CODE</div>
          <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--accent)', letterSpacing: 4, margin: '4px 0' }}>
            {roomCode}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Share this code with your opponents to join!</p>

          <div className="flex justify-between" style={{ marginTop: 16, background: 'rgba(0,0,0,0.3)', padding: '8px 14px', borderRadius: 8, fontSize: 12 }}>
            <span>💪 Exercise: <b>{lobbySettings.exerciseId.replace('_', ' ')}</b></span>
            <span>🎯 Goal: <b>{lobbySettings.targetReps} reps</b></span>
          </div>
        </div>

        {/* Players Roster */}
        <div className="card">
          <h4 style={{ marginBottom: 12 }}>👥 Connected Athletes ({players.length})</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {players.map((p, idx) => (
              <div key={p.userId} className="flex justify-between items-center" style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: 10 }}>
                <div className="flex items-center gap-10">
                  <span style={{ fontSize: 22 }}>{p.avatar}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      {p.username} {p.isHost && <span style={{ color: 'var(--accent3)', fontSize: 11 }}>👑 Host</span>}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.college}</div>
                  </div>
                </div>
                <span className="stat-pill" style={{
                  background: p.isReady ? 'rgba(107,203,119,0.15)' : 'rgba(255,217,61,0.15)',
                  color: p.isReady ? '#6BCB77' : '#FFD93D',
                  fontSize: 11,
                  fontWeight: 700
                }}>
                  {p.isReady ? 'READY ✓' : 'WAITING…'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Ready & Start Action Controls */}
        <div className="flex gap-8">
          <button className="btn btn-secondary btn-full" onClick={toggleReady}>
            {players.find(p => p.isHost)?.isReady ? '✓ Ready' : 'Mark Ready'}
          </button>
          <button className="btn btn-primary btn-full" style={{ fontSize: 16 }} onClick={startMatch}>
            🚀 Start Duel Match!
          </button>
        </div>
      </div>
    );
  }

  // 3. Synchronized Countdown Overlay
  if (matchState === 'COUNTDOWN') {
    return (
      <div className="section" style={{ height: 350, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 16, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 2 }}>GET READY</div>
        <div style={{ fontSize: 110, fontWeight: 900, color: 'var(--accent)', textShadow: '0 0 40px var(--accent-glow)' }} className="scale-in">
          {countdown > 0 ? countdown : 'GO!'}
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-primary)' }}>Synchronizing Camera Feed…</div>
      </div>
    );
  }

  // 4. Live Duel Workout Mode Screen
  if (matchState === 'LIVE') {
    return (
      <div className="section">
        {/* Live Leaderboard Progress Header */}
        <div className="card" style={{ background: 'rgba(13,14,21,0.95)', border: '1px solid rgba(108,99,255,0.4)', padding: 14 }}>
          <div className="flex justify-between items-center" style={{ marginBottom: 10 }}>
            <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--accent)' }}>⚡ LIVE DUEL LEADERBOARD</span>
            <button className="btn btn-danger btn-sm" onClick={finishMatch}>End Match</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {players.map((p, rank) => {
              const pct = Math.min(100, Math.round((p.currentReps / lobbySettings.targetReps) * 100));
              return (
                <div key={p.userId} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div className="flex justify-between" style={{ fontSize: 12, fontWeight: 700 }}>
                    <span>#{rank + 1} {p.avatar} {p.username}</span>
                    <span>{p.currentReps} / {lobbySettings.targetReps} reps ({p.formScore} Form)</span>
                  </div>
                  <div style={{ width: '100%', height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: rank === 0 ? 'linear-gradient(90deg, #6C63FF, #6BCB77)' : '#6C63FF',
                      transition: 'width 0.4s ease'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Integrated Camera AI Vision Engine */}
        <CameraWorkout
          exerciseId={lobbySettings.exerciseId}
          isDuelMode={true}
          onTelemetryUpdate={updateLocalTelemetry}
          onFinishWorkout={finishMatch}
        />
      </div>
    );
  }

  // 5. Post-Lobby Match Podium & Results Screen
  if (matchState === 'PODIUM') {
    const winner = players[0];
    return (
      <div className="section text-center">
        <div style={{ fontSize: 56, marginBottom: 4 }}>🏆</div>
        <h2>Match Completed!</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Live Duel Podium & Awards</p>

        {/* Podium Stand */}
        <div className="card scale-in" style={{ background: 'linear-gradient(180deg, rgba(255,217,61,0.12) 0%, rgba(13,14,21,0.9) 100%)', border: '1px solid rgba(255,217,61,0.4)', padding: 20, margin: '16px 0' }}>
          <div style={{ fontSize: 12, color: 'var(--accent3)', fontWeight: 800, textTransform: 'uppercase' }}>🥇 DUEL CHAMPION</div>
          <div style={{ fontSize: 24, fontWeight: 900, margin: '6px 0' }}>{winner?.username}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{winner?.college}</div>

          <div className="flex justify-between" style={{ marginTop: 16, background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 10 }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>TOTAL REPS</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)' }}>{winner?.currentReps}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>FORM SCORE</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#6BCB77' }}>{winner?.formScore}%</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>XP AWARDED</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent3)' }}>+{winner?.currentReps * 12 + 150} XP</div>
            </div>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="card text-left">
          <h4 style={{ marginBottom: 10 }}>Final Duel Rankings</h4>
          {players.map((p, idx) => (
            <div key={p.userId} className="flex justify-between items-center" style={{ padding: '8px 0', borderBottom: idx < players.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
              <div className="flex items-center gap-10">
                <span style={{ fontWeight: 800, width: 20 }}>#{idx + 1}</span>
                <span>{p.avatar} {p.username}</span>
              </div>
              <span style={{ fontWeight: 700, fontSize: 13 }}>{p.currentReps} reps</span>
            </div>
          ))}
        </div>

        <button className="btn btn-primary btn-full" style={{ fontSize: 16 }} onClick={onExit || (() => window.location.reload())}>
          🏠 Back to Dashboard
        </button>
      </div>
    );
  }

  return null;
}
