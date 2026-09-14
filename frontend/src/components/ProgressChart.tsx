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
  color = '#00F0FF',
  label = 'XP Volume',
}: ProgressChartProps) {
  if (!data.length) {
    return (
      <div className="hud-panel text-center py-10 flex flex-col items-center justify-center gap-2">
        <Activity size={32} className="text-slate-600" />
        <p className="text-xs text-slate-400 font-mono">NO TELEMETRY RECORDED FOR THIS TIMELINE</p>
      </div>
    );
  }

  const maxVal = Math.max(...data.map(d => d.value), 10);
  const totalPeriodXp = data.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="hud-panel-cyan p-5 relative overflow-hidden">
      {/* Top Telemetry Header */}
      <div className="flex justify-between items-baseline mb-4 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-cyan font-bold">
              {label}
            </span>
          </div>
          <div className="text-2xl font-black text-white tabular-nums font-outfit mt-1 flex items-baseline gap-1.5">
            {totalPeriodXp.toLocaleString()}{' '}
            <span className="text-xs font-black text-neon uppercase tracking-wider">XP</span>
          </div>
        </div>

        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider bg-white/5 px-2.5 py-1 rounded-md border border-white/10">
          {data.length} INTERVALS
        </span>
      </div>

      {/* Bars Container */}
      <div className="flex items-end justify-between gap-2 pt-4 relative z-10" style={{ height }}>
        {data.map((d, i) => {
          const ratio = d.value / maxVal;
          const barHeight = Math.max(8, ratio * (height - 40));
          const hasValue = d.value > 0;

          return (
            <div key={i} className="flex flex-col items-center gap-1.5 flex-1 group relative">
              {/* Tooltip value */}
              <span
                className={`text-[10px] font-bold tabular-nums font-mono transition-all ${
                  hasValue
                    ? 'text-slate-300 group-hover:text-neon group-hover:scale-110'
                    : 'text-slate-600 opacity-60'
                }`}
              >
                {d.value > 999 ? `${(d.value / 1000).toFixed(1)}k` : d.value}
              </span>

              {/* Bar Fill */}
              <div
                className="w-full rounded-t-sm transition-all duration-500 relative overflow-hidden group-hover:brightness-125"
                style={{
                  height: barHeight,
                  background: hasValue
                    ? `linear-gradient(180deg, #CCFF00 0%, #00F0FF 50%, rgba(0, 240, 255, 0.15) 100%)`
                    : 'rgba(255, 255, 255, 0.05)',
                  boxShadow: hasValue ? `0 0 14px rgba(0, 240, 255, 0.35)` : 'none',
                }}
              >
                {hasValue && (
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-neon shadow-glow-sm" />
                )}
              </div>

              {/* X Axis Label */}
              <span className="text-[10px] text-slate-400 font-mono font-semibold uppercase tracking-wider truncate max-w-[38px] text-center mt-0.5">
                {d.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
