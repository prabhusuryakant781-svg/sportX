import React from 'react';

export type SportxLogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'custom';

export interface SportxLogoProps {
  /** Size variant */
  size?: SportxLogoSize;
  /** Optional custom CSS classes */
  className?: string;
  /** Whether to apply athletic neon drop glow */
  glow?: boolean;
  /** Accessible alt text */
  alt?: string;
  /** Priority eager loading for above-the-fold / splash screens */
  priority?: boolean;
}

const SIZE_MAP: Record<Exclude<SportxLogoSize, 'custom'>, string> = {
  xs: 'w-6 h-6 rounded-md',
  sm: 'w-8 h-8 rounded-xl',
  md: 'w-16 h-16 sm:w-20 sm:h-20 rounded-2xl',
  lg: 'w-24 h-24 sm:w-28 sm:h-28 rounded-2xl',
  xl: 'w-32 h-32 sm:w-40 sm:h-40 rounded-3xl',
};

export default function SportxLogo({
  size = 'md',
  className = '',
  glow = false,
  alt = 'SportX — Train. Compete. Be Better.',
  priority = false,
}: SportxLogoProps) {
  const sizeClasses = size === 'custom' ? '' : SIZE_MAP[size];
  const glowClasses = glow
    ? 'drop-shadow-[0_0_18px_rgba(204,255,0,0.35)] shadow-glow-sm'
    : '';

  return (
    <img
      src="/images/sportx-logo.jpg"
      alt={alt}
      width={size === 'xs' ? 24 : size === 'sm' ? 32 : size === 'md' ? 80 : size === 'lg' ? 112 : 160}
      height={size === 'xs' ? 24 : size === 'sm' ? 32 : size === 'md' ? 80 : size === 'lg' ? 112 : 160}
      className={`aspect-square object-contain select-none pointer-events-none transition-transform duration-200 ${sizeClasses} ${glowClasses} ${className}`}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
    />
  );
}
