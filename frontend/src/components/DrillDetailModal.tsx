import { useState } from 'react';
import type { Exercise } from '../types';
import { api } from '../services/api';
import { X, CheckCircle2, Award, Clock, FileText, Activity, ShieldCheck } from 'lucide-react';

interface DrillDetailModalProps {
  exercise: Exercise | null;
  isOpen: boolean;
  onClose: () => void;
  onLogged?: () => void;
}

export default function DrillDetailModal({
  exercise,
  isOpen,
  onClose,
  onLogged,
}: DrillDetailModalProps) {
  const [duration, setDuration] = useState(20);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen || !exercise) return null;

  const exId = exercise.id || exercise.exerciseId || 'general';
  const exName = exercise.name;

  const handleLogDrill = async () => {
    setSubmitting(true);
    try {
      // Map category/drill to a sensible sportId for authoritative XP logging
      const sportCategory =
        exercise.category?.toLowerCase().includes('running') || exercise.category?.toLowerCase().includes('cardio')
          ? 'athletics'
          : 'fitness';

      await api.logManualActivity({
        sportId: sportCategory,
        durationMinutes: duration,
        notes: notes.trim() ? `${exName}: ${notes.trim()}` : `Completed drill: ${exName} (${duration} mins)`,
      });

      setSubmitted(true);
      setTimeout(() => {
        onClose();
        onLogged?.();
        setSubmitted(false);
        setDuration(20);
        setNotes('');
      }, 1200);
    } catch (err) {
      console.error('Error logging drill activity:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in" />
      <div
        className="relative w-full max-w-[480px] rounded-t-3xl sm:rounded-3xl p-6 animate-slide-up bg-card border border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar"
        onClick={e => e.stopPropagation()}
      >
        {submitted ? (
          <div className="text-center py-8 space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mx-auto mb-2 border border-emerald-500/30">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-lg font-black text-white">Movement Drill Verified & Logged!</h3>
            <p className="text-xs text-slate-400">XP and workout streak progression updated.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-surface border border-white/10 text-2xl flex items-center justify-center flex-shrink-0">
                  {exercise.icon || '🏋️'}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-bold text-cyan uppercase tracking-wider px-1.5 py-0.2 rounded bg-cyan/10 border border-cyan/20">
                      {exercise.category || 'Drill'}
                    </span>
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider px-1.5 py-0.2 rounded bg-surface border border-white/5">
                      {exercise.difficulty || 'All Levels'}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-white tracking-tight">{exName}</h3>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-surface border border-white/5 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Non-Camera Verification Info Banner */}
            <div className="mb-4 p-3 rounded-xl bg-surface/60 border border-white/5 flex items-center gap-2.5">
              <ShieldCheck size={18} className="text-cyan flex-shrink-0" />
              <p className="text-xs text-slate-300 leading-relaxed">
                <strong className="text-white">Guided Training Drill:</strong> Practice form following the cues below, then log your session to claim verified athletic XP.
              </p>
            </div>

            {/* Description */}
            {exercise.description && (
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                {exercise.description}
              </p>
            )}

            {/* Target Muscles */}
            {Array.isArray(exercise.targetMuscles) && exercise.targetMuscles.length > 0 && (
              <div className="mb-4">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Target Muscle Groups
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {exercise.targetMuscles.map((m, i) => (
                    <span
                      key={i}
                      className="text-xs text-slate-300 bg-surface px-2.5 py-1 rounded-lg border border-white/5 font-medium"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Instructions */}
            {Array.isArray(exercise.instructions) && exercise.instructions.length > 0 && (
              <div className="mb-5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Form & Execution Instructions
                </span>
                <ol className="space-y-2 list-decimal list-inside text-xs text-slate-300 leading-relaxed pl-1">
                  {exercise.instructions.map((inst, i) => (
                    <li key={i} className="pl-1">
                      <span className="text-slate-200">{inst}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Drill Log Section */}
            <div className="pt-3 border-t border-white/10 space-y-3.5">
              <div className="flex items-center gap-1.5">
                <Award size={15} className="text-neon" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Log Completed Drill & Claim XP
                </span>
              </div>

              {/* Duration selector */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1.5">
                  <Clock size={12} />
                  <span>Duration (Minutes)</span>
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[10, 15, 20, 30, 45].map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setDuration(t)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        duration === t
                          ? 'bg-neon text-obsidian shadow-glow-sm'
                          : 'bg-surface text-slate-300 border border-white/5 hover:border-white/20'
                      }`}
                    >
                      {t}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes Input */}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1.5">
                  <FileText size={12} />
                  <span>Training Notes (Optional)</span>
                </label>
                <input
                  className="input text-xs py-2"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. 4 sets of 12 reps with 30s rest, great form"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-secondary flex-1 py-3 text-xs font-bold"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleLogDrill}
                  disabled={submitting}
                  className="btn btn-primary flex-[2] py-3 text-xs font-black shadow-glow flex items-center justify-center gap-1.5"
                >
                  {submitting ? (
                    <span className="spinner w-4 h-4 border-white/30 border-t-white" />
                  ) : (
                    <>
                      <Activity size={14} />
                      <span>Log Drill & Claim XP</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
