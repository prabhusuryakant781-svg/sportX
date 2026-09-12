import { useState, useEffect } from 'react';
import { api } from '../services/api';
import ProgressChart from '../components/ProgressChart';

function buildChartDataFromHistory(history: any[], period: string): Array<{ label: string; value: number }> {
  if (!Array.isArray(history) || history.length === 0) {
    return [];
  }

  const now = new Date();

  if (period === '7d') {
    const days: Array<{ dateStr: string; label: string; value: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString(undefined, { weekday: 'short' });
      days.push({ dateStr, label, value: 0 });
    }

    for (const item of history) {
      const itemDate = (item.completedAt || item.loggedAt || item.createdAt || '').split('T')[0];
      const bucket = days.find(b => b.dateStr === itemDate);
      if (bucket) {
        bucket.value += Number(item.xpAwarded || item.xp || 0);
      }
    }

    return days.map(d => ({ label: d.label, value: d.value }));
  }

  if (period === '30d') {
    const intervals: Array<{ start: number; end: number; label: string; value: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const startD = new Date(now);
      startD.setDate(startD.getDate() - (i * 5 + 4));
      startD.setHours(0, 0, 0, 0);

      const endD = new Date(now);
      endD.setDate(endD.getDate() - (i * 5));
      endD.setHours(23, 59, 59, 999);

      const label = `${startD.getDate()}/${startD.getMonth() + 1}`;
      intervals.push({ start: startD.getTime(), end: endD.getTime(), label, value: 0 });
    }

    for (const item of history) {
      const time = new Date(item.completedAt || item.loggedAt || item.createdAt || 0).getTime();
      const bucket = intervals.find(b => time >= b.start && time <= b.end);
      if (bucket) {
        bucket.value += Number(item.xpAwarded || item.xp || 0);
      }
    }

    return intervals.map(b => ({ label: b.label, value: b.value }));
  }

  // 'all': group by month
  const monthMap = new Map<string, number>();
  for (const item of history) {
    const date = new Date(item.completedAt || item.loggedAt || item.createdAt || 0);
    if (!isNaN(date.getTime())) {
      const monthLabel = date.toLocaleDateString(undefined, { month: 'short' });
      const current = monthMap.get(monthLabel) || 0;
      monthMap.set(monthLabel, current + Number(item.xpAwarded || item.xp || 0));
    }
  }

  return Array.from(monthMap.entries()).map(([label, value]) => ({ label, value }));
}

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

  const chartData = buildChartDataFromHistory(history, period);

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
        {loading ? (
          <div className="card skeleton h-[180px]" />
        ) : chartData.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📊</span>
            <p className="text-sm text-muted">No activity data recorded in this period.</p>
          </div>
        ) : (
          <ProgressChart data={chartData} label="XP Earned" color="#06B6D4" height={180} />
        )}

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
