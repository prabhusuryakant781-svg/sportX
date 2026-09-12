import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Bot, 
  Send, 
  Sparkles, 
  ArrowLeft, 
  Activity, 
  CheckCircle2, 
  ChevronRight, 
  Target, 
  Zap, 
  RotateCcw,
  Sliders,
  Dumbbell
} from 'lucide-react';

interface CoachMessage {
  id: string;
  sender: 'user' | 'coach';
  text?: string;
  structuredResponse?: {
    summary: string;
    strengths?: string[];
    recommendations?: string[];
    nextFocus?: string;
  };
  timestamp: string;
}

const SUGGESTED_QUESTIONS = [
  'How do I maintain chest depth on pushups?',
  'What should I focus on to improve my squat form?',
  'How can I build workout consistency around classes?',
  'Suggest a quick 20-minute bodyweight routine.',
];

export default function AICoachPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<CoachMessage[]>([
    {
      id: 'welcome_1',
      sender: 'coach',
      structuredResponse: {
        summary: `Hey ${user?.name || 'Athlete'}! I am your SportX AI Coach, grounded in your real workout telemetry, streaks, and form data.`,
        strengths: [
          user?.currentStreak ? `Active ${user.currentStreak}-day workout streak` : 'Ready to begin your athletic conditioning block',
          user?.totalXp ? `${user.totalXp} XP accumulated toward your fitness goals` : 'Computer vision movement tracking calibrated'
        ],
        recommendations: [
          'Ask for biomechanical form corrections on squats, pushups, or jumping jacks.',
          'Request an adaptive routine matched to your available training window.'
        ],
        nextFocus: 'consistency & movement depth'
      },
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const message = (textToSend || inputText).trim();
    if (!message || isLoading) return;

    setErrorMessage(null);
    setInputText('');

    const userMessage: CoachMessage = {
      id: `user_${Date.now()}`,
      sender: 'user',
      text: message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const recentHistory = messages
        .filter(m => m.id !== 'welcome_1')
        .slice(-4)
        .map(m => ({
          role: (m.sender === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: m.text || m.structuredResponse?.summary || ''
        }))
        .filter(t => t.content.trim().length > 0);

      // Connect to authoritative backend endpoint: POST /api/v1/ai/ask-coach
      const res: any = await api.askCoach({ message, history: recentHistory });

      if (res?.data) {
        const coachMessage: CoachMessage = {
          id: `coach_${Date.now()}`,
          sender: 'coach',
          structuredResponse: {
            summary: res.data.summary,
            strengths: res.data.strengths || [],
            recommendations: res.data.recommendations || [],
            nextFocus: res.data.nextFocus || 'form'
          },
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, coachMessage]);
        setLastFailedMessage(null);
      } else {
        throw new Error('AI Coach response format was unexpected.');
      }
    } catch (err: any) {
      console.error('[AICoachPage] Error sending message:', err);
      const friendlyError = err.message || 'Could not connect to AI Coach. Please check your connection and try again.';
      setErrorMessage(friendlyError);
      setLastFailedMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickInsight = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res: any = await api.getAIConsistency();
      if (res?.data) {
        const insightMessage: CoachMessage = {
          id: `coach_consistency_${Date.now()}`,
          sender: 'coach',
          structuredResponse: {
            summary: res.data.headline || res.data.summary || 'Here is your consistency analysis from your recent training patterns.',
            strengths: res.data.strengths || (res.data.keyStrength ? [res.data.keyStrength] : ['Dedicated focus to movement quality']),
            recommendations: res.data.recommendations || (res.data.actionableTip ? [res.data.actionableTip] : ['Stick to scheduled workout days']),
            nextFocus: res.data.riskFactor || 'consistency'
          },
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, insightMessage]);
      } else {
        throw new Error('Could not retrieve consistency insights.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to fetch AI progress insights.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickWorkout = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res: any = await api.generateWorkout({
        durationMinutes: 20,
        focus: 'full_body'
      });
      if (res?.data) {
        const plan = res.data;
        const workoutMessage: CoachMessage = {
          id: `coach_plan_${Date.now()}`,
          sender: 'coach',
          structuredResponse: {
            summary: `Custom Plan Generated: "${plan.title || 'Athletic Conditioning'}" (${plan.difficulty || 'Intermediate'}, ~${plan.estimatedDurationMinutes || 20}m).`,
            strengths: [`Tailored for ${user?.selectedSports?.[0] || 'collegiate athletics'}`],
            recommendations: (plan.exercises || []).map((e: any) => `${e.name || e.exerciseId}: ${e.sets} sets × ${e.reps} reps`),
            nextFocus: 'controlled execution'
          },
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, workoutMessage]);
      } else {
        throw new Error('Failed to generate customized workout plan.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to generate customized workout plan.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-90px)] bg-obsidian text-white relative -mx-4 -mt-3">
      {/* ── Top Header ────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 px-4 py-3 bg-obsidian/95 backdrop-blur-md border-b border-white/10 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-surface border border-white/5 transition-colors cursor-pointer"
            aria-label="Back to dashboard"
          >
            <ArrowLeft size={16} />
          </button>
          
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-cyan/15 text-cyan flex items-center justify-center border border-cyan/30 shadow-glow-cyan-sm">
              <Bot size={22} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-black text-white tracking-tight">SportX Coach</h1>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Online</span>
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Google Gemini • Movement Intelligence</p>
            </div>
          </div>
        </div>

        {/* Action Pills */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleQuickInsight}
            disabled={isLoading}
            className="px-2.5 py-1.5 text-[11px] font-bold rounded-xl bg-surface hover:bg-surface-light text-slate-300 border border-white/5 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <Activity size={12} className="text-cyan" />
            <span>Telemetry</span>
          </button>
          
          <button
            type="button"
            onClick={handleQuickWorkout}
            disabled={isLoading}
            className="px-2.5 py-1.5 text-[11px] font-bold rounded-xl bg-neon/15 hover:bg-neon/25 text-neon border border-neon/30 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-glow-sm"
          >
            <Zap size={12} />
            <span>AI Routine</span>
          </button>
        </div>
      </header>

      {/* ── Chat Feed ─────────────────────────────────────────── */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex flex-col animate-fade-in ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            {msg.sender === 'user' ? (
              <div className="max-w-[85%] rounded-2xl rounded-tr-xs bg-gradient-hero px-4 py-3 text-white text-xs sm:text-sm font-medium shadow-md">
                <p className="text-white leading-relaxed">{msg.text}</p>
                <span className="block text-[9px] text-white/70 text-right mt-1.5 tabular-nums">
                  {msg.timestamp}
                </span>
              </div>
            ) : (
              <div className="max-w-[92%] rounded-2xl rounded-tl-xs card-glass border-white/10 p-4 shadow-card space-y-3">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={13} className="text-cyan" />
                    <span className="text-[10px] font-black text-cyan uppercase tracking-wider">
                      Biomechanical Evaluation
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-400 tabular-nums">{msg.timestamp}</span>
                </div>

                {msg.structuredResponse?.summary && (
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {msg.structuredResponse.summary}
                  </p>
                )}

                {msg.structuredResponse?.strengths && msg.structuredResponse.strengths.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                      Observed Strengths
                    </span>
                    <ul className="mt-1.5 space-y-1">
                      {msg.structuredResponse.strengths.map((s, idx) => (
                        <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                          <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {msg.structuredResponse?.recommendations && msg.structuredResponse.recommendations.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                      Actionable Form Cues
                    </span>
                    <ul className="mt-1.5 space-y-1">
                      {msg.structuredResponse.recommendations.map((r, idx) => (
                        <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                          <ChevronRight size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {msg.structuredResponse?.nextFocus && (
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                      Priority Focus
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                      <Target size={11} />
                      <span className="capitalize">{msg.structuredResponse.nextFocus}</span>
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start animate-fade-in">
            <div className="rounded-2xl rounded-tl-xs card-glass border-white/10 p-3.5 flex items-center gap-3">
              <div className="spinner w-4 h-4 border-cyan" />
              <span className="text-xs text-slate-300 font-medium animate-pulse">
                AI Coach analyzing movement telemetry…
              </span>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
            {lastFailedMessage && (
              <button
                type="button"
                onClick={() => handleSendMessage(lastFailedMessage)}
                className="self-start px-3 py-1 text-[10px] font-bold rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw size={11} />
                <span>Retry Question</span>
              </button>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Suggested Questions Chips ─────────────────────────── */}
      <div className="px-4 py-2 border-t border-white/5 bg-obsidian/95">
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5">
          {SUGGESTED_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(q)}
              disabled={isLoading}
              className="whitespace-nowrap px-3 py-1.5 rounded-full text-[11px] font-semibold bg-surface hover:bg-surface-light text-slate-300 border border-white/5 transition-colors cursor-pointer select-none disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* ── Message Input Bar ──────────────────────────────────── */}
      <div className="p-3 bg-obsidian border-t border-white/10">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex gap-2 items-center"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask AI Coach about reps, depth, recovery…"
            maxLength={500}
            disabled={isLoading}
            className="flex-1 bg-surface border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-neon transition-colors"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="btn btn-primary px-4 py-3 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md disabled:opacity-40"
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}
