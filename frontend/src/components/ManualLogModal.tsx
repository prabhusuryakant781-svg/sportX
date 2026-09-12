import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { X, CheckCircle2, Award, Clock, FileText } from 'lucide-react';

interface ManualLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogged?: () => void;
}

export default function ManualLogModal({ isOpen, onClose, onLogged }: ManualLogModalProps) {
  const [sports, setSports] = useState<{ id: string; name: string; icon: string }[]>([]);
  const [sportId, setSportId] = useState('');
  const [duration, setDuration] = useState(30);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      api.getSports()
        .then((r: any) => setSports(r?.data || []))
        .catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!sportId) return;
    setSubmitting(true);
    try {
      await api.logManualActivity({
        sportId,
        durationMinutes: duration,
        notes: notes.trim() || undefined
      });
      setSubmitted(true);
      setTimeout(() => {
        onClose();
        onLogged?.();
        setSubmitted(false);
        setSportId('');
        setDuration(30);
        setNotes('');
      }, 1200);
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
            <h3 className="text-lg font-black text-white">Activity Verified & Logged!</h3>
            <p className="text-xs text-slate-400">XP and streak progression updated.</p>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-neon/15 text-neon flex items-center justify-center">
                  <Award size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white tracking-tight">Log Campus Activity</h3>
                  <span className="text-[10px] text-slate-400">Record sport drills outside the studio</span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-surface border border-white/5 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Sports selection chips */}
              <div className="form-group">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Sport / Activity
                </label>
                <div className="chip-grid max-h-[140px] overflow-y-auto no-scrollbar py-0.5">
                  {sports.map((s: any) => {
                    const sid = s.id || s.sportId;
                    const sicon = s.icon || s.iconUrl || '🏅';
                    const isSelected = sportId === sid;
                    return (
                      <button
                        type="button"
                        key={sid}
                        onClick={() => setSportId(sid)}
                        className={`chip text-xs py-2 px-3 flex items-center gap-1.5 ${isSelected ? 'selected' : ''}`}
                      >
                        <span>{sicon}</span>
                        <span>{s.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Duration selector */}
              <div className="form-group">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                  <Clock size={12} className="text-slate-400" />
                  <span>Duration (Minutes)</span>
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {[15, 30, 45, 60, 90].map(t => (
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
              <div className="form-group">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                  <FileText size={12} className="text-slate-400" />
                  <span>Notes (Optional)</span>
                </label>
                <input
                  className="input text-xs py-2.5"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. Doubles scrimmage at campus sports center"
                />
              </div>

              <button
                type="button"
                className="btn btn-primary btn-full py-3.5 mt-2 font-black shadow-glow"
                onClick={handleSubmit}
                disabled={!sportId || submitting}
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="spinner w-4 h-4 border-white/30 border-t-white" />
                    <span>Logging Telemetry…</span>
                  </span>
                ) : (
                  <span>Record Activity & Claim XP</span>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
