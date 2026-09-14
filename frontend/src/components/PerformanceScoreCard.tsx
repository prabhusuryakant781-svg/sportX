import React, { useState, useEffect } from 'react';
import { Shield, Sparkles, TrendingUp, AlertCircle, RefreshCw, Activity, Swords, Dumbbell } from 'lucide-react';
import { api } from '../services/api';
import type { PerformanceScore } from '../types';

interface PerformanceScoreCardProps {
  compact?: boolean;
  onViewDetails?: () => void;
  className?: string;
}

export default function PerformanceScoreCard({
  compact = false,
  onViewDetails,
  className = '',
}: PerformanceScoreCardProps) {
  const [scoreData, setScoreData] = useState<PerformanceScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchScore = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res: any = await api.getPerformanceScore();
      if (res?.data) {
        setScoreData(res.data);
      }
    } catch (err) {
      console.error('Failed to load performance score:', err);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchScore();
  }, []);

  if (loading) {
    return (
      <div className={`card-glass border border-white/10 p-4 animate-pulse ${className}`}>
        <div className="h-4 bg-white/10 rounded w-1/3 mb-3" />
        <div className="h-8 bg-white/10 rounded w-1/2 mb-2" />
        <div className="h-3 bg-white/10 rounded w-2/3" />
      </div>
    );
  }

  const overall = scoreData?.overallScore ?? 0;
  const isProvisional = scoreData?.provisional ?? true;
  const breakdown = scoreData?.breakdown || {
    consistency: 0,
    form: 0,
    workout: 0,
    competition: 0,
    improvement: 75,
  };

  // Color theme based on score
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-amber-400 border-amber-500/40 bg-amber-500/10';
    if (score >= 80) return 'text-neon border-neon/40 bg-neon/10';
    if (score >= 70) return 'text-cyan border-cyan/40 bg-cyan/10';
    return 'text-slate-300 border-white/20 bg-white/5';
  };

  if (compact) {
    return (
      <div className={`hud-panel p-3.5 relative overflow-hidden ${className}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-300">
            <Shield size={13} className="text-neon" />
            <span>Performance Score</span>
          </div>
          {isProvisional ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
              <AlertCircle size={9} />
              <span>Calibrating</span>
            </span>
          ) : (
            <span className="text-[10px] font-bold text-slate-500 tabular-nums">
              Server-Verified
            </span>
          )}
        </div>

        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-white tabular-nums tracking-tight">
              {isProvisional ? (
                <span className="text-lg text-slate-300 font-bold">PROVISIONAL</span>
              ) : (
                overall
              )}
            </span>
            {!isProvisional && (
              <span className="text-xs font-bold text-slate-400">/ 100</span>
            )}
          </div>

          {onViewDetails && (
            <button
              onClick={onViewDetails}
              className="text-[11px] font-bold text-neon hover:underline cursor-pointer flex items-center gap-0.5"
            >
              <span>Breakdown</span>
              <span>&rarr;</span>
            </button>
          )}
        </div>

        {isProvisional ? (
          <p className="text-[10px] text-slate-400 mt-1.5 leading-snug">
            {scoreData?.statusMessage || 'Complete 2 workouts or 1 competitive match to finalize athletic score.'}
          </p>
        ) : (
          <div className="grid grid-cols-5 gap-1 mt-2.5 pt-2 border-t border-white/5 text-center">
            <div>
              <div className="text-[9px] font-semibold text-slate-400">Consistency</div>
              <div className="text-[11px] font-black text-neon tabular-nums">{breakdown.consistency}</div>
            </div>
            <div>
              <div className="text-[9px] font-semibold text-slate-400">Form</div>
              <div className="text-[11px] font-black text-cyan tabular-nums">{breakdown.form}</div>
            </div>
            <div>
              <div className="text-[9px] font-semibold text-slate-400">Workout</div>
              <div className="text-[11px] font-black text-white tabular-nums">{breakdown.workout}</div>
            </div>
            <div>
              <div className="text-[9px] font-semibold text-slate-400">Arena</div>
              <div className="text-[11px] font-black text-amber-400 tabular-nums">{breakdown.competition}</div>
            </div>
            <div>
              <div className="text-[9px] font-semibold text-slate-400">Trend</div>
              <div className="text-[11px] font-black text-purple-400 tabular-nums">{breakdown.improvement}</div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Detailed Card
  return (
    <div className={`hud-panel p-5 relative overflow-hidden ${className}`}>
      <div className="absolute top-0 right-0 w-48 h-48 bg-neon/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-neon/15 border border-neon/30 flex items-center justify-center text-neon">
            <Shield size={16} />
          </div>
          <div>
            <h3 className="text-sm font-black text-white tracking-tight">SportX Performance Score</h3>
            <p className="text-[11px] text-slate-400">Canonical 5-Pillar Athletic Assessment</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isProvisional && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
              <AlertCircle size={10} />
              <span>Calibrating</span>
            </span>
          )}
          <button
            onClick={() => fetchScore(true)}
            disabled={refreshing}
            className="p-1.5 rounded-lg bg-surface hover:bg-surface/80 text-slate-400 hover:text-white transition cursor-pointer"
            title="Recalculate authoritative score"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin text-neon' : ''} />
          </button>
        </div>
      </div>

      {/* Main Score Display */}
      <div className="flex items-center justify-between py-3 px-4 rounded-2xl bg-surface/40 border border-white/5 mb-4 relative z-10">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
            Overall Athletic Rating
          </span>
          {isProvisional ? (
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-amber-300">CALIBRATING</span>
              <span className="text-xs text-slate-400 font-medium">Provisional</span>
            </div>
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white tabular-nums tracking-tight">
                {overall}
              </span>
              <span className="text-xs font-bold text-slate-400">/ 100</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getScoreColor(overall)} ml-2`}>
                {overall >= 90 ? 'ELITE' : overall >= 80 ? 'ADVANCED' : overall >= 70 ? 'ATHLETIC' : 'DEVELOPING'}
              </span>
            </div>
          )}
        </div>

        {scoreData?.trend && scoreData.trend.length > 1 && (
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Recent Trend
            </span>
            <div className="flex items-center gap-1 text-xs font-black text-emerald-400">
              <TrendingUp size={12} />
              <span>{scoreData.trend.map(t => t.score).join(' → ')}</span>
            </div>
          </div>
        )}
      </div>

      {/* Status Notice if Provisional */}
      {isProvisional && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200 mb-4 flex items-start gap-2">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5 text-amber-400" />
          <span>{scoreData?.statusMessage || 'Complete at least 2 workouts or 1 competitive match to calibrate your athletic rating.'}</span>
        </div>
      )}

      {/* 5 Pillars Breakdown */}
      <div className="space-y-2.5 relative z-10">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
          Pillar Weighting & Contribution
        </span>

        {/* Consistency 20% */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-300 font-medium flex items-center gap-1.5">
              <Activity size={12} className="text-cyan" />
              <span>Consistency (20%)</span>
            </span>
            <span className="font-bold text-white tabular-nums">{breakdown.consistency} / 100</span>
          </div>
          <div className="h-1.5 rounded-full bg-surface overflow-hidden">
            <div
              className="h-full bg-cyan transition-all duration-500"
              style={{ width: `${Math.min(100, breakdown.consistency)}%` }}
            />
          </div>
        </div>

        {/* Form Accuracy 25% */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-300 font-medium flex items-center gap-1.5">
              <Sparkles size={12} className="text-neon" />
              <span>Form Accuracy (25%)</span>
            </span>
            <span className="font-bold text-emerald-400 tabular-nums">{breakdown.form} / 100</span>
          </div>
          <div className="h-1.5 rounded-full bg-surface overflow-hidden">
            <div
              className="h-full bg-neon transition-all duration-500"
              style={{ width: `${Math.min(100, breakdown.form)}%` }}
            />
          </div>
        </div>

        {/* Workout Volume 25% */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-300 font-medium flex items-center gap-1.5">
              <Dumbbell size={12} className="text-indigo-400" />
              <span>Workout Volume (25%)</span>
            </span>
            <span className="font-bold text-indigo-300 tabular-nums">{breakdown.workout} / 100</span>
          </div>
          <div className="h-1.5 rounded-full bg-surface overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all duration-500"
              style={{ width: `${Math.min(100, breakdown.workout)}%` }}
            />
          </div>
        </div>

        {/* Competitive Arena 20% */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-300 font-medium flex items-center gap-1.5">
              <Swords size={12} className="text-amber-400" />
              <span>Arena Competition (20%)</span>
            </span>
            <span className="font-bold text-amber-300 tabular-nums">{breakdown.competition} / 100</span>
          </div>
          <div className="h-1.5 rounded-full bg-surface overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all duration-500"
              style={{ width: `${Math.min(100, breakdown.competition)}%` }}
            />
          </div>
        </div>

        {/* Trajectory / Improvement 10% */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-300 font-medium flex items-center gap-1.5">
              <TrendingUp size={12} className="text-purple-400" />
              <span>Trajectory & Improvement (10%)</span>
            </span>
            <span className="font-bold text-purple-300 tabular-nums">{breakdown.improvement} / 100</span>
          </div>
          <div className="h-1.5 rounded-full bg-surface overflow-hidden">
            <div
              className="h-full bg-purple-500 transition-all duration-500"
              style={{ width: `${Math.min(100, breakdown.improvement)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
