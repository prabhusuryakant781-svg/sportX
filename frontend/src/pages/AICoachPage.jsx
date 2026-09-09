import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';

const SUGGESTED_QUESTIONS = [
  'How can I improve my workouts?',
  'How do I maintain my streak with limited time?',
  'What should I focus on for my sport?',
  'How can I improve my squat and push-up form?',
];

export default function AICoachPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [response, setResponse] = useState(null);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const trimmed = question.trim();

    if (!trimmed) {
      setError('Please enter a sports or workout question.');
      return;
    }

    if (trimmed.length > 500) {
      setError('Your question must be under 500 characters.');
      return;
    }

    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      // Direct call to existing Phase 2 backend POST /api/v1/ai/ask-coach
      const result = await api.askCoach({ message: trimmed });

      if (result && result.success && result.data) {
        setResponse(result.data);
      } else if (result && result.error) {
        setError(result.error);
      } else {
        setError('Received an unexpected response format from the AI Coach service.');
      }
    } catch (err) {
      console.error('[AICoachPage] Error consulting AI Coach:', err);
      const errMsg = err?.message || 'Failed to communicate with the AI Coach backend.';
      if (errMsg.includes('401') || errMsg.toLowerCase().includes('unauthorized')) {
        setError('Your session has expired. Please log in again.');
      } else if (errMsg.includes('Failed to fetch') || errMsg.includes('NetworkError')) {
        setError('Network error: Unable to connect to the SportX backend service.');
      } else {
        setError(errMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSuggested = (text) => {
    setQuestion(text);
    setError(null);
  };

  const handleReset = () => {
    setQuestion('');
    setResponse(null);
    setError(null);
  };

  return (
    <div style={{ padding: '20px 20px 32px' }}>
      {/* Top Header with Back Navigation */}
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <button
          onClick={() => navigate('/dashboard')}
          className="btn btn-secondary btn-sm"
          style={{ padding: '6px 12px', fontSize: 13 }}
        >
          ← Dashboard
        </button>
        <span className="badge-pill">⚡ Powered by Gemini</span>
      </div>

      {/* Page Title & Subtitle */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 900 }}>SportX AI Coach 🤖</h1>
        <p style={{ fontSize: 13, marginTop: 4, color: 'var(--text-muted)' }}>
          Personalized guidance grounded in your workout sessions, streak, and fitness goals.
        </p>
      </div>

      {/* User Context Bar */}
      <div
        className="card"
        style={{
          background: 'rgba(31, 41, 55, 0.4)',
          border: '1px solid var(--border)',
          padding: '12px 16px',
          marginBottom: 20,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>👤</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{user?.name || 'Student Athlete'}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Goal: <span style={{ color: 'var(--accent)' }}>{user?.fitnessGoal || 'fitness'}</span> • Level: {user?.fitnessLevel || 'beginner'}
            </div>
          </div>
        </div>
        <div className="stat-pill" style={{ fontSize: 12, padding: '4px 10px' }}>
          🔥 Streak: {user?.currentStreak ?? 0}d
        </div>
      </div>

      {/* Input Form Area */}
      <form onSubmit={handleSubmit} style={{ marginBottom: 20 }}>
        <div className="form-group" style={{ marginBottom: 12 }}>
          <label htmlFor="ai-question-input">Your Fitness / Sports Question:</label>
          <textarea
            id="ai-question-input"
            className="input"
            rows={3}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="E.g. How can I improve my consistency? What exercises will help my football agility?"
            maxLength={500}
            disabled={loading}
            style={{
              resize: 'vertical',
              minHeight: 80,
              maxHeight: 180,
              width: '100%',
              fontSize: 14,
              lineHeight: 1.5,
            }}
          />
          <div className="flex justify-between" style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            <span>Concise and specific questions yield the best coaching advice.</span>
            <span>{question.length} / 500</span>
          </div>
        </div>

        {/* Quick Suggestion Chips */}
        {!response && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
              💡 Suggested Questions:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {SUGGESTED_QUESTIONS.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectSuggested(item)}
                  disabled={loading}
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 100,
                    padding: '6px 12px',
                    fontSize: 12,
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'border-color 0.2s',
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ flex: 1 }}
            disabled={loading || !question.trim()}
          >
            {loading ? 'Consulting Coach…' : 'Ask AI Coach 🚀'}
          </button>
          {question && !loading && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleReset}
              style={{ padding: '0 16px' }}
            >
              Clear
            </button>
          )}
        </div>
      </form>

      {/* Loading State Display */}
      {loading && (
        <div
          className="card animate-in"
          style={{
            textAlign: 'center',
            padding: '28px 20px',
            background: 'var(--bg-card)',
            border: '1px solid rgba(108,99,255,0.3)',
            marginBottom: 20,
          }}
        >
          <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto 12px' }} />
          <h4 style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Analyzing Context & Consulting Coach…</h4>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            Correlating your workout history, consistency metrics, and training goals.
          </p>
        </div>
      )}

      {/* Error State Display */}
      {error && !loading && (
        <div
          className="card animate-in"
          style={{
            background: 'rgba(255, 107, 107, 0.1)',
            border: '1px solid rgba(255, 107, 107, 0.4)',
            padding: '14px 16px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: 'var(--accent2)', fontSize: 14 }}>Coaching Error</div>
            <p style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 2 }}>{error}</p>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleSubmit}
              style={{ marginTop: 10, padding: '4px 12px', fontSize: 12 }}
            >
              🔄 Retry
            </button>
          </div>
        </div>
      )}

      {/* Structured AI Coach Response */}
      {response && !loading && (
        <div
          className="card animate-in"
          style={{
            background: 'linear-gradient(180deg, rgba(108, 99, 255, 0.1) 0%, var(--bg-card) 100%)',
            border: '1px solid rgba(108, 99, 255, 0.4)',
            padding: '20px',
            borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow)',
          }}
        >
          {/* Response Header */}
          <div className="flex items-center justify-between" style={{ marginBottom: 16, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 22 }}>📋</span>
              <h3 style={{ fontSize: 16, fontWeight: 800 }}>Coach Analysis</h3>
            </div>
            <span
              style={{
                fontSize: 11,
                padding: '3px 8px',
                borderRadius: 4,
                background: 'rgba(107, 203, 119, 0.15)',
                color: 'var(--accent4)',
                fontWeight: 700,
              }}
            >
              Verified Response
            </span>
          </div>

          {/* 1. Summary */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent)', letterSpacing: 0.5, marginBottom: 4 }}>
              Summary
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.6 }}>
              {response.summary}
            </p>
          </div>

          {/* 2. Strengths */}
          {Array.isArray(response.strengths) && response.strengths.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent4)', letterSpacing: 0.5, marginBottom: 6 }}>
                🌟 Strengths & Momentum
              </div>
              <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
                {response.strengths.map((item, idx) => (
                  <li
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                      fontSize: 13,
                      marginBottom: 6,
                      color: 'var(--text-primary)',
                    }}
                  >
                    <span style={{ color: 'var(--accent4)', fontWeight: 'bold' }}>✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 3. Actionable Recommendations */}
          {Array.isArray(response.recommendations) && response.recommendations.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent3)', letterSpacing: 0.5, marginBottom: 6 }}>
                🎯 Actionable Recommendations
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {response.recommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 12px',
                      fontSize: 13,
                      color: 'var(--text-primary)',
                      lineHeight: 1.5,
                    }}
                  >
                    <span style={{ fontWeight: 700, color: 'var(--accent3)', marginRight: 6 }}>#{idx + 1}</span>
                    {rec}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Next Focus */}
          {response.nextFocus && (
            <div
              style={{
                background: 'rgba(108, 99, 255, 0.15)',
                border: '1px solid rgba(108, 99, 255, 0.3)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 16,
              }}
            >
              <div>
                <div style={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)' }}>
                  Primary Next Focus
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--accent)', textTransform: 'capitalize', marginTop: 2 }}>
                  {response.nextFocus}
                </div>
              </div>
              <span style={{ fontSize: 24 }}>⚡</span>
            </div>
          )}

          {/* Ask Another Question Button */}
          <button
            type="button"
            className="btn btn-secondary btn-full"
            onClick={handleReset}
            style={{ marginTop: 18 }}
          >
            Ask Another Question 💬
          </button>
        </div>
      )}
    </div>
  );
}
