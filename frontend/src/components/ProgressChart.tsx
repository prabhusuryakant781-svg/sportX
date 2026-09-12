import { Activity } from 'lucide-react';

interface DataPoint {
  label: string;
  value: number;
}

interface ProgressChartProps {
  data: DataPoint[];
  height?: number;
  color?: string;
  label?: string;
}

export default function ProgressChart({
  data,
  height = 170,
  color = '#10B981',
  label = 'XP Volume',
}: ProgressChartProps) {
  if (!data.length) {
    return (
      <div className="card text-center py-10 flex flex-col items-center justify-center gap-2 border border-white/5">
        <Activity size={32} className="text-slate-600" />
        <p className="text-xs text-slate-400">No telemetry recorded for this timeline.</p>
      </div>
    );
  }

  const maxVal = Math.max(...data.map(d => d.value), 10);
  const totalPeriodXp = data.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="card-glass border border-white/10 p-5 rounded-2xl shadow-card">
      <div className="flex justify-between items-baseline mb-4">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            {label}
          </span>
          <div className="text-xl font-black text-white tabular-nums font-outfit mt-0.5">
            {totalPeriodXp.toLocaleString()} <span className="text-xs font-bold text-neon uppercase">XP</span>
          </div>
        </div>

        <span className="text-[11px] font-semibold text-slate-400">
          {data.length} intervals recorded
        </span>
      </div>

      <div className="flex items-end justify-between gap-2 pt-4" style={{ height }}>
        {data.map((d, i) => {
          const ratio = d.value / maxVal;
          const barHeight = Math.max(6, ratio * (height - 38));
          const hasValue = d.value > 0;

          return (
            <div key={i} className="flex flex-col items-center gap-1.5 flex-1 group relative">
              {/* Tooltip value */}
              <span className={`text-[10px] font-bold tabular-nums font-mono transition-opacity ${
                hasValue ? 'text-slate-300 group-hover:text-neon' : 'text-slate-600 opacity-60'
              }`}>
                {d.value > 999 ? `${(d.value / 1000).toFixed(1)}k` : d.value}
              </span>

              {/* Bar Fill */}
              <div
                className="w-full rounded-t-lg transition-all duration-500 relative"
                style={{
                  height: barHeight,
                  background: hasValue
                    ? `linear-gradient(180deg, ${color} 0%, ${color}33 100%)`
                    : 'rgba(255, 255, 255, 0.05)',
                  boxShadow: hasValue ? `0 0 12px ${color}40` : 'none',
                }}
              />

              {/* X Axis Label */}
              <span className="text-[10px] text-slate-400 font-medium truncate max-w-[36px] text-center">
                {d.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
