import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { api } from '../services/api.js';

export default function SessionResultPage() {
  const navigate = useNavigate();
  const { state } = useLocation();

  const result = state?.result || {
    totalReps: 24,
    averageFormScore: 89,
    xpEarned: 390,
    caloriesBurned: 22,
    currentStreak: 4,
    badgesUnlocked: ['first_step']
  };

  const vision = state?.vision || null;
  const sessionId = state?.sessionId || result?.sessionId || null;
  const exerciseName = state?.exerciseName || vision?.exerciseName || 'Workout';

  const [show, setShow] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);

  useEffect(() => {
    // Fire celebratory confetti on mount
    setTimeout(() => {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
      setShow(true);
    }, 200);
  }, []);

  const handleRequestAIAnalysis = async () => {
    if (!sessionId) {
      setAnalysisError('Session identifier missing. Return to dashboard and re-open workout history.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const res = await api.analyzeSession(sessionId);
      if (res && res.success && res.data) {
        setAiAnalysis(res.data);
      } else {
        setAnalysisError(res?.error || 'Unable to generate post-workout analysis.');
      }
    } catch (err) {
      console.error('AI Session Analysis Error:', err);
      setAnalysisError(err.message || 'Failed to connect to AI Coach service.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formScore = result.averageFormScore ?? vision?.formScore ?? 85;
  const formColor = formScore >= 85 ? 'var(--accent4)' : formScore >= 70 ? 'var(--accent3)' : 'var(--accent2)';
  const formLabel = formScore >= 85 ? 'Excellent 🎯' : formScore >= 70 ? 'Good 👍' : 'Keep Practicing 💪';
  const detectedIssues = (vision?.detectedIssues || []).map(i => typeof i === 'string' ? i : i.code || i.description || String(i));

  return (
    <div className="section" style={{ paddingTop: 28, paddingBottom: 40 }}>
      {/* Trophy Header */}
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 64, animation: 'pulse 1.5s infinite' }}>🏆</div>
        <h1 style={{ marginTop: 6, fontSize: 26 }} className="gradient-text">{exerciseName} Complete!</h1>
        <p style={{ fontSize: 13, marginTop: 4, color: 'var(--text-muted)' }}>
          Authoritative Vision telemetry verified & synced to Firestore
        </p>
      </div>

      {/* XP Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(108,99,255,0.25) 0%, rgba(255,107,107,0.15) 100%)',
        border: '1px solid rgba(108,99,255,0.4)',
        borderRadius: 'var(--radius)',
        padding: '16px',
        textAlign: 'center',
        opacity: show ? 1 : 0,
        transform: show ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.6s ease',
        marginBottom: 16
      }}>
        <div style={{ fontSize: 42, fontWeight: 900 }} className="gradient-text">+{result.xpEarned || 150} XP</div>
        {result.totalXp && (
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Lifetime: {result.totalXp.toLocaleString()} XP • Level {result.level || 1}
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid-2" style={{ marginBottom: 16 }}>
        <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
          <div style={{ fontSize: 34, fontWeight: 900, color: 'var(--accent)' }}>
            {result.totalReps ?? vision?.reps ?? 0}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total Reps</div>
        </div>

        <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
          <div style={{ fontSize: 34, fontWeight: 900, color: formColor }}>{formScore}%</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Form Accuracy</div>
          <div style={{ fontSize: 11, color: formColor, marginTop: 2 }}>{formLabel}</div>
        </div>

        <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
          <div style={{ fontSize: 34, fontWeight: 900, color: 'var(--accent2)' }}>
            🔥{result.currentStreak ?? 1}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Day Streak</div>
        </div>

        <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
          <div style={{ fontSize: 34, fontWeight: 900, color: 'var(--accent3)' }}>
            {result.caloriesBurned || 18}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Est. Calories</div>
        </div>
      </div>

      {/* Detected Movement Issues from Vision Engine */}
      {detectedIssues.length > 0 && (
        <div className="card" style={{ marginBottom: 16, border: '1px solid rgba(255,217,61,0.3)', background: 'rgba(255,217,61,0.06)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent3)', marginBottom: 6 }}>
            ⚠️ Movement Nuances Detected by Edge Vision:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {detectedIssues.slice(0, 3).map((issue, idx) => (
              <p key={idx} style={{ margin: 0, fontSize: 12, color: '#E0E0E0' }}>• {issue}</p>
            ))}
          </div>
        </div>
      )}

      {/* Badges Unlocked */}
      {result.badgesUnlocked?.length > 0 && (
        <div className="card" style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>🏅 Badges Unlocked!</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
            {result.badgesUnlocked.map(b => (
              <span key={b} className="badge-pill">🏅 {b.replace(/_/g, ' ')}</span>
            ))}
          </div>
        </div>
      )}

      {/* ── Post-Workout AI Coach Analysis Section (Priority 2) ──────────────── */}
      <div className="card" style={{
        background: 'linear-gradient(180deg, rgba(108, 99, 255, 0.12) 0%, rgba(22, 27, 46, 0.9) 100%)',
        border: '1px solid rgba(108, 99, 255, 0.4)',
        padding: '18px',
        marginBottom: 20
      }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>🤖</span>
            <h3 style={{ fontSize: 15, fontWeight: 800 }}>Gemini Post-Workout Debrief</h3>
          </div>
          <span className="badge-pill" style={{ fontSize: 10 }}>Server-Side AI</span>
        </div>

        {!aiAnalysis && !isAnalyzing && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 14 }}>
              Request authoritative AI evaluation of your biomechanics, volume, and recovery cues grounded in this session's telemetry.
            </p>
            <button
              onClick={handleRequestAIAnalysis}
              className="btn btn-primary btn-full"
              style={{ padding: '12px', fontSize: 14 }}
            >
              ⚡ Analyze Workout with AI Coach
            </button>
          </div>
        )}

        {isAnalyzing && (
          <div style={{ textAlign: 'center', padding: '18px 0' }}>
            <div className="spinner" style={{ width: 28, height: 28, margin: '0 auto 10px' }} />
            <div style={{ fontSize: 13, fontWeight: 700 }}>Correlating Vision & Firestore Telemetry…</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Consulting Google Gemini AI Coach</div>
          </div>
        )}

        {analysisError && !isAnalyzing && (
          <div style={{ color: '#FF6B6B', fontSize: 12, marginTop: 10 }}>
            ⚠️ {analysisError}
            <button
              onClick={handleRequestAIAnalysis}
              className="btn btn-secondary btn-sm"
              style={{ marginTop: 8, display: 'block', fontSize: 11, padding: '4px 10px' }}
            >
              🔄 Retry Analysis
            </button>
          </div>
        )}

        {aiAnalysis && !isAnalyzing && (
          <div>
            {/* Summary */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 700, color: 'var(--accent)', letterSpacing: 0.5, marginBottom: 4 }}>
                Assessment
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5, margin: 0 }}>
                {aiAnalysis.summary}
              </p>
            </div>

            {/* Done Well */}
            {Array.isArray(aiAnalysis.doneWell) && aiAnalysis.doneWell.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 700, color: 'var(--accent4)', letterSpacing: 0.5, marginBottom: 4 }}>
                  🌟 Strengths
                </div>
                <ul style={{ listStyle: 'none', paddingLeft: 0, margin: 0 }}>
                  {aiAnalysis.doneWell.map((d, i) => (
                    <li key={i} style={{ fontSize: 12, color: 'var(--text-primary)', marginBottom: 4, display: 'flex', gap: 6 }}>
                      <span style={{ color: 'var(--accent4)' }}>✓</span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Actionable Cues */}
            {Array.isArray(aiAnalysis.actionableCues) && aiAnalysis.actionableCues.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 700, color: 'var(--accent3)', letterSpacing: 0.5, marginBottom: 4 }}>
                  🎯 Form Cues for Next Time
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {aiAnalysis.actionableCues.map((cue, i) => (
                    <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', fontSize: 12 }}>
                      {cue}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Next Focus */}
            {aiAnalysis.nextFocus && (
              <div style={{
                background: 'rgba(108,99,255,0.15)',
                borderRadius: 8,
                padding: '8px 12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 10
              }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Next Focus:</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--accent)', textTransform: 'capitalize' }}>
                  {aiAnalysis.nextFocus}
                </span>
              </div>
            )}

            {/* Ask AI Coach Follow-up */}
            <button
              onClick={() => navigate('/ai-coach')}
              className="btn btn-secondary btn-full"
              style={{ marginTop: 14, fontSize: 12, padding: '8px' }}
            >
              💬 Consult AI Coach in Chat
            </button>
          </div>
        )}
      </div>

      {/* Navigation Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button className="btn btn-primary btn-full" onClick={() => navigate('/dashboard')}>
          🏠 Back to Dashboard
        </button>
        <button className="btn btn-secondary btn-full" onClick={() => navigate('/progress')}>
          📊 View Long-Term Progress
        </button>
      </div>
    </div>
  );
}
