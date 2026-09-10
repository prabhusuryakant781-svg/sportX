import { useState } from 'react';
import { api } from '../services/api';

interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES = [
  { id: 'pose_detection', label: '📸 Pose Detection' },
  { id: 'ui_ux', label: '🎨 UI / UX Issue' },
  { id: 'crash', label: '💥 Crash / Error' },
  { id: 'performance', label: '🐌 Performance' },
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
      setTimeout(() => { onClose(); setSubmitted(false); setCategory(''); setDescription(''); }, 1500);
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
            <div className="text-5xl mb-3">✅</div>
            <h3 className="text-white">Thanks for the report!</h3>
            <p className="text-sm text-muted mt-1">We'll look into it.</p>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white">🐛 Report a Bug</h3>
              <button onClick={onClose} className="text-muted hover:text-white text-xl">✕</button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="form-group">
                <label>Category</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setCategory(c.id)}
                      className={`chip ${category === c.id ? 'selected' : ''}`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Exercise (optional)</label>
                <select
                  className="input"
                  value={exerciseId}
                  onChange={e => setExerciseId(e.target.value)}
                >
                  <option value="">Select exercise...</option>
                  <option value="squat">Squat</option>
                  <option value="pushup">Push-up</option>
                  <option value="bicep_curl">Bicep Curl</option>
                </select>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  className="input min-h-[100px] resize-none"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe what happened..."
                />
              </div>

              <button
                className="btn btn-primary btn-full"
                onClick={handleSubmit}
                disabled={!category || !description.trim() || submitting}
              >
                {submitting ? <span className="spinner w-4 h-4" /> : '📤 Submit Report'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
