import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import confetti from 'canvas-confetti';
import { 
  Trophy, 
  Flame, 
  Clock, 
  Activity, 
  Bot, 
  Sparkles, 
  ChevronRight, 
  RotateCcw, 
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

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
    const duration = 2200;
    const end = Date.now() + duration;

    (function frame() {
      confetti({
        particleCount: 6,
        angle: 60,
        spread: 60,
        origin: { x: 0 },
        colors: ['#10B981', '#06B6D4', '#FFD93D']
      });
      confetti({
        particleCount: 6,
        angle: 120,
        spread: 60,
        origin: { x: 1 },
        colors: ['#10B981', '#06B6D4', '#FFD93D']
      });

      if (Date.now() < end) requestAnimationFrame(frame);
    }());
  };

  if (!result) return null;

  const formGrade = result.formScore >= 90 ? 'S' : result.formScore >= 80 ? 'A' : result.formScore >= 70 ? 'B' : 'C';
  const gradeColor = formGrade === 'S' ? '#10B981' : formGrade === 'A' ? '#06B6D4' : formGrade === 'B' ? '#F59E0B' : '#EF4444';
  const gradeBadgeClass = formGrade === 'S'
    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    : formGrade === 'A'
    ? 'bg-cyan/15 text-cyan border-cyan/30'
    : formGrade === 'B'
    ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
    : 'bg-rose-500/15 text-rose-400 border-rose-500/30';

  return (
    <div className="min-h-screen bg-obsidian flex flex-col p-4 sm:p-6 animate-fade-in relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/6 left-1/2 -translate-x-1/2 w-80 h-80 bg-neon/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="flex-1 flex flex-col items-center justify-center max-w-[430px] mx-auto w-full relative z-10 py-6">
        
        {/* Celebration Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-hero p-0.5 shadow-glow mb-3">
            <div className="w-full h-full bg-obsidian rounded-[14px] flex items-center justify-center text-amber-400">
              <Trophy size={32} />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Workout Completed!
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 font-medium">
            {exercise.name} session verified by SportX Vision Telemetry.
          </p>
        </div>

        {/* ── Main Performance Summary Card ──────────────────── */}
        <div className="w-full card-glass bg-gradient-card border-neon/30 p-6 flex flex-col items-center gap-5 mb-5 relative overflow-hidden shadow-card">
          <div className="relative z-10 flex flex-col items-center">
            <span className="text-[11px] text-slate-400 font-bold tracking-widest uppercase mb-1 flex items-center gap-1">
              <Sparkles size={12} className="text-neon" />
              <span>XP Awarded</span>
            </span>
            <div className="text-6xl font-black text-neon font-outfit tabular-nums tracking-tight filter drop-shadow-[0_0_20px_rgba(16,185,129,0.5)]">
              +{xpEarned}
            </div>
          </div>

          <div className="w-full h-[1px] bg-white/10 relative z-10" />

          {/* 4-Metric Grid */}
          <div className="relative z-10 w-full grid grid-cols-2 gap-3">
            <div className="flex flex-col items-center text-center p-3 rounded-xl bg-surface/50 border border-white/5">
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
                <Activity size={12} className="text-cyan" />
                <span>Verified Reps</span>
              </span>
              <span className="text-2xl font-black text-white tabular-nums font-outfit">
                {result.reps}
              </span>
            </div>

            <div className="flex flex-col items-center text-center p-3 rounded-xl bg-surface/50 border border-white/5">
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
                <Clock size={12} className="text-slate-400" />
                <span>Active Time</span>
              </span>
              <span className="text-2xl font-black text-white tabular-nums font-outfit">
                {Math.floor(result.duration / 60)}:{(result.duration % 60).toString().padStart(2, '0')}
              </span>
            </div>

            <div className="flex flex-col items-center text-center p-3 rounded-xl bg-surface/50 border border-white/5">
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-1 flex items-center gap-1">
                <Flame size={12} className="text-amber-400" />
                <span>Best Streak</span>
              </span>
              <span className="text-2xl font-black text-amber-400 tabular-nums font-outfit">
                🔥 {result.streak}
              </span>
            </div>

            <div className="flex flex-col items-center text-center p-3 rounded-xl bg-surface/50 border border-white/5">
              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-1">
                Form Grade
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-2xl font-black font-outfit" style={{ color: gradeColor }}>
                  {formGrade}
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${gradeBadgeClass}`}>
                  {result.formScore}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Post-Workout AI Coach Debrief (Priority 2) ─────────── */}
        <div className="w-full card-glass border border-cyan/30 p-5 rounded-2xl mb-5 shadow-card bg-gradient-to-b from-cyan-950/25 to-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-cyan/15 text-cyan flex items-center justify-center border border-cyan/30">
                <Bot size={18} />
              </div>
              <h3 className="text-sm font-bold text-white tracking-tight">Gemini Movement Debrief</h3>
            </div>
            <span className="badge-pill text-[10px] bg-cyan/15 text-cyan border-cyan/30">
              Server AI
            </span>
          </div>

          {!aiAnalysis && !isAnalyzing && (
            <div>
              <p className="text-xs text-slate-300 leading-relaxed mb-3.5">
                Request authoritative AI evaluation of your biomechanics, movement depth, and recovery cues grounded in this session's telemetry.
              </p>
              <button
                onClick={handleRequestAIAnalysis}
                className="btn btn-secondary w-full py-2.5 text-xs font-bold bg-cyan-950/40 hover:bg-cyan-900/40 text-cyan border border-cyan/40 flex items-center justify-center gap-2"
              >
                <Sparkles size={14} />
                <span>Analyze Workout with AI Coach</span>
              </button>
            </div>
          )}

          {isAnalyzing && (
            <div className="text-center py-4 space-y-2">
              <div className="spinner w-7 h-7 mx-auto border-cyan" />
              <div className="text-xs font-bold text-white">Correlating Vision & Firestore Telemetry…</div>
              <div className="text-[10px] text-slate-400">Consulting Google Gemini AI Coach</div>
            </div>
          )}

          {analysisError && !isAnalyzing && (
            <div className="text-rose-300 text-xs p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5">
                <AlertCircle size={15} className="text-rose-400 flex-shrink-0" />
                <span>{analysisError}</span>
              </div>
              <button
                onClick={handleRequestAIAnalysis}
                className="btn btn-secondary text-[11px] py-1.5 px-3 block"
              >
                <RotateCcw size={12} className="inline mr-1" />
                <span>Retry AI Analysis</span>
              </button>
            </div>
          )}

          {aiAnalysis && !isAnalyzing && (
            <div className="space-y-3 pt-1 animate-slide-up">
              <div>
                <span className="text-[10px] uppercase font-bold text-cyan tracking-wider">
                  Assessment
                </span>
                <p className="text-xs text-slate-200 mt-1 leading-relaxed">
                  {aiAnalysis.summary}
                </p>
              </div>

              {Array.isArray(aiAnalysis.actionableCues) && aiAnalysis.actionableCues.length > 0 && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                    🎯 Biomechanical Cues for Next Session
                  </span>
                  <div className="space-y-1.5 mt-2">
                    {aiAnalysis.actionableCues.map((cue: string, i: number) => (
                      <div key={i} className="bg-black/40 border border-white/5 rounded-xl p-2.5 text-xs text-slate-300 flex items-start gap-2">
                        <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span className="leading-snug">{cue}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => navigate('/ai-coach')}
                className="btn btn-secondary w-full py-2.5 text-xs mt-2 bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center gap-2 font-bold"
              >
                <span>Consult AI Coach in Chat</span>
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Primary Finish Button */}
        <button
          className="btn btn-primary w-full py-4 text-sm font-black flex items-center justify-center gap-2 shadow-glow"
          onClick={() => navigate('/dashboard')}
          disabled={saving}
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <span className="spinner w-4 h-4 border-white/30 border-t-white" />
              <span>Saving Results…</span>
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <span>Return to Performance Hub</span>
              <ArrowRight size={16} />
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
