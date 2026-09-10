interface StreakFlameProps {
  streak: number;
  size?: 'sm' | 'md' | 'lg';
}

export default function StreakFlame({ streak, size = 'md' }: StreakFlameProps) {
  const sizeMap = { sm: 'text-lg', md: 'text-3xl', lg: 'text-5xl' };
  const numSize = { sm: 'text-sm', md: 'text-xl', lg: 'text-3xl' };

  return (
    <div className="flex items-center gap-1.5">
      <span className={`${sizeMap[size]} ${streak > 0 ? 'animate-pulse' : 'opacity-40'}`}>
        🔥
      </span>
      <span className={`${numSize[size]} font-black ${streak > 0 ? 'text-amber' : 'text-muted'}`}>
        {streak}
        <span className="text-xs font-medium text-muted ml-0.5">d</span>
      </span>
    </div>
  );
}
