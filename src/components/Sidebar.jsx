import { NavLink } from 'react-router-dom';
import { navigationItems, quickSummary } from '../data/appData';
import { NAV_ICONS } from './NavIcons';
import logoMark from '../assets/logo_sp.svg';

export default function Sidebar() {
  return (
    <aside className="app-shell__sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__brand-mark">
          <img src={logoMark} alt="Shape Certo" />
        </span>
        <div>
          <p className="sidebar__brand-title">Shape Certo</p>
          <p className="sidebar__brand-subtitle">Personal Virtual</p>
        </div>
      </div>

      <nav className="sidebar__nav">
        {navigationItems.map((item) => {
          const Icon = NAV_ICONS[item.iconKey];
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
              }
            >
              <span className="sidebar__link-icon">
                {Icon && <Icon />}
              </span>
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <section className="sidebar__summary glass-panel">
        <h3 className="sidebar__summary-title">{quickSummary.title}</h3>
        <ul className="sidebar__summary-list">
          {quickSummary.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
