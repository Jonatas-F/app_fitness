import { NavLink } from 'react-router-dom';
import { mobileNavigationItems } from '../data/appData';
import { NAV_ICONS } from './NavIcons';

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {mobileNavigationItems.map((item) => {
        const Icon = NAV_ICONS[item.iconKey];
        return (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `bottom-nav__link ${isActive ? 'bottom-nav__link--active' : ''}`
            }
          >
            <span className="bottom-nav__icon">
              {Icon && <Icon />}
            </span>
            <span>{item.shortLabel}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
