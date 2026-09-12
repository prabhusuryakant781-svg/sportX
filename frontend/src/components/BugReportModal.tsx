import { useState } from 'react';
import { api } from '../services/api';
import { X, CheckCircle2, Bug, AlertTriangle, Send } from 'lucide-react';

interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES = [
  { id: 'pose_detection', label: '📸 Vision / Skeleton' },
  { id: 'ui_ux', label: '🎨 UI / Display' },
  { id: 'crash', label: '💥 Error / Crash' },
  { id: 'performance', label: '⚡ Performance' },
  { id: 'other', label: '💬 Other' },
];

export default function BugReportModal({ isOpen, onClose }: BugReportModalProps) {
  const [category, setCategory] = useState('');
  const [exerciseId, setExerciseId] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!category || !description.trim()) return;
    setSubmitting(true);
    try {
      await api.reportBug({
        category,
        exerciseId: exerciseId || undefined,
        description: description.trim(),
        deviceInfo: `${navigator.userAgent} | ${window.innerWidth}x${window.innerHeight}`,
      });
      setSubmitted(true);
      setTimeout(() => {
        onClose();
        setSubmitted(false);
        setCategory('');
        setDescription('');
      }, 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm animate-fade-in" />
      <div
        className="relative w-full max-w-[440px] rounded-t-3xl sm:rounded-3xl p-6 animate-slide-up bg-card border border-white/10 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {submitted ? (
          <div className="text-center py-8 space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mx-auto mb-2 border border-emerald-500/30">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-lg font-black text-white">Diagnostic Report Logged!</h3>
            <p className="text-xs text-slate-400">Our engineering team has received your telemetry data.</p>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center">
                  <Bug size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white tracking-tight">Report Telemetry Issue</h3>
                  <span className="text-[10px] text-slate-400">Help improve SportX pose recognition</span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-surface border border-white/5 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3.5">
              {/* Category pills */}
              <div className="form-group">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Issue Category
                </label>
                <div className="chip-grid pt-0.5">
                  {CATEGORIES.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategory(c.id)}
                      className={`chip text-xs py-1.5 px-3 ${category === c.id ? 'selected' : ''}`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Related Exercise */}
              <div className="form-group">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Exercise Drill (Optional)
                </label>
                <select
                  className="input text-xs py-2 bg-surface border border-white/10"
                  value={exerciseId}
                  onChange={e => setExerciseId(e.target.value)}
                >
                  <option value="">Select drill if applicable…</option>
                  <option value="squat">Bodyweight Squat</option>
                  <option value="pushup">Push-Up</option>
                  <option value="jumping_jacks">Jumping Jacks</option>
                </select>
              </div>

              {/* Description */}
              <div className="form-group">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Description & Observations
                </label>
                <textarea
                  className="input min-h-[90px] resize-none text-xs leading-relaxed"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe what occurred (e.g. rep not counted at deep angle, camera lag)…"
                />
              </div>

              <button
                type="button"
                className="btn btn-primary btn-full py-3.5 mt-2 font-black shadow-glow flex items-center justify-center gap-2"
                onClick={handleSubmit}
                disabled={!category || !description.trim() || submitting}
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="spinner w-4 h-4 border-white/30 border-t-white" />
                    <span>Submitting Diagnostics…</span>
                  </span>
                ) : (
                  <>
                    <Send size={15} />
                    <span>Submit Diagnostic Report</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
