import { useState, useEffect } from 'react';
import { api } from '../services/api';
import ProgressChart from '../components/ProgressChart';
import { TrendingUp, Calendar, Dumbbell, Activity, Award, Clock } from 'lucide-react';

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
  const [period, setPeriod] = useState<'7d' | '30d' | 'all'>('7d');
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getHistory(period)
      .then((r: any) => setHistory(r?.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period]);

  const chartData = buildChartDataFromHistory(history, period);

  return (
    <div className="space-y-4 pb-8 animate-fade-in">
      {/* Header */}
      <header className="pt-2">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-xl bg-cyan/15 text-cyan flex items-center justify-center">
            <TrendingUp size={18} />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-cyan">Performance Telemetry</span>
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight">Athlete Progress</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Historical volume, workout frequency and XP progression.
        </p>
      </header>

      {/* Segmented Time Filter */}
      <div className="flex rounded-xl p-1 bg-surface border border-white/5">
        {(['7d', '30d', 'all'] as const).map(p => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={`flex-1 py-2 rounded-lg border-none cursor-pointer font-outfit font-bold text-xs tracking-wider uppercase transition-all duration-200 ${
              period === p
                ? 'bg-card text-neon shadow-md border border-white/10'
                : 'bg-transparent text-slate-400 hover:text-white'
            }`}
          >
            {p === '7d' ? 'Last 7 Days' : p === '30d' ? 'Last 30 Days' : 'All-Time'}
          </button>
        ))}
      </div>

      {/* Activity Volume Chart */}
      <section>
        <h2 className="text-sm font-black text-white uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
          <Activity size={15} className="text-cyan" />
          <span>Activity Volume</span>
        </h2>

        {loading ? (
          <div className="card skeleton h-[180px]" />
        ) : (
          <ProgressChart data={chartData} label="XP Progression" color="#06B6D4" height={170} />
        )}
      </section>

      {/* Session History Feed */}
      <section>
        <div className="flex justify-between items-center mb-2.5">
          <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
            <Calendar size={15} className="text-neon" />
            <span>Completed Sessions ({history.length})</span>
          </h2>
          <span className="text-[11px] text-slate-400 font-semibold">
            {period === '7d' ? 'Past Week' : period === '30d' ? 'Past Month' : 'All Recorded'}
          </span>
        </div>

        {loading ? (
          <div className="space-y-2">
            <div className="card skeleton h-16" />
            <div className="card skeleton h-16" />
          </div>
        ) : history.length === 0 ? (
          <div className="card text-center py-10 border border-white/5">
            <span className="text-3xl block mb-2">📭</span>
            <h3 className="text-sm font-bold text-white">No Sessions in this Timeline</h3>
            <p className="text-xs text-slate-400 mt-1">
              Complete drills in the camera studio to record real telemetry.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((item, idx) => (
              <div key={item.id || idx} className="card p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-surface flex items-center justify-center text-lg text-neon flex-shrink-0">
                    {item.sportId ? '🏅' : <Dumbbell size={18} />}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white capitalize">
                      {item.sportName || item.exerciseId?.replace(/_/g, ' ') || 'Workout Session'}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span>
                        {new Date(item.completedAt || item.loggedAt || Date.now()).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        <span>{item.durationMinutes || Math.round((item.durationSeconds || 0) / 60)} min</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="font-black text-sm text-neon tabular-nums font-outfit">
                    +{item.xpAwarded || item.xp || 0} XP
                  </div>
                  {typeof item.totalReps === 'number' && (
                    <div className="text-[10px] text-slate-400">
                      {item.totalReps} reps
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
