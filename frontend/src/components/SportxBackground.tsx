import React from 'react';

interface SportxBackgroundProps {
  imageSrc?: string;
  src?: string;
  overlayOpacity?: 'light' | 'normal' | 'heavy' | number;
  showSpeedBeams?: boolean;
  accentGlow?: 'neon' | 'cyan' | 'amber';
  children?: React.ReactNode;
  className?: string;
  focalPosition?: string;
}

export default function SportxBackground({
  imageSrc,
  src,
  overlayOpacity = 'normal',
  showSpeedBeams = true,
  accentGlow = 'neon',
  children,
  className = '',
  focalPosition = 'center top',
}: SportxBackgroundProps) {
  const finalImage = src || imageSrc || '/images/bg-dashboard.jpg';

  // Vignette gradient based on requested density
  const overlayGradientClass =
    overlayOpacity === 'light' || (typeof overlayOpacity === 'number' && overlayOpacity < 0.7)
      ? 'from-obsidian/30 via-obsidian/70 to-obsidian'
      : overlayOpacity === 'heavy' || (typeof overlayOpacity === 'number' && overlayOpacity >= 0.85)
      ? 'from-obsidian/60 via-obsidian/90 to-obsidian'
      : 'from-obsidian/40 via-obsidian/80 to-obsidian';

  const glowPrimary =
    accentGlow === 'amber'
      ? 'bg-amber-500/[0.12]'
      : accentGlow === 'cyan'
      ? 'bg-cyan/[0.12]'
      : 'bg-neon/[0.08]';

  const glowSecondary =
    accentGlow === 'amber'
      ? 'bg-yellow-500/[0.08]'
      : accentGlow === 'cyan'
      ? 'bg-blue-500/[0.10]'
      : 'bg-cyan/[0.08]';

  return (
    <div className={`relative min-h-full w-full overflow-hidden ${className}`}>
      {/* ── Fixed/Absolute Cinematic Sports Background ── */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Responsive, lazy-loaded background image */}
        <div
          className="absolute inset-0 bg-cover transition-opacity duration-700 pointer-events-none scale-[1.02]"
          style={{
            backgroundImage: `url('${finalImage}')`,
            backgroundPosition: focalPosition,
          }}
        />

        {/* Cinematic Vignette Overlay (Guarantees WCAG text readability) */}
        <div
          className={`absolute inset-0 bg-gradient-to-b ${overlayGradientClass} pointer-events-none`}
          style={typeof overlayOpacity === 'number' ? { opacity: overlayOpacity } : undefined}
        />

        {/* Ambient Volumetric Speed Glow Orbs */}
        <div className={`absolute top-1/4 -left-16 w-80 h-80 ${glowPrimary} rounded-full blur-[110px] pointer-events-none`} />
        <div className={`absolute top-1/3 -right-16 w-80 h-80 ${glowSecondary} rounded-full blur-[110px] pointer-events-none`} />

        {/* Subtle Athletic Laser Speed Streaks (matching Login Screen DNA) */}
        {showSpeedBeams && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none opacity-25"
            xmlns="http://www.w3.org/2000/svg"
          >
            <line
              x1="-20%"
              y1="10%"
              x2="120%"
              y2="60%"
              stroke="#CCFF00"
              strokeWidth="1.5"
              strokeDasharray="180 300"
              className="animate-pulse-subtle"
            />
            <line
              x1="-10%"
              y1="25%"
              x2="110%"
              y2="75%"
              stroke="#00F0FF"
              strokeWidth="1"
              strokeDasharray="120 400"
            />
            <line
              x1="0%"
              y1="40%"
              x2="120%"
              y2="90%"
              stroke="#CCFF00"
              strokeWidth="0.75"
              strokeDasharray="90 350"
            />
          </svg>
        )}
      </div>

      {/* Screen Content Container */}
      <div className="relative z-10 flex-1 w-full">
        {children}
      </div>
    </div>
  );
}
