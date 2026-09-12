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
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const { result, exercise, planId, sessionId, completionData } = location.state || {};

  const handleRequestAIAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      if (!sessionId) {
        throw new Error('No session ID associated with this workout. Please restart workout from library.');
      }
      const res = await api.analyzeSession(sessionId);
      if (res?.data) {
        setAiAnalysis(res.data);
      } else {
        throw new Error('Analysis payload was empty.');
      }
    } catch (err: any) {
      console.error('[SessionResultPage] AI analysis error:', err);
      setAnalysisError(err.message || 'AI workout analysis could not be generated. Please retry.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (!result || !exercise) {
      navigate('/dashboard', { replace: true });
      return;
    }

    const saveResult = async () => {
      try {
        // Authoritative server XP from backend completion response
        const serverXp = completionData?.xpEarned ?? completionData?.xpAdded ?? completionData?.xp;
        if (typeof serverXp === 'number') {
          setXpEarned(serverXp);
        } else {
          // Fallback only if completionData was not passed
          const calcXp = Math.floor(result.reps * (result.formScore / 100) * 10);
          setXpEarned(calcXp);
        }

        await refreshUser();
        triggerConfetti();
      } catch (err) {
        console.error('Failed to finalize result display', err);
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

        {/* ── Post-Workout AI Coach Debrief (Priority 2) ── */}
        <div className="w-full card bg-gradient-to-b from-indigo-950/40 to-slate-900/60 border border-indigo-500/30 p-5 rounded-2xl mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🤖</span>
              <h3 className="text-sm font-bold text-white">Gemini Post-Workout Debrief</h3>
            </div>
            <span className="badge-pill text-[10px] bg-indigo-500/20 text-indigo-300">Server-Side AI</span>
          </div>

          {!aiAnalysis && !isAnalyzing && (
            <div>
              <p className="text-xs text-muted leading-relaxed mb-4">
                Request authoritative AI evaluation of your biomechanics, volume, and recovery cues grounded in this session's telemetry.
              </p>
              <button
                onClick={handleRequestAIAnalysis}
                className="btn btn-secondary w-full py-2.5 text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-200 border border-indigo-500/40"
              >
                ⚡ Analyze Workout with AI Coach
              </button>
            </div>
          )}

          {isAnalyzing && (
            <div className="text-center py-4">
              <div className="spinner w-6 h-6 mx-auto mb-2 border-indigo-400" />
              <div className="text-xs font-semibold text-white">Correlating Vision & Firestore Telemetry…</div>
              <div className="text-[10px] text-muted mt-1">Consulting Google Gemini AI Coach</div>
            </div>
          )}

          {analysisError && !isAnalyzing && (
            <div className="text-rose-400 text-xs mt-2">
              ⚠️ {analysisError}
              <button
                onClick={handleRequestAIAnalysis}
                className="btn btn-secondary text-[10px] py-1 px-2.5 mt-2 block"
              >
                🔄 Retry Analysis
              </button>
            </div>
          )}

          {aiAnalysis && !isAnalyzing && (
            <div className="space-y-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Assessment</span>
                <p className="text-xs text-slate-200 mt-1 leading-relaxed">{aiAnalysis.summary}</p>
              </div>

              {Array.isArray(aiAnalysis.actionableCues) && aiAnalysis.actionableCues.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber tracking-wider">🎯 Form Cues for Next Time</span>
                  <div className="space-y-1.5 mt-1.5">
                    {aiAnalysis.actionableCues.map((cue: string, i: number) => (
                      <div key={i} className="bg-black/30 border border-white/5 rounded-lg p-2 text-xs text-slate-300">
                        {cue}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => navigate('/ai-coach')}
                className="btn btn-secondary w-full py-2 text-xs mt-3 bg-white/5 hover:bg-white/10"
              >
                💬 Consult AI Coach in Chat
              </button>
            </div>
          )}
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
