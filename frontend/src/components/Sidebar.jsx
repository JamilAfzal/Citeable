import { NavLink } from 'react-router-dom';
import Icon from './Icon.jsx';
import Logo from './Logo.jsx';
import { navItems } from '../data/mock.js';

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="flex flex-col gap-4">
        <Logo />
        <button type="button" className="inset flex w-full items-center justify-between !px-2 !py-1.5 hover:bg-surface-container">
          <span className="flex items-center gap-2 text-[13px] font-semibold">
            <span className="h-2 w-2 rounded-full bg-tertiary-fixed-dim" />acme.com
            <span className="pill bg-secondary-fixed text-secondary">PRO</span>
          </span>
          <Icon name="unfold_more" size={16} className="text-outline" />
        </button>
        <nav className="flex flex-col gap-1">
          {navItems.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}>
              <Icon name={n.icon} />{n.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="flex flex-col gap-2">
        <div className="inset flex flex-col gap-1">
          <div className="flex justify-between text-[13px] font-semibold">Starter Plan<span className="text-code">8.4k / 10k</span></div>
          <div className="progress h-1.5"><div className="progress-bar" style={{ width: '84%' }} /></div>
          <div className="flex items-center justify-between pt-1 text-[11px]">
            <span className="text-outline">Quota resets in 9d</span>
            <button type="button" className="link">Upgrade</button>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-lg p-1 hover:bg-surface-container-low">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-on-primary"><Icon name="person" size={18} /></div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-[13px] font-semibold">Alex Morgan</div>
            <div className="truncate text-code">alex@acme.com</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
