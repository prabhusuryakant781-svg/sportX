import { NavLink, useLocation } from 'react-router-dom';
import { Home, Swords, Dumbbell, Bot, TrendingUp, type LucideIcon } from 'lucide-react';

interface NavItemDef {
  to: string;
  icon: LucideIcon;
  label: string;
  matches?: string[];
}

const navItems: NavItemDef[] = [
  { to: '/dashboard', icon: Home, label: 'Home', matches: ['/dashboard', '/'] },
  { to: '/lobby', icon: Swords, label: 'Compete', matches: ['/lobby', '/leaderboard'] },
  { to: '/workout', icon: Dumbbell, label: 'Workout', matches: ['/workout'] },
  { to: '/ai-coach', icon: Bot, label: 'AI Coach', matches: ['/ai-coach'] },
  { to: '/progress', icon: TrendingUp, label: 'Progress', matches: ['/progress'] },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="bottom-nav" aria-label="Main Navigation">
      {navItems.map(item => {
        const IconComponent = item.icon;
        const isActive = item.matches
          ? item.matches.includes(location.pathname)
          : location.pathname === item.to;

        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={`nav-item ${isActive ? 'active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
          >
            <div className="nav-icon-box relative">
              <IconComponent size={20} className="transition-transform duration-200" />
              {isActive && (
                <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-neon shadow-[0_0_8px_#10B981]" />
              )}
            </div>
            <span className={isActive ? 'text-white font-bold' : ''}>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
