import { Flame } from 'lucide-react';

interface StreakFlameProps {
  streak: number;
  size?: 'sm' | 'md' | 'lg';
}

export default function StreakFlame({ streak, size = 'md' }: StreakFlameProps) {
  const iconSizes = { sm: 16, md: 24, lg: 36 };
  const textSizes = { sm: 'text-sm', md: 'text-xl', lg: 'text-3xl' };

  const hasStreak = streak > 0;

  return (
    <div className="flex items-center justify-center gap-1.5 select-none">
      <div className={`relative flex items-center justify-center ${hasStreak ? 'text-amber-400' : 'text-slate-600'}`}>
        {hasStreak && (
          <div className="absolute inset-0 bg-amber-500/30 rounded-full blur-md animate-pulse pointer-events-none" />
        )}
        <Flame
          size={iconSizes[size]}
          className={`relative z-10 transition-transform ${hasStreak ? 'fill-amber-400/20 text-amber-400' : ''}`}
        />
      </div>
      <span className={`${textSizes[size]} font-black tabular-nums tracking-tight ${hasStreak ? 'text-amber-400' : 'text-slate-500'}`}>
        {streak}
        <span className="text-[11px] font-bold text-slate-400 ml-0.5 uppercase">d</span>
      </span>
    </div>
  );
}
