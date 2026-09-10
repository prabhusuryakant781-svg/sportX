import { useState, useEffect } from 'react';
import { api } from '../services/api';
import ProgressChart from '../components/ProgressChart';

export default function ProgressPage() {
  const [period, setPeriod] = useState('7d');
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getHistory(period)
      .then((r: any) => setHistory(r.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period]);

  // Aggregate mock chart data from history
  const chartData = [
    { label: 'Mon', value: 120 },
    { label: 'Tue', value: 180 },
    { label: 'Wed', value: 0 },
    { label: 'Thu', value: 240 },
    { label: 'Fri', value: 310 },
    { label: 'Sat', value: 150 },
    { label: 'Sun', value: 420 },
  ];

  return (
    <div className="min-h-screen bg-obsidian">
      <div className="page-header">
        <h1 className="text-white">Progress</h1>
        <p className="text-sm mt-1">Track your fitness journey.</p>
      </div>

      <div className="px-5 mt-5">
        <div className="flex bg-surface rounded-lg p-1">
          {(['7d', '30d', 'all'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${
                period === p ? 'bg-card border border-white/10 text-neon shadow-md' : 'text-muted'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="section">
        <h3 className="text-white">Activity Volume</h3>
        <ProgressChart data={chartData} label="XP Earned" color="#06B6D4" height={180} />

        <h3 className="text-white mt-4">Recent History</h3>
        {loading ? (
          <div className="card skeleton h-24" />
        ) : history.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📭</span>
            <p>No activity in this period.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {history.map(item => (
              <div key={item.id} className="card py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center text-xl">
                  {item.sportId ? '🏅' : '🏋️'}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-white">
                    {item.sportName || item.exerciseId || 'Workout Session'}
                  </div>
                  <div className="text-xs text-muted">
                    {new Date(item.completedAt || item.loggedAt).toLocaleDateString()} •
                    {item.durationMinutes || Math.round(item.durationSeconds / 60)} min
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-neon">+{item.xpAwarded} XP</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
