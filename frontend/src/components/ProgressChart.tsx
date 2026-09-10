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
  height = 160,
  color = '#10B981',
  label = 'Reps',
}: ProgressChartProps) {
  if (!data.length) {
    return (
      <div className="empty-state">
        <span className="empty-icon">📊</span>
        <p className="text-sm text-muted">No data yet</p>
      </div>
    );
  }

  const maxVal = Math.max(...data.map(d => d.value), 1);
  const barWidth = Math.max(12, Math.min(40, Math.floor(280 / data.length)));

  return (
    <div className="card">
      {label && (
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-semibold text-muted">{label}</span>
          <span className="text-xs text-muted">Last {data.length} days</span>
        </div>
      )}

      <div className="flex items-end justify-between gap-1" style={{ height }}>
        {data.map((d, i) => {
          const barHeight = Math.max(4, (d.value / maxVal) * (height - 24));
          return (
            <div key={i} className="flex flex-col items-center gap-1 flex-1">
              <span className="text-[10px] text-muted font-medium">{d.value}</span>
              <div
                className="w-full rounded-t-md transition-all duration-500"
                style={{
                  height: barHeight,
                  background: `linear-gradient(180deg, ${color} 0%, ${color}44 100%)`,
                  minWidth: barWidth,
                  maxWidth: barWidth,
                }}
              />
              <span className="text-[9px] text-muted">{d.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
