import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Swords, X, Play, Clock, Target, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import type { Friendship, FriendChallenge } from '../types';

interface FriendChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetFriend?: Friendship | null;
  onChallengeLaunched?: () => void;
}

export default function FriendChallengeModal({
  isOpen,
  onClose,
  targetFriend,
  onChallengeLaunched,
}: FriendChallengeModalProps) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'create' | 'active'>('create');
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [selectedFriendId, setSelectedFriendId] = useState<string>(targetFriend?.friendId || '');
  const [exerciseId, setExerciseId] = useState<'squat' | 'pushup' | 'jumping_jack'>('squat');
  const [challengeType, setChallengeType] = useState<'most_reps' | 'target_reps' | 'best_form'>('most_reps');
  const [targetReps, setTargetReps] = useState(25);
  const [durationSeconds, setDurationSeconds] = useState(90);
  const [challenges, setChallenges] = useState<FriendChallenge[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (targetFriend) {
      setSelectedFriendId(targetFriend.friendId);
      setTab('create');
    }
  }, [targetFriend]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [fRes, cRes]: any[] = await Promise.all([
        api.getFriends().catch(() => ({ data: [] })),
        api.getFriendChallenges().catch(() => ({ data: [] })),
      ]);
      setFriends(fRes?.data || []);
      setChallenges(cRes?.data || []);
      if (!selectedFriendId && (fRes?.data || []).length > 0) {
        setSelectedFriendId(fRes.data[0].friendId);
      }
    } catch (err) {
      console.error('Failed to load challenge data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFriendId) {
      setError('Please select a friend to challenge');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res: any = await api.createFriendChallenge({
        opponentId: selectedFriendId,
        exerciseId,
        challengeType,
        targetReps: Number(targetReps),
        durationSeconds: Number(durationSeconds),
      });

      if (res?.data) {
        await loadData();
        setTab('active');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to issue challenge');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRespond = async (challengeId: string, action: 'accept' | 'decline') => {
    try {
      await api.respondFriendChallenge(challengeId, action);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to respond to challenge');
    }
  };

  const handleStartChallengeCamera = (challenge: FriendChallenge) => {
    onClose();
    if (onChallengeLaunched) onChallengeLaunched();
    // Navigate to competitive camera with match details
    navigate(`/camera/competitive/${challenge.challengeId}`, {
      state: {
        matchId: challenge.challengeId,
        exerciseId: challenge.exerciseId,
        durationSeconds: challenge.durationSeconds,
        targetReps: challenge.targetReps,
        isFriendChallenge: true,
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="card-glass border border-white/10 w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl relative">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Swords size={18} />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight">Friend Challenges</h2>
              <p className="text-xs text-slate-400">Computer-Vision Verified Head-to-Head Battles</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-surface hover:bg-surface/80 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-5 pt-3 pb-2 border-b border-white/5 flex gap-2">
          <button
            onClick={() => setTab('create')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              tab === 'create'
                ? 'bg-amber-500 text-obsidian shadow-glow-sm'
                : 'bg-surface/50 text-slate-400 hover:text-white'
            }`}
          >
            Issue Challenge
          </button>
          <button
            onClick={() => setTab('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer relative ${
              tab === 'active'
                ? 'bg-amber-500 text-obsidian shadow-glow-sm'
                : 'bg-surface/50 text-slate-400 hover:text-white'
            }`}
          >
            Active Challenges ({challenges.length})
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle size={14} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {tab === 'create' ? (
            friends.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <Swords size={32} className="mx-auto text-slate-600" />
                <h4 className="text-sm font-bold text-white">No Friends Connected</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  You need at least one friend to issue challenges. Add friends in the Friends area!
                </p>
              </div>
            ) : (
              <form onSubmit={handleCreateChallenge} className="space-y-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Select Opponent</label>
                  <select
                    value={selectedFriendId}
                    onChange={(e) => setSelectedFriendId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-white/10 text-white text-xs focus:border-amber-400 focus:outline-none"
                    required
                  >
                    {friends.map((f) => (
                      <option key={f.friendId} value={f.friendId}>
                        {f.friendName} ({f.friendRankTier || 'Bronze'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Exercise Drill</label>
                    <select
                      value={exerciseId}
                      onChange={(e) => setExerciseId(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-surface border border-white/10 text-white text-xs focus:border-amber-400 focus:outline-none"
                    >
                      <option value="squat">Squats</option>
                      <option value="pushup">Push-Ups</option>
                      <option value="jumping_jack">Jumping Jacks</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Challenge Type</label>
                    <select
                      value={challengeType}
                      onChange={(e) => setChallengeType(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-surface border border-white/10 text-white text-xs focus:border-amber-400 focus:outline-none"
                    >
                      <option value="most_reps">Most Valid Reps</option>
                      <option value="target_reps">Target Reps Race</option>
                      <option value="best_form">Highest Form Score</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Target Reps</label>
                    <input
                      type="number"
                      min="5"
                      max="150"
                      value={targetReps}
                      onChange={(e) => setTargetReps(Math.max(5, parseInt(e.target.value) || 25))}
                      className="w-full px-3 py-2 rounded-xl bg-surface border border-white/10 text-white text-xs focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Time Limit (Seconds)</label>
                    <input
                      type="number"
                      min="30"
                      max="300"
                      step="15"
                      value={durationSeconds}
                      onChange={(e) => setDurationSeconds(Math.max(30, parseInt(e.target.value) || 90))}
                      className="w-full px-3 py-2 rounded-xl bg-surface border border-white/10 text-white text-xs focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full btn btn-primary py-2.5 mt-3 font-black shadow-glow bg-amber-500 hover:bg-amber-400 text-obsidian flex items-center justify-center gap-2"
                >
                  <Swords size={15} />
                  <span>{submitting ? 'Sending Challenge...' : 'Issue Challenge'}</span>
                </button>
              </form>
            )
          ) : (
            /* Active Challenges Tab */
            challenges.length === 0 ? (
              <div className="text-center py-8 space-y-2">
                <CheckCircle2 size={32} className="mx-auto text-slate-600" />
                <h4 className="text-sm font-bold text-white">No Active Challenges</h4>
                <p className="text-xs text-slate-400">
                  Challenges you send or receive will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {challenges.map((c) => (
                  <div
                    key={c.challengeId}
                    className="card p-3.5 border border-white/10 hover:border-white/20 transition space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                          <span>{c.challengerName}</span>
                          <span className="text-slate-500">vs</span>
                          <span>{c.opponentName}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {c.exerciseId.toUpperCase()} • {c.targetReps} reps • {c.durationSeconds}s
                        </div>
                      </div>

                      <span
                        className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                          c.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : c.status === 'in_progress' || c.status === 'accepted'
                            ? 'bg-cyan/20 text-cyan border border-cyan/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {c.status.replace('_', ' ')}
                      </span>
                    </div>

                    {c.status === 'pending' && (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => handleRespond(c.challengeId, 'accept')}
                          className="btn btn-primary btn-sm flex-1 text-xs py-1.5"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleRespond(c.challengeId, 'decline')}
                          className="btn btn-secondary btn-sm flex-1 text-xs py-1.5"
                        >
                          Decline
                        </button>
                      </div>
                    )}

                    {(c.status === 'accepted' || c.status === 'in_progress') && (
                      <button
                        onClick={() => handleStartChallengeCamera(c)}
                        className="w-full btn btn-primary btn-sm py-2 font-black shadow-glow flex items-center justify-center gap-1.5"
                      >
                        <Play size={13} className="fill-current" />
                        <span>Launch Verified Camera</span>
                      </button>
                    )}

                    {c.status === 'completed' && (
                      <div className="text-xs text-slate-300 pt-1 border-t border-white/5 flex justify-between items-center">
                        <span>
                          Winner: <strong className="text-emerald-400">{c.isDraw ? 'DRAW' : c.winnerId}</strong>
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {c.completedAt ? new Date(c.completedAt).toLocaleDateString() : 'Completed'}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
