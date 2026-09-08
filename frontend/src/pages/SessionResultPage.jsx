import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import confetti from 'canvas-confetti';

export default function SessionResultPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const result = state?.result || { totalReps: 24, averageFormScore: 89, xpEarned: 390, caloriesBurned: 22, currentStreak: 4, badgesUnlocked: ['first_step'] };
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Fire confetti on mount
    setTimeout(() => {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
      setShow(true);
    }, 200);
  }, []);

  const formColor = result.averageFormScore >= 85 ? 'var(--accent4)' : result.averageFormScore >= 70 ? 'var(--accent3)' : 'var(--accent2)';
  const formLabel = result.averageFormScore >= 85 ? 'Excellent 🎯' : result.averageFormScore >= 70 ? 'Good 👍' : 'Keep Practicing 💪';

  return (
    <div className="section" style={{ paddingTop: 32 }}>
      {/* Trophy */}
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 72, animation: 'pulse 1.5s infinite' }}>🏆</div>
        <h1 style={{ marginTop: 8, fontSize: 28 }} className="gradient-text">Workout Complete!</h1>
        <p style={{ fontSize: 14, marginTop: 4 }}>You crushed it! Every rep counts.</p>
      </div>

      {/* XP Banner */}
      <div style={{ background: 'linear-gradient(135deg, rgba(108,99,255,0.25) 0%, rgba(255,107,107,0.15) 100%)', border: '1px solid rgba(108,99,255,0.4)', borderRadius: 'var(--radius)', padding: '20px', textAlign: 'center', opacity: show ? 1 : 0, transform: show ? 'translateY(0)' : 'translateY(20px)', transition: 'all 0.6s ease' }}>
        <div style={{ fontSize: 48, fontWeight: 900 }} className="gradient-text">+{result.xpEarned} XP</div>
        {result.totalXp && <div style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>Total: {result.totalXp?.toLocaleString()} XP</div>}
      </div>

      {/* Stats grid */}
      <div className="grid-2">
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--accent)' }}>{result.totalReps}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total Reps</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: formColor }}>{result.averageFormScore}%</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Form Score</div>
          <div style={{ fontSize: 11, color: formColor, marginTop: 2 }}>{formLabel}</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--accent2)' }}>🔥{result.currentStreak}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Day Streak</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--accent3)' }}>{result.caloriesBurned}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Calories</div>
        </div>
      </div>

      {/* Badges unlocked */}
      {result.badgesUnlocked?.length > 0 && (
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 8 }}>🏅 Badges Unlocked!</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
            {result.badgesUnlocked.map(b => <span key={b} className="badge-pill">🏅 {b.replace(/_/g, ' ')}</span>)}
          </div>
        </div>
      )}

      {/* Actions */}
      <button className="btn btn-primary btn-full" onClick={() => navigate('/dashboard')}>
        🏠 Back to Dashboard
      </button>
      <button className="btn btn-secondary btn-full" onClick={() => navigate('/progress')}>
        📊 View Full Progress
      </button>
    </div>
  );
}
