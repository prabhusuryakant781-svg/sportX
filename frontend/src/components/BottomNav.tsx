import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/dashboard', icon: '🏠', label: 'Home' },
  { to: '/workout', icon: '💪', label: 'Workout' },
  { to: '/ai-coach', icon: '🤖', label: 'AI Coach' },
  { to: '/progress', icon: '📊', label: 'Progress' },
  { to: '/lobby', icon: '⚡', label: 'Compete' },
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {navItems.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <span className="nav-icon">{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
