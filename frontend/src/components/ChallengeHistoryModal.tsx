import React, { useState, useEffect } from 'react';
import { Trophy, X, Filter, Swords, ChevronRight, Activity, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import type { ChallengeHistoryEntry } from '../types';

interface ChallengeHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChallengeHistoryModal({ isOpen, onClose }: ChallengeHistoryModalProps) {
  const [history, setHistory] = useState<ChallengeHistoryEntry[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'WIN' | 'LOSS' | 'DRAW'>('ALL');
  const [loading, setLoading] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<ChallengeHistoryEntry | null>(null);

  const fetchHistory = async (outcomeFilter = filter) => {
    setLoading(true);
    try {
      const res: any = await api.getChallengeHistory(outcomeFilter);
      setHistory(res?.data || []);
    } catch (err) {
      console.error('Failed to load challenge history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory(filter);
    }
  }, [isOpen, filter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="hud-panel-amber w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl relative border border-amber-500/30 bg-obsidian-card/95">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-glow-amber">
              <Trophy size={18} />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight uppercase font-outfit">CHALLENGE MATCH HISTORY</h2>
              <p className="text-xs text-slate-400">Verified competitive and friend match records</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer border border-white/10"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filters */}
        <div className="px-5 pt-3 pb-2 border-b border-white/5 flex gap-2">
          {(['ALL', 'WIN', 'LOSS', 'DRAW'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-outfit font-black uppercase tracking-wider transition cursor-pointer ${
                filter === f
                  ? 'bg-amber-500 text-obsidian shadow-glow-amber'
                  : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              {f === 'ALL' ? 'All Matches' : f}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-2.5">
          {loading ? (
            <div className="space-y-2">
              <div className="hud-panel skeleton h-16" />
              <div className="hud-panel skeleton h-16" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <Trophy size={36} className="mx-auto text-slate-600" />
              <h3 className="text-sm font-bold text-white uppercase font-outfit">No Matches Recorded</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Completed competitive arena matches and friend battles will appear here with authoritative telemetry.
              </p>
            </div>
          ) : (
            history.map((entry) => {
              const isWin = entry.outcome === 'WIN';
              const isLoss = entry.outcome === 'LOSS';

              return (
                <div
                  key={entry.matchId}
                  onClick={() => setSelectedEntry(selectedEntry?.matchId === entry.matchId ? null : entry)}
                  className="hud-panel p-3.5 hover:border-amber-500/40 transition cursor-pointer space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs ${
                          isWin
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : isLoss
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {entry.outcome}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-white tracking-tight">
                            vs {entry.opponentName || 'Opponent'}
                          </h4>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-surface text-slate-400 uppercase font-semibold">
                            {entry.type}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {entry.exerciseId.toUpperCase()} • {new Date(entry.completedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold text-white tabular-nums">
                        {entry.myScore} <span className="text-slate-500 font-normal">vs</span> {entry.opponentScore}
                      </div>
                      <div className="flex items-center gap-1 justify-end text-[10px] font-semibold mt-0.5">
                        {entry.rpChange !== 0 && (
                          <span className={entry.rpChange > 0 ? 'text-amber-400' : 'text-slate-400'}>
                            {entry.rpChange > 0 ? `+${entry.rpChange}` : entry.rpChange} RP
                          </span>
                        )}
                        <span className="text-neon tabular-nums">+{entry.xpEarned} XP</span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Detail View */}
                  {selectedEntry?.matchId === entry.matchId && (
                    <div className="pt-2.5 mt-2 border-t border-white/5 grid grid-cols-3 gap-2 text-center bg-surface/30 p-2.5 rounded-xl animate-fade-in">
                      <div>
                        <div className="text-[9px] text-slate-400">Verified Reps</div>
                        <div className="text-xs font-black text-white tabular-nums">{entry.myScore}</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-slate-400">Form Accuracy</div>
                        <div className="text-xs font-black text-emerald-400 tabular-nums">
                          {entry.myFormScore}%
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] text-slate-400">Status</div>
                        <div className="text-xs font-black text-cyan uppercase">{entry.status}</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
