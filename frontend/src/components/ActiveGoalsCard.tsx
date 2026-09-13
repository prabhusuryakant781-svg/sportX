import React, { useState, useEffect } from 'react';
import { Target, ChevronRight, Plus, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import type { Goal } from '../types';

interface ActiveGoalsCardProps {
  onOpenGoalsModal: () => void;
  className?: string;
}

export default function ActiveGoalsCard({ onOpenGoalsModal, className = '' }: ActiveGoalsCardProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getGoals(true)
      .then((res: any) => {
        setGoals(res?.data || []);
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  const activeGoals = goals.filter((g) => g.status === 'active');
  const completedCount = goals.filter((g) => g.status === 'completed').length;

  if (loading) {
    return (
      <div className={`card-glass border border-white/10 p-4 animate-pulse ${className}`}>
        <div className="h-4 bg-white/10 rounded w-1/3 mb-2" />
        <div className="h-10 bg-white/10 rounded w-full" />
      </div>
    );
  }

  return (
    <div className={`card-glass border border-white/10 p-4 relative overflow-hidden shadow-card ${className}`}>
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-400">
          <Target size={14} className="text-neon" />
          <span>Active Goals</span>
          <span className="text-[10px] text-slate-500 font-semibold lowercase">
            ({completedCount} completed)
          </span>
        </div>

        <button
          onClick={onOpenGoalsModal}
          className="text-xs font-bold text-neon hover:underline flex items-center gap-0.5 cursor-pointer"
        >
          <span>Manage</span>
          <ChevronRight size={13} />
        </button>
      </div>

      {activeGoals.length === 0 ? (
        <div className="py-2 flex items-center justify-between">
          <p className="text-xs text-slate-400">No active goals yet.</p>
          <button
            onClick={onOpenGoalsModal}
            className="btn btn-sm btn-secondary py-1 px-2.5 text-xs flex items-center gap-1"
          >
            <Plus size={12} />
            <span>Set Goal</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {activeGoals.slice(0, 2).map((goal) => (
            <div key={goal.goalId}>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="font-bold text-white truncate max-w-[200px]">{goal.title}</span>
                <span className="text-slate-400 tabular-nums font-medium text-[11px]">
                  {goal.current}/{goal.target} {goal.unit} ({goal.progress}%)
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-surface overflow-hidden">
                <div
                  className="h-full bg-neon transition-all duration-500"
                  style={{ width: `${goal.progress}%` }}
                />
              </div>
            </div>
          ))}
          {activeGoals.length > 2 && (
            <button
              onClick={onOpenGoalsModal}
              className="text-[11px] text-slate-400 hover:text-neon transition font-semibold block text-center w-full pt-1"
            >
              +{activeGoals.length - 2} more active goals
            </button>
          )}
        </div>
      )}
    </div>
  );
}
