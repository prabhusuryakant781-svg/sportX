import { useState } from 'react';
import { useLobbySocket } from '../hooks/useLobbySocket';
import type { LobbyPlayer, LobbySettings } from '../types';
import GoalRing from './GoalRing';
import { 
  Swords, 
  Crown, 
  Copy, 
  Check, 
  Play, 
  Users, 
  Trophy, 
  ArrowLeft, 
  ShieldAlert, 
  Activity, 
  Zap, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  Award
} from 'lucide-react';

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
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ── Menu — Create or Join Arena ──────────────────────────
  if (view === 'menu' && matchState === 'LOBBY' && !roomCode) {
    return (
      <div className="space-y-4 animate-fade-in">
        {/* Arena Welcome Card */}
        <div className="card-glass border-amber-500/30 p-6 text-center relative overflow-hidden bg-gradient-to-b from-amber-500/10 via-card to-card shadow-card">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center mx-auto mb-3 shadow-glow-amber border border-amber-500/30">
            <Swords size={32} />
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">Arena Battle Station</h2>
          <p className="text-xs text-slate-300 max-w-[280px] mx-auto mt-1 leading-relaxed">
            Host a room or enter with an invite code to battle friends in real-time camera rep competitions.
          </p>

          <button
            type="button"
            className="btn btn-primary btn-full mt-5 py-3.5 flex items-center justify-center gap-2 font-black shadow-glow"
            onClick={() => { createRoom(); setView('lobby'); }}
          >
            <Zap size={16} className="fill-current" />
            <span>Host New Arena Match</span>
          </button>
        </div>

        {/* Join by Code Card */}
        <div className="card p-5 border border-white/10 space-y-3">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Users size={14} className="text-cyan" />
            <span>Join with Room Code</span>
          </label>

          <div className="flex gap-2">
            <input
              className="input font-mono font-bold tracking-widest text-center uppercase text-base"
              placeholder="SPX-420"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              maxLength={8}
            />
            <button
              type="button"
              className="btn btn-secondary px-5 font-bold disabled:opacity-40"
              onClick={() => { joinRoom(joinCode); setView('lobby'); }}
              disabled={joinCode.trim().length < 4}
            >
              Join
            </button>
          </div>
          <span className="text-[11px] text-slate-400 block">
            Ask the match host for their 6-character room code.
          </span>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-full py-3 flex items-center justify-center gap-2"
          onClick={onExit}
        >
          <ArrowLeft size={16} />
          <span>Return to Dashboard</span>
        </button>
      </div>
    );
  }

  // ── Lobby — Waiting Room ─────────────────────────────────
  if (matchState === 'LOBBY') {
    const allReady = players.every(p => p.isReady);
    const host = players.find(p => p.isHost);
    const isCurrentUserHost = host?.userId === currentUser?.id;

    return (
      <div className="space-y-4 animate-fade-in">
        {/* Room Header Card with Code */}
        <div className="card-glass border-neon/30 p-4 flex items-center justify-between shadow-card">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Arena Room Code
            </span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-2xl font-black font-mono tracking-widest text-neon">
                {roomCode}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="p-1.5 rounded-lg bg-surface hover:bg-surface-light border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Copy room code"
              >
                {copied ? <Check size={14} className="text-neon" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={onExit}
          >
            ✕ Leave
          </button>
        </div>

        {/* Match Rule Settings */}
        <div className="card p-4 border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Exercise Drill</span>
            <select
              className="input py-1.5 px-3 text-xs w-auto font-bold bg-surface border border-white/10"
              value={lobbySettings.exerciseId}
              onChange={e => setLobbySettings((s: LobbySettings) => ({ ...s, exerciseId: e.target.value }))}
            >
              <option value="squat">🏋️ Bodyweight Squats</option>
              <option value="pushup">💪 Standard Push-Ups</option>
              <option value="jumping_jacks">⭐ Jumping Jacks</option>
            </select>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <span className="text-xs font-semibold text-slate-400">Match Mode</span>
            <span className="badge-pill uppercase text-[10px]">{lobbySettings.mode}</span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <span className="text-xs font-semibold text-slate-400">Target Reps</span>
            <span className="text-xs font-black text-white tabular-nums font-outfit">
              {lobbySettings.targetReps} reps
            </span>
          </div>
        </div>

        {/* Competitor Roster */}
        <div>
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Competitors ({players.length})
            </span>
            <span className="text-[11px] text-slate-400">
              {players.filter(p => p.isReady).length}/{players.length} Ready
            </span>
          </div>

          <div className="space-y-2">
            {players.map(p => (
              <div
                key={p.userId}
                className={`card p-3.5 flex items-center gap-3 border transition-colors ${
                  p.isReady ? 'border-neon/40 bg-neon/5' : 'border-white/5'
                }`}
              >
                <div className="w-10 h-10 rounded-2xl bg-surface flex items-center justify-center text-xl flex-shrink-0">
                  {p.avatar || '👤'}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-white truncate">{p.username}</span>
                    {p.isHost && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.2 rounded-full">
                        <Crown size={10} />
                        <span>HOST</span>
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">{p.college || 'Collegiate Division'}</div>
                </div>

                <div className="flex items-center gap-1">
                  {p.isReady ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <CheckCircle2 size={13} />
                      <span>Ready</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/25">
                      <Clock size={13} />
                      <span>Waiting</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lobby Action Controls */}
        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            className="btn btn-secondary flex-1 py-3.5 font-bold"
            onClick={toggleReady}
          >
            {host?.isReady ? '🔓 Mark Unready' : '✅ Mark Ready'}
          </button>

          {host?.isReady && allReady && (
            <button
              type="button"
              className="btn btn-primary flex-1 py-3.5 font-black shadow-glow flex items-center justify-center gap-2"
              onClick={startMatch}
            >
              <Play size={16} className="fill-current" />
              <span>Start Match</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Countdown State ──────────────────────────────────────
  if (matchState === 'COUNTDOWN') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="relative flex items-center justify-center mb-4">
          <div className="absolute w-40 h-40 bg-neon/20 rounded-full blur-2xl animate-pulse" />
          <div className="text-9xl font-black text-neon animate-scale-in font-outfit tabular-nums drop-shadow-[0_0_30px_rgba(16,185,129,0.7)]">
            {countdown}
          </div>
        </div>
        <h3 className="text-xl font-black text-white tracking-tight uppercase">Get in Camera Frame!</h3>
        <p className="text-xs text-slate-400 mt-1">Calibrating synchronized real-time rep detectors…</p>
      </div>
    );
  }

  // ── Live Match HUD ───────────────────────────────────────
  if (matchState === 'LIVE') {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="card-glass border-rose-500/30 p-3.5 flex justify-between items-center bg-rose-950/20">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider">🔴 LIVE MATCH STREAM</h3>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-danger py-1 px-3 text-xs font-bold"
            onClick={finishMatch}
          >
            End Match
          </button>
        </div>

        {/* Live Competitor Scoreboard */}
        <div className="space-y-2.5">
          {players.map((p, i) => {
            const pct = Math.min(100, (p.currentReps / Math.max(1, lobbySettings.targetReps)) * 100);
            return (
              <div
                key={p.userId}
                className={`card p-4 transition-all ${
                  p.isHost ? 'border-neon/40 shadow-glow-sm' : 'border-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-base font-black text-slate-400 w-6 tabular-nums font-outfit">
                    #{i + 1}
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center text-lg flex-shrink-0">
                    {p.avatar || '👤'}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="font-bold text-sm text-white truncate">{p.username}</span>
                      <span className="text-lg font-black text-neon tabular-nums font-outfit">
                        {p.currentReps} <span className="text-xs text-slate-400 font-normal">/ {lobbySettings.targetReps}</span>
                      </span>
                    </div>

                    {/* Real-Time Animated Rep Progress Bar */}
                    <div className="xp-bar-track">
                      <div className="xp-bar-fill" style={{ width: `${pct}%` }} />
                    </div>

                    <div className="flex justify-between items-center mt-1.5 text-[10px] text-slate-400 font-medium">
                      <span>Form Score: {p.formScore}%</span>
                      <span>🔥 {p.currentStreak || 0} Streak</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Podium Victory Screen ────────────────────────────────
  if (matchState === 'PODIUM') {
    const sorted = [...players].sort(
      (a, b) => b.currentReps * (b.formScore / 100) - a.currentReps * (a.formScore / 100)
    );
    const medalIcons = ['🥇', '🥈', '🥉'];

    return (
      <div className="space-y-4 animate-fade-in text-center py-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center mx-auto mb-2 border border-amber-500/30 shadow-glow-amber">
          <Trophy size={32} />
        </div>
        <h2 className="text-2xl font-black text-white tracking-tight">Arena Battle Complete!</h2>
        <p className="text-xs text-slate-400 -mt-2">Final verified rep rankings & form quality scores</p>

        {/* Podium Cards */}
        <div className="space-y-2.5 mt-4 text-left">
          {sorted.map((p, i) => (
            <div
              key={p.userId}
              className={`card p-4 transition-all flex items-center gap-3.5 ${
                i === 0
                  ? 'border-amber-500/50 bg-gradient-to-r from-amber-500/15 to-card shadow-glow-amber'
                  : 'border-white/10'
              }`}
            >
              <span className="text-3xl flex-shrink-0">
                {medalIcons[i] || `#${i + 1}`}
              </span>

              <div className="w-11 h-11 rounded-2xl bg-surface flex items-center justify-center text-xl flex-shrink-0">
                {p.avatar || '👤'}
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-white truncate flex items-center gap-1.5">
                  <span>{p.username}</span>
                  {i === 0 && (
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/20 px-1.5 py-0.2 rounded">
                      WINNER
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400">{p.college || 'Collegiate Athlete'}</div>
              </div>

              <div className="text-right flex-shrink-0">
                <div className="text-xl font-black text-neon tabular-nums font-outfit">
                  {p.currentReps} <span className="text-xs text-slate-400 font-normal">reps</span>
                </div>
                <div className="text-[10px] text-slate-400 font-semibold">
                  Form: {p.formScore}%
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          className="btn btn-primary btn-full mt-6 py-4 font-black shadow-glow"
          onClick={onExit}
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return null;
}
