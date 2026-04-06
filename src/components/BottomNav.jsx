import { NavLink } from 'react-router-dom';
import { mobileNavigationItems } from '../data/appData';

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {mobileNavigationItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === '/'}
          className={({ isActive }) =>
            `bottom-nav__link ${isActive ? 'bottom-nav__link--active' : ''}`
          }
        >
          <span className="bottom-nav__icon">{item.icon}</span>
          <span>{item.shortLabel}</span>
        </NavLink>
      ))}
    </nav>
  );
}