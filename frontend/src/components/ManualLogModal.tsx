import { useState, useEffect } from 'react';
import { api } from '../services/api';

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
      api.getSports().then((r: any) => setSports(r.data || [])).catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!sportId) return;
    setSubmitting(true);
    try {
      await api.logManualActivity({ sportId, durationMinutes: duration, notes: notes.trim() || undefined });
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
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-[420px] rounded-t-2xl sm:rounded-2xl p-5 animate-in"
        style={{ background: '#131B2E', border: '1px solid rgba(255,255,255,0.08)' }}
        onClick={e => e.stopPropagation()}
      >
        {submitted ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-3">🎉</div>
            <h3 className="text-white">Activity Logged!</h3>
            <p className="text-sm text-muted mt-1">XP has been awarded.</p>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white">🏅 Log Activity</h3>
              <button onClick={onClose} className="text-muted hover:text-white text-xl">✕</button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="form-group">
                <label>Sport / Activity</label>
                <div className="chip-grid">
                  {sports.map((s: any) => {
                    const sid = s.id || s.sportId;
                    const sicon = s.icon || s.iconUrl || '🏅';
                    return (
                      <button
                        type="button"
                        key={sid}
                        onClick={() => setSportId(sid)}
                        className={`chip ${sportId === sid ? 'selected' : ''}`}
                      >
                        {sicon} {s.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="form-group">
                <label>Duration (minutes)</label>
                <div className="flex gap-2">
                  {[15, 30, 45, 60, 90].map(t => (
                    <button
                      key={t}
                      onClick={() => setDuration(t)}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                        duration === t
                          ? 'bg-neon/20 text-neon border border-neon/40'
                          : 'bg-surface text-muted border border-white/5'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Notes (optional)</label>
                <input
                  className="input"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. Played doubles match"
                />
              </div>

              <button
                className="btn btn-primary btn-full"
                onClick={handleSubmit}
                disabled={!sportId || submitting}
              >
                {submitting ? <span className="spinner w-4 h-4" /> : '✅ Log Activity'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
