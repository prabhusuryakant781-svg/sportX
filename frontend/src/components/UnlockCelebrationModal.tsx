import React from 'react';
import { Trophy, Award, Sparkles, X, ChevronRight } from 'lucide-react';

export interface UnlockCelebrationItem {
  id: string;
  name: string;
  description: string;
  icon?: string;
  rarity?: 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary' | string;
  xpReward?: number;
  category?: string;
}

interface UnlockCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'badge' | 'milestone' | 'title' | 'rank';
  item: UnlockCelebrationItem | null;
  onAction?: () => void;
  actionLabel?: string;
}

const RARITY_THEMES: Record<string, { badge: string; glow: string; border: string; text: string }> = {
  Common: {
    badge: 'bg-slate-800/80 text-slate-300 border-slate-700',
    glow: 'rgba(148, 163, 184, 0.25)',
    border: 'border-slate-600/50',
    text: 'text-slate-300',
  },
  Uncommon: {
    badge: 'bg-emerald-950/80 text-emerald-400 border-emerald-700/60',
    glow: 'rgba(52, 211, 153, 0.3)',
    border: 'border-emerald-500/50',
    text: 'text-emerald-400',
  },
  Rare: {
    badge: 'bg-cyan-950/80 text-cyan-400 border-cyan-700/60',
    glow: 'rgba(34, 211, 238, 0.35)',
    border: 'border-cyan-500/60',
    text: 'text-cyan-400',
  },
  Epic: {
    badge: 'bg-purple-950/80 text-purple-300 border-purple-700/60',
    glow: 'rgba(192, 132, 252, 0.4)',
    border: 'border-purple-500/60',
    text: 'text-purple-300',
  },
  Legendary: {
    badge: 'bg-amber-950/80 text-amber-300 border-amber-500/80',
    glow: 'rgba(251, 191, 36, 0.45)',
    border: 'border-amber-400/70',
    text: 'text-amber-400',
  },
};

export default function UnlockCelebrationModal({
  isOpen,
  onClose,
  type,
  item,
  onAction,
  actionLabel = 'Equip Title',
}: UnlockCelebrationModalProps) {
  if (!isOpen || !item) return null;

  const rarity = item.rarity || 'Uncommon';
  const theme = RARITY_THEMES[rarity] || RARITY_THEMES.Uncommon;

  const getHeading = () => {
    switch (type) {
      case 'title':
        return 'NEW ATHLETE TITLE UNLOCKED';
      case 'milestone':
        return 'MAJOR MILESTONE REACHED';
      case 'rank':
        return 'RANK PROMOTION CELEBRATION';
      default:
        return 'ACHIEVEMENT UNLOCKED';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div
        className={`relative w-full max-w-md overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900 via-slate-950 to-black p-6 text-center shadow-2xl border ${theme.border}`}
        style={{
          boxShadow: `0 0 45px ${theme.glow}, 0 20px 25px -5px rgba(0, 0, 0, 0.5)`,
        }}
      >
        {/* Subtle background ambient light */}
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full blur-3xl opacity-30 pointer-events-none"
          style={{ backgroundColor: theme.glow }}
        />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700/60 transition"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Header Tag */}
        <div className="flex items-center justify-center gap-1.5 mb-3">
          <Sparkles size={15} className={theme.text} />
          <span className="text-[11px] font-black uppercase tracking-widest text-slate-300">
            {getHeading()}
          </span>
          <Sparkles size={15} className={theme.text} />
        </div>

        {/* Central Emote / Badge Icon */}
        <div className="my-5 flex justify-center">
          <div
            className={`relative flex items-center justify-center w-24 h-24 rounded-2xl border-2 bg-slate-900/90 shadow-xl ${theme.border}`}
          >
            <span className="text-5xl select-none filter drop-shadow-md">
              {item.icon || (type === 'title' ? '👑' : '🏆')}
            </span>
            <div
              className="absolute inset-0 rounded-2xl animate-pulse pointer-events-none"
              style={{
                boxShadow: `inset 0 0 15px ${theme.glow}`,
              }}
            />
          </div>
        </div>

        {/* Rarity & Category Chip */}
        <div className="flex items-center justify-center gap-2 mb-2">
          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${theme.badge}`}
          >
            {rarity}
          </span>
          {item.category && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">
              {item.category}
            </span>
          )}
        </div>

        {/* Item Title */}
        <h2 className="text-2xl font-black text-white tracking-tight mb-2">
          {item.name}
        </h2>

        {/* Item Description */}
        <p className="text-sm text-slate-300 font-medium px-4 leading-relaxed mb-5">
          {item.description}
        </p>

        {/* XP Reward (if applicable) */}
        {item.xpReward && item.xpReward > 0 && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neon/10 border border-neon/30 text-neon text-xs font-bold mb-6">
            <Trophy size={14} />
            <span>+{item.xpReward} XP Awarded</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 mt-2">
          {onAction && (
            <button
              onClick={() => {
                onAction();
                onClose();
              }}
              className="w-full py-3 px-4 rounded-xl font-black text-sm tracking-wide uppercase transition bg-gradient-to-r from-neon via-emerald-400 to-neon text-black hover:opacity-95 shadow-glow flex items-center justify-center gap-2"
            >
              <span>{actionLabel}</span>
              <ChevronRight size={16} />
            </button>
          )}
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl font-bold text-xs tracking-wider uppercase text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 transition border border-slate-700/50"
          >
            Continue Training
          </button>
        </div>
      </div>
    </div>
  );
}
