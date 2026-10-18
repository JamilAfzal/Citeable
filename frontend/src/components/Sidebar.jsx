import { NavLink, useNavigate } from 'react-router-dom';
import Icon from './Icon.jsx';
import Logo from './Logo.jsx';
import { navItems } from '../data/mock.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function Sidebar({ domains = [], activeDomain, onSelectDomain, onAddDomain }) {
  const navigate = useNavigate();
  const { user, isSuperadmin, impersonation, exitImpersonation, logout } = useAuth();

  const handleAdminLink = () => {
    if (impersonation.isImpersonating) {
      exitImpersonation();
    }
    navigate('/admin');
  };

  const domainLabel = activeDomain?.domain || (domains.length > 0 ? domains[0].domain : 'acme.com');

  return (
    <aside className="sidebar">
      <div className="flex flex-col gap-4">
        <Logo />

        {/* Domain Selector */}
        <div className="relative group">
          <button
            type="button"
            onClick={onAddDomain}
            className="inset flex w-full items-center justify-between !px-2.5 !py-2 hover:bg-surface-container transition-colors"
          >
            <span className="flex items-center gap-2 text-[13px] font-semibold truncate">
              <span className="h-2 w-2 rounded-full bg-tertiary-fixed-dim shrink-0" />
              <span className="truncate">{domainLabel}</span>
              <span className="pill bg-secondary-fixed text-secondary !text-[10px] shrink-0 uppercase">
                {user?.plan || 'PRO'}
              </span>
            </span>
            <Icon name="add" size={16} className="text-primary hover:scale-110 shrink-0" />
          </button>
        </div>

        {/* Superadmin Link (if admin or currently impersonating) */}
        {(isSuperadmin || impersonation.isImpersonating) && (
          <button
            type="button"
            onClick={handleAdminLink}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 text-xs font-bold text-primary hover:bg-primary/20 transition-all text-left"
          >
            <Icon name="shield" size={16} />
            <span>Admin Console</span>
            <span className="ml-auto text-[10px] bg-primary text-on-primary px-1.5 py-0.5 rounded-full">
              Super
            </span>
          </button>
        )}

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1">
          {navItems.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}
            >
              <Icon name={n.icon} />
              {n.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="flex flex-col gap-2">
        <div className="inset flex flex-col gap-1">
          <div className="flex justify-between text-[13px] font-semibold">
            {user?.plan ? `${user.plan.toUpperCase()} Plan` : 'Starter Plan'}
            <span className="text-code">8.4k / 10k</span>
          </div>
          <div className="progress h-1.5">
            <div className="progress-bar" style={{ width: '84%' }} />
          </div>
          <div className="flex items-center justify-between pt-1 text-[11px]">
            <span className="text-outline">Quota resets in 9d</span>
            <button type="button" className="link">Upgrade</button>
          </div>
        </div>

        {/* Profile Card & Logout */}
        <div className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-surface-container-low transition-colors">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-on-primary font-bold text-xs shrink-0">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-[13px] font-semibold text-on-surface">
              {user?.full_name || 'Loading...'}
            </div>
            <div className="truncate text-code text-[11px]">
              {user?.email || ''}
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="btn-icon !h-7 !w-7 text-muted hover:text-error"
            title="Log out"
          >
            <Icon name="logout" size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
