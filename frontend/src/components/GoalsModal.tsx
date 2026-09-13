import React, { useState, useEffect } from 'react';
import { Target, X, Plus, CheckCircle2, AlertCircle, Clock, Sparkles, Trophy, Dumbbell, Activity, Flame } from 'lucide-react';
import { api } from '../services/api';
import type { Goal, GoalTemplate, GoalCategory, GoalType } from '../types';

interface GoalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoalUpdated?: () => void;
}

export default function GoalsModal({ isOpen, onClose, onGoalUpdated }: GoalsModalProps) {
  const [tab, setTab] = useState<'active' | 'completed' | 'new'>('active');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [templates, setTemplates] = useState<GoalTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New Goal Form State
  const [newCategory, setNewCategory] = useState<GoalCategory>('fitness');
  const [newType, setNewType] = useState<GoalType>('workout_count');
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newTarget, setNewTarget] = useState<number>(20);
  const [newUnit, setNewUnit] = useState('workouts');
  const [newExerciseId, setNewExerciseId] = useState('');
  const [newSportId, setNewSportId] = useState('');
  const [newTargetDays, setNewTargetDays] = useState(30);
  const [submitting, setSubmitting] = useState(false);

  const fetchGoalsAndTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const [goalsRes, templatesRes]: any[] = await Promise.all([
        api.getGoals(true).catch(() => ({ data: [] })),
        api.getGoalTemplates().catch(() => ({ data: [] })),
      ]);
      setGoals(goalsRes?.data || []);
      setTemplates(templatesRes?.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load goals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchGoalsAndTemplates();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const activeGoals = goals.filter((g) => g.status === 'active');
  const completedGoals = goals.filter((g) => g.status === 'completed');

  const handleApplyTemplate = (tmpl: GoalTemplate) => {
    setNewCategory(tmpl.category);
    setNewType(tmpl.type);
    setNewTitle(tmpl.title);
    setNewDescription(tmpl.description);
    setNewTarget(tmpl.target);
    setNewUnit(tmpl.unit);
    setNewExerciseId(tmpl.exerciseId || '');
    setNewSportId(tmpl.sportId || '');
    setNewTargetDays(tmpl.daysDuration);
    setTab('new');
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newTitle.trim()) {
      setError('Please provide a goal title');
      return;
    }
    if (!newTarget || newTarget <= 0) {
      setError('Target value must be greater than 0');
      return;
    }

    const targetDate = new Date(Date.now() + newTargetDays * 86400000).toISOString();

    setSubmitting(true);
    try {
      const res: any = await api.createGoal({
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        category: newCategory,
        type: newType,
        target: Number(newTarget),
        unit: newUnit,
        exerciseId: newExerciseId || undefined,
        sportId: newSportId || undefined,
        targetDate,
      });

      if (res?.data) {
        await fetchGoalsAndTemplates();
        setTab('active');
        if (onGoalUpdated) onGoalUpdated();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create goal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelGoal = async (goalId: string) => {
    if (!confirm('Are you sure you want to cancel this goal?')) return;
    try {
      await api.cancelGoal(goalId);
      await fetchGoalsAndTemplates();
      if (onGoalUpdated) onGoalUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel goal');
    }
  };

  const getCategoryColor = (cat: GoalCategory) => {
    switch (cat) {
      case 'fitness': return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'consistency': return 'bg-cyan/15 text-cyan border-cyan/30';
      case 'strength': return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
      case 'sport': return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'competitive': return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      case 'form': return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
      default: return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="card-glass border border-white/10 w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl relative">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-neon/15 border border-neon/30 flex items-center justify-center text-neon">
              <Target size={18} />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight">Athletic Goals Hub</h2>
              <p className="text-xs text-slate-400">Measurable milestones verified from authoritative activity</p>
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
            onClick={() => setTab('active')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              tab === 'active'
                ? 'bg-neon text-obsidian shadow-glow-sm'
                : 'bg-surface/50 text-slate-400 hover:text-white'
            }`}
          >
            Active ({activeGoals.length})
          </button>
          <button
            onClick={() => setTab('completed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              tab === 'completed'
                ? 'bg-neon text-obsidian shadow-glow-sm'
                : 'bg-surface/50 text-slate-400 hover:text-white'
            }`}
          >
            Completed ({completedGoals.length})
          </button>
          <button
            onClick={() => setTab('new')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
              tab === 'new'
                ? 'bg-neon text-obsidian shadow-glow-sm'
                : 'bg-surface/50 text-slate-400 hover:text-white'
            }`}
          >
            <Plus size={13} />
            <span>Set New Goal</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-5 mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle size={14} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {loading ? (
            <div className="space-y-3">
              <div className="card skeleton h-20" />
              <div className="card skeleton h-20" />
            </div>
          ) : tab === 'active' ? (
            activeGoals.length === 0 ? (
              <div className="text-center py-10 space-y-3">
                <Target size={36} className="mx-auto text-slate-500" />
                <h3 className="text-sm font-bold text-white">No Active Goals</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Set a concrete measurable goal to supercharge your training and give your AI Coach clear targets!
                </p>
                <button
                  onClick={() => setTab('new')}
                  className="btn btn-primary btn-sm mx-auto flex items-center gap-1.5"
                >
                  <Plus size={14} />
                  <span>Choose a Goal Template</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {activeGoals.map((goal) => {
                  const daysLeft = Math.max(
                    0,
                    Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / 86400000)
                  );
                  return (
                    <div
                      key={goal.goalId}
                      className="card p-4 border border-white/10 hover:border-white/20 transition relative"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${getCategoryColor(
                                goal.category
                              )}`}
                            >
                              {goal.category}
                            </span>
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Clock size={10} />
                              <span>{daysLeft} days left</span>
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-white tracking-tight">{goal.title}</h4>
                          {goal.description && (
                            <p className="text-xs text-slate-400 mt-0.5">{goal.description}</p>
                          )}
                        </div>

                        <button
                          onClick={() => handleCancelGoal(goal.goalId)}
                          className="text-[10px] text-slate-500 hover:text-rose-400 font-semibold transition"
                          title="Cancel goal"
                        >
                          Cancel
                        </button>
                      </div>

                      {/* Authoritative Progress Bar */}
                      <div className="mt-3">
                        <div className="flex justify-between items-center text-xs mb-1">
                          <span className="text-slate-400 font-medium">
                            <strong className="text-white font-bold tabular-nums">{goal.current}</strong> /{' '}
                            {goal.target} {goal.unit}
                          </span>
                          <span className="font-black text-neon tabular-nums">{goal.progress}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-surface overflow-hidden">
                          <div
                            className="h-full bg-neon transition-all duration-500"
                            style={{ width: `${goal.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : tab === 'completed' ? (
            completedGoals.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <CheckCircle2 size={36} className="mx-auto text-slate-600" />
                <h3 className="text-sm font-bold text-white">No Completed Goals Yet</h3>
                <p className="text-xs text-slate-400">
                  Goals you complete will be permanently celebrated here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {completedGoals.map((goal) => (
                  <div
                    key={goal.goalId}
                    className="card p-4 border border-emerald-500/20 bg-emerald-950/10 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          {goal.category}
                        </span>
                        <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 size={11} />
                          <span>100% Accomplished</span>
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white">{goal.title}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Achieved: {goal.target} {goal.unit} • Completed{' '}
                        {goal.completedAt ? new Date(goal.completedAt).toLocaleDateString() : 'recently'}
                      </p>
                    </div>

                    <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
                      <Trophy size={18} />
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            /* Set New Goal Tab */
            <div className="space-y-5">
              {/* Quick Template Picker */}
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                  1-Click Goal Templates (Tested & Certified)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto no-scrollbar p-1">
                  {templates.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => handleApplyTemplate(tmpl)}
                      className="p-2.5 rounded-xl bg-surface/50 hover:bg-surface border border-white/5 hover:border-neon/40 text-left transition group cursor-pointer"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span
                          className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded border ${getCategoryColor(
                            tmpl.category
                          )}`}
                        >
                          {tmpl.category}
                        </span>
                        <span className="text-[9px] text-slate-400">{tmpl.daysDuration}d</span>
                      </div>
                      <div className="text-xs font-bold text-white group-hover:text-neon transition truncate">
                        {tmpl.title}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        {tmpl.target} {tmpl.unit}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Goal Form */}
              <form onSubmit={handleCreateGoal} className="space-y-3 pt-2 border-t border-white/5">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                  Customize Goal Parameters
                </span>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Goal Title</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Complete 20 workouts this month"
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-white/10 text-white text-xs focus:border-neon focus:outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Category</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as GoalCategory)}
                      className="w-full px-3 py-2 rounded-xl bg-surface border border-white/10 text-white text-xs focus:border-neon focus:outline-none"
                    >
                      <option value="fitness">Fitness</option>
                      <option value="consistency">Consistency</option>
                      <option value="strength">Strength</option>
                      <option value="sport">Sport</option>
                      <option value="competitive">Competitive</option>
                      <option value="form">Movement Form</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Goal Metric Type</label>
                    <select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value as GoalType)}
                      className="w-full px-3 py-2 rounded-xl bg-surface border border-white/10 text-white text-xs focus:border-neon focus:outline-none"
                    >
                      <option value="workout_count">Workout Sessions</option>
                      <option value="streak_days">Streak Days</option>
                      <option value="total_reps">Total Reps</option>
                      <option value="exercise_reps">Specific Exercise Reps</option>
                      <option value="average_form">Average Form Score</option>
                      <option value="competitive_wins">Competitive Wins</option>
                      <option value="sport_sessions">Sport Sessions</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Target</label>
                    <input
                      type="number"
                      min="1"
                      value={newTarget}
                      onChange={(e) => setNewTarget(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2 rounded-xl bg-surface border border-white/10 text-white text-xs focus:border-neon focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Unit</label>
                    <input
                      type="text"
                      value={newUnit}
                      onChange={(e) => setNewUnit(e.target.value)}
                      placeholder="workouts, reps..."
                      className="w-full px-3 py-2 rounded-xl bg-surface border border-white/10 text-white text-xs focus:border-neon focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Days to Finish</label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={newTargetDays}
                      onChange={(e) => setNewTargetDays(Math.max(1, parseInt(e.target.value) || 30))}
                      className="w-full px-3 py-2 rounded-xl bg-surface border border-white/10 text-white text-xs focus:border-neon focus:outline-none"
                      required
                    />
                  </div>
                </div>

                {newType === 'exercise_reps' && (
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Exercise</label>
                    <select
                      value={newExerciseId}
                      onChange={(e) => setNewExerciseId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-surface border border-white/10 text-white text-xs focus:border-neon focus:outline-none"
                    >
                      <option value="">Select Exercise</option>
                      <option value="squat">Squats</option>
                      <option value="pushup">Push-Ups</option>
                      <option value="jumping_jack">Jumping Jacks</option>
                    </select>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full btn btn-primary py-2.5 mt-2 font-black shadow-glow flex items-center justify-center gap-2"
                >
                  <Plus size={15} />
                  <span>{submitting ? 'Creating Goal...' : 'Activate Athletic Goal'}</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
