import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import confetti from 'canvas-confetti';

export default function SessionResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [saving, setSaving] = useState(true);
  const [xpEarned, setXpEarned] = useState(0);

  const { result, exercise, planId } = location.state || {};

  useEffect(() => {
    if (!result || !exercise) {
      navigate('/dashboard', { replace: true });
      return;
    }

    const saveResult = async () => {
      try {
        // Optimistic XP calc (simplified formula)
        const calcXp = Math.floor(result.reps * (result.formScore / 100) * 10);
        setXpEarned(calcXp);

        // In a real flow, we'd complete the active session here
        // await api.completeSession(activeSessionId, { ...result });

        await refreshUser();
        triggerConfetti();
      } catch (err) {
        console.error('Failed to save result', err);
      } finally {
        setSaving(false);
      }
    };

    saveResult();
  }, []);

  const triggerConfetti = () => {
    const duration = 2000;
    const end = Date.now() + duration;

    (function frame() {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#10B981', '#06B6D4', '#FFD93D']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#10B981', '#06B6D4', '#FFD93D']
      });

      if (Date.now() < end) requestAnimationFrame(frame);
    }());
  };

  if (!result) return null;

  const formGrade = result.formScore >= 90 ? 'S' : result.formScore >= 80 ? 'A' : result.formScore >= 70 ? 'B' : 'C';
  const gradeColor = formGrade === 'S' ? '#10B981' : formGrade === 'A' ? '#06B6D4' : formGrade === 'B' ? '#F59E0B' : '#EF4444';

  return (
    <div className="min-h-screen bg-obsidian flex flex-col p-6 animate-in">
      <div className="flex-1 flex flex-col items-center justify-center max-w-[400px] mx-auto w-full">

        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🏆</div>
          <h1 className="text-white">Workout Complete!</h1>
          <p className="text-muted mt-2">{exercise.name} session finished.</p>
        </div>

        <div className="w-full card bg-gradient-card border-neon/20 p-6 flex flex-col items-center gap-6 mb-8 relative overflow-hidden">
          {/* Glowing background blob */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-neon/20 blur-3xl rounded-full" />

          <div className="relative z-10 flex flex-col items-center">
            <span className="text-sm text-muted font-bold tracking-widest uppercase mb-1">XP Earned</span>
            <div className="text-5xl font-black text-neon glow-neon">+{xpEarned}</div>
          </div>

          <div className="w-full h-[1px] bg-white/10 relative z-10" />

          <div className="relative z-10 w-full grid grid-cols-2 gap-4">
            <div className="flex flex-col items-center text-center">
              <span className="text-xs text-muted mb-1">Reps</span>
              <span className="text-2xl font-bold text-white">{result.reps}</span>
            </div>
            <div className="flex flex-col items-center text-center">
              <span className="text-xs text-muted mb-1">Duration</span>
              <span className="text-2xl font-bold text-white">
                {Math.floor(result.duration / 60)}:{(result.duration % 60).toString().padStart(2, '0')}
              </span>
            </div>
            <div className="flex flex-col items-center text-center">
              <span className="text-xs text-muted mb-1">Best Streak</span>
              <span className="text-2xl font-bold text-amber">🔥{result.streak}</span>
            </div>
            <div className="flex flex-col items-center text-center">
              <span className="text-xs text-muted mb-1">Form Grade</span>
              <span className="text-3xl font-black" style={{ color: gradeColor }}>{formGrade}</span>
            </div>
          </div>
        </div>

        <button
          className="btn btn-primary w-full py-4 text-lg"
          onClick={() => navigate('/dashboard')}
          disabled={saving}
        >
          {saving ? <span className="spinner w-5 h-5 border-2" /> : 'Finish'}
        </button>
      </div>
    </div>
  );
}
