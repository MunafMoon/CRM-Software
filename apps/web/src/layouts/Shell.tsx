import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Sun,
  Users,
  Columns3,
  ListTodo,
  CalendarDays,
  BriefcaseBusiness,
  Handshake,
  ChartNoAxesCombined,
  Settings,
  Search,
  Bell,
  ChevronDown,
  Plus,
  ArrowUpRight,
  PanelLeftClose,
  Send,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../auth/Auth';
import { useData } from '../hooks/useCrm';
import { Avatar } from '../components/ui';
const nav = [
  ['/', 'Dashboard', LayoutDashboard],
  ['/today', 'Today', Sun],
  ['/prospects', 'Prospects', Users],
  ['/pipeline', 'Pipeline', Columns3],
  ['/followups', 'Follow-ups', ListTodo],
  ['/meetings', 'Meetings', CalendarDays],
  ['/deals', 'Deals', BriefcaseBusiness],
  ['/clients', 'Clients', Handshake],
  ['/outreach', 'Outreach', Send],
  ['/analytics', 'Analytics', ChartNoAxesCombined],
] as const;
export function Shell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState(false);
  const [error, setError] = useState('');
  const dashboard = useData('/dashboard');
  const due =
    (dashboard.data?.kpis.followupsToday || 0) +
    (dashboard.data?.overdueFollowups.length || 0);
  return (
    <div className="app-shell">
      <aside className={open ? 'sidebar mobile-open' : 'sidebar'}>
        <NavLink to="/" className="brand">
          <span className="brand-symbol">f</span>folio
          <span className="brand-dot">.</span>
        </NavLink>
        <div className="workspace-switch">
          <span className="workspace-icon">S</span>
          <div>
            <strong>Studio workspace</strong>
            <small>Agency CRM</small>
          </div>
          <ChevronDown size={15} />
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav>
          {nav.map(([to, title, Icon]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setOpen(false)}
            >
              <Icon size={18} />
              <span>{title}</span>
              {to === '/today' && due > 0 && <b className="nav-count">{due}</b>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="workspace-tip">
            <span className="tip-dot" /> A little progress, every day.
            <p>Your next great client starts with a conversation.</p>
            <NavLink to="/today">
              Let’s get to work <ArrowUpRight size={14} />
            </NavLink>
          </div>
          <NavLink className="settings-link" to="/settings">
            <Settings size={18} />
            Settings
          </NavLink>
          <div className="sidebar-user">
            <Avatar name={`${user!.firstName} ${user!.lastName}`} small />
            <div>
              <strong>
                {user!.firstName} {user!.lastName}
              </strong>
              <small>{user!.role.toLowerCase()}</small>
            </div>
            <span className="online-dot" />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            aria-label="Toggle navigation"
            onClick={() => setOpen(!open)}
          >
            <PanelLeftClose size={20} />
          </button>
          <form
            className="global-search"
            onSubmit={(e) => {
              e.preventDefault();
              navigate(`/prospects?search=${encodeURIComponent(search)}`);
            }}
          >
            <Search size={18} />
            <input
              aria-label="Search workspace"
              placeholder="Search your workspace…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <kbd>↵</kbd>
          </form>
          <div className="topbar-right">
            <span className="workspace-live">
              <i /> Workspace live
            </span>
            <button
              className="icon-button notification"
              aria-label={`${due} follow-ups due`}
              onClick={() => navigate('/today')}
            >
              <Bell size={19} />
              {due > 0 && <i />}
            </button>
            <div className="profile-wrap">
              <button
                className="profile-button"
                onClick={() => setProfile(!profile)}
                aria-label="Profile menu"
              >
                <Avatar name={user!.firstName} small />
                <ChevronDown size={14} />
              </button>
              {profile && (
                <div className="profile-menu">
                  <button
                    onClick={() => {
                      navigate('/settings');
                      setProfile(false);
                    }}
                  >
                    Profile & settings
                  </button>
                  <button
                    onClick={() => {
                      void logout().catch((e) => setError(e.message));
                    }}
                  >
                    <LogOut size={15} />
                    Sign out
                  </button>
                  {error && <small className="error">{error}</small>}
                </div>
              )}
            </div>
          </div>
        </header>
        <main>
          <Outlet />
        </main>
        <footer className="page-footer">
          <span>Folio CRM · Built for meaningful connections</span>
          <span>All times in IST · INR ₹</span>
        </footer>
      </div>
    </div>
  );
}
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function AddButton({
  onClick,
  children = 'Add prospect',
}: {
  onClick: () => void;
  children?: React.ReactNode;
}) {
  return (
    <button className="button" onClick={onClick}>
      <Plus size={17} />
      {children}
    </button>
  );
}
