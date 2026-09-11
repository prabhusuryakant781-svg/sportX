import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

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
  'How can I build workout consistency around my classes?',
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
          user?.currentStreak ? `Active ${user.currentStreak}-day workout streak` : 'Ready to start your next training block',
          user?.totalXp ? `${user.totalXp} XP accumulated toward your fitness goals` : 'Equipped with computer vision movement analysis'
        ],
        recommendations: [
          'Ask me for biomechanical feedback on your squats, pushups, or curls.',
          'Request a personalized workout plan matched to your available time.'
        ],
        nextFocus: 'consistency & form quality'
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
      // Connect to real backend API: POST /api/v1/ai/ask-coach
      const res: any = await api.askCoach({ message });

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
            strengths: [`Tailored for ${user?.selectedSports?.[0] || 'college athletics'}`],
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
    <div className="flex flex-col h-full bg-obsidian text-white relative">
      {/* ── Top Header ────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 px-4 py-3 bg-gray-900/95 backdrop-blur-md border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-1.5 text-muted hover:text-white rounded-lg bg-white/5 border border-white/10"
            aria-label="Back to dashboard"
          >
            ←
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🤖</span>
              <h1 className="text-base font-bold text-white tracking-tight">SportX AI Coach</h1>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Live
              </span>
            </div>
            <p className="text-[11px] text-muted">Google Gemini • Server-Side Intelligence</p>
          </div>
        </div>

        <div className="flex gap-1.5">
          <button
            onClick={handleQuickInsight}
            disabled={isLoading}
            className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
          >
            📊 Insights
          </button>
          <button
            onClick={handleQuickWorkout}
            disabled={isLoading}
            className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-neon/10 hover:bg-neon/20 text-neon border border-neon/30 transition-colors"
          >
            ⚡ Plan
          </button>
        </div>
      </div>

      {/* ── Chat Messages Stream ──────────────────────────────── */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            {msg.sender === 'user' ? (
              <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-gradient-hero px-4 py-2.5 text-white text-sm shadow-md">
                <p className="text-white leading-relaxed">{msg.text}</p>
                <span className="block text-[10px] text-white/70 text-right mt-1">{msg.timestamp}</span>
              </div>
            ) : (
              <div className="max-w-[92%] rounded-2xl rounded-tl-sm bg-gray-900 border border-white/10 p-4 shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs">⚡</span>
                    <span className="text-xs font-bold text-neon uppercase tracking-wider">Coach Evaluation</span>
                  </div>
                  <span className="text-[10px] text-muted">{msg.timestamp}</span>
                </div>

                {msg.structuredResponse?.summary && (
                  <p className="text-xs text-slate-200 leading-relaxed font-normal">
                    {msg.structuredResponse.summary}
                  </p>
                )}

                {msg.structuredResponse?.strengths && msg.structuredResponse.strengths.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Strengths</span>
                    <ul className="mt-1 space-y-1">
                      {msg.structuredResponse.strengths.map((s, idx) => (
                        <li key={idx} className="text-xs text-slate-300 flex items-start gap-1.5">
                          <span className="text-emerald-400 text-xs">✓</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {msg.structuredResponse?.recommendations && msg.structuredResponse.recommendations.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Actionable Recommendations</span>
                    <ul className="mt-1 space-y-1">
                      {msg.structuredResponse.recommendations.map((r, idx) => (
                        <li key={idx} className="text-xs text-slate-300 flex items-start gap-1.5">
                          <span className="text-amber-400 text-xs">→</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {msg.structuredResponse?.nextFocus && (
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[10px] text-muted uppercase tracking-wider">Primary Next Focus:</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      🎯 {msg.structuredResponse.nextFocus}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start">
            <div className="rounded-2xl rounded-tl-sm bg-gray-900 border border-white/10 p-3.5 flex items-center gap-3">
              <div className="spinner w-4 h-4 border-neon" />
              <span className="text-xs text-muted animate-pulse">AI Coach is analyzing telemetry & formulating cues…</span>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
            {lastFailedMessage && (
              <button
                onClick={() => handleSendMessage(lastFailedMessage)}
                className="self-start px-2.5 py-1 text-[10px] font-semibold rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 transition-colors"
              >
                🔄 Retry Question
              </button>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Suggested Prompts Chips ────────────────────────────── */}
      <div className="px-4 py-2 border-t border-white/5 bg-gray-950/80">
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          {SUGGESTED_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(q)}
              disabled={isLoading}
              className="whitespace-nowrap px-3 py-1.5 rounded-full text-[11px] bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* ── Message Input Bar ──────────────────────────────────── */}
      <div className="p-3 bg-gray-900/95 border-t border-white/10 backdrop-blur-md">
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
            placeholder="Ask your AI Coach (e.g. form, sets, recovery)..."
            maxLength={500}
            disabled={isLoading}
            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-muted focus:outline-none focus:border-neon transition-colors"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="btn btn-primary px-4 py-2.5 text-xs font-semibold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
