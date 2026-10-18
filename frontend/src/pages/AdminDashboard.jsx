import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import Logo from '../components/Logo.jsx';
import { adminApi } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, isSuperadmin, impersonateCustomer, logout } = useAuth();

  const [stats, setStats] = useState({
    total_customers: 0,
    total_domains: 0,
    verified_customers: 0,
    active_customers: 0,
  });
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [impersonatingId, setImpersonatingId] = useState(null);

  // Selected user for viewing domains
  const [inspectUser, setInspectUser] = useState(null);
  const [inspectDomains, setInspectDomains] = useState([]);
  const [loadingDomains, setLoadingDomains] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, usersRes] = await Promise.all([
        adminApi.getStats(),
        adminApi.getUsers(),
      ]);
      setStats(statsRes);
      setUsers(usersRes);
    } catch (err) {
      setError(err.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleImpersonate = async (targetUser) => {
    setImpersonatingId(targetUser.id);
    try {
      await impersonateCustomer(targetUser);
      navigate('/dashboard');
    } catch (err) {
      alert('Impersonation failed: ' + (err.message || 'Unknown error'));
      setImpersonatingId(null);
    }
  };

  const handleInspectDomains = async (targetUser) => {
    setInspectUser(targetUser);
    setLoadingDomains(true);
    try {
      const doms = await adminApi.getCustomerDomains(targetUser.id);
      setInspectDomains(doms);
    } catch (err) {
      alert('Failed to load customer domains');
    } finally {
      setLoadingDomains(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.plan?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-surface-container bg-surface-container-lowest px-6 py-3.5 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Logo />
          <div className="h-5 w-px bg-outline-variant/30" />
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary border border-primary/20">
              <Icon name="shield" size={14} /> Superadmin Console
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="btn-secondary btn-sm flex items-center gap-1.5 text-xs font-semibold"
          >
            <Icon name="dashboard" size={16} /> My Dashboard
          </button>

          <div className="h-5 w-px bg-outline-variant/30" />

          <div className="flex items-center gap-2 text-xs">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-on-primary font-bold">
              {user?.full_name?.charAt(0) || 'A'}
            </div>
            <div className="hidden sm:block text-left">
              <div className="font-bold text-on-surface leading-none">{user?.full_name}</div>
              <div className="text-muted text-[11px] leading-tight">{user?.email}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="btn-icon text-muted hover:text-error"
            title="Sign out"
          >
            <Icon name="logout" size={18} />
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-6">
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-on-surface">Platform Administration</h1>
            <p className="text-sm text-muted">
              Live multi-tenant overview. Select any customer below to inspect and manage their dashboard directly.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="btn-secondary btn-sm flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Icon name="sync" size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-error/30 bg-error/10 p-4 text-sm text-error flex items-center gap-2">
            <Icon name="error" /> {error}
          </div>
        )}

        {/* Global Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon name="group" size={24} />
            </div>
            <div>
              <div className="text-2xl font-black text-on-surface">{stats.total_customers}</div>
              <div className="text-xs font-semibold text-muted">Registered Customers</div>
            </div>
          </div>

          <div className="card flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-tertiary-container/30 text-tertiary">
              <Icon name="language" size={24} />
            </div>
            <div>
              <div className="text-2xl font-black text-on-surface">{stats.total_domains}</div>
              <div className="text-xs font-semibold text-muted">Domains Tracked</div>
            </div>
          </div>

          <div className="card flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary-container/30 text-secondary">
              <Icon name="verified_user" size={24} />
            </div>
            <div>
              <div className="text-2xl font-black text-on-surface">{stats.verified_customers}</div>
              <div className="text-xs font-semibold text-muted">Verified Accounts</div>
            </div>
          </div>

          <div className="card flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-container text-outline">
              <Icon name="bolt" size={24} />
            </div>
            <div>
              <div className="text-2xl font-black text-on-surface">{stats.active_customers}</div>
              <div className="text-xs font-semibold text-muted">Active Customers</div>
            </div>
          </div>
        </div>

        {/* Customer Directory Table */}
        <div className="card space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-lg font-bold text-on-surface">Customer Directory</h2>
              <p className="text-xs text-muted">View all customer tenants and jump straight into their dashboard.</p>
            </div>
            <div className="w-full sm:w-72">
              <input
                type="text"
                placeholder="Search by name, email, or plan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="field-input !py-1.5 text-xs w-full"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-surface-container">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-low text-muted font-bold uppercase tracking-wider text-[11px] border-b border-surface-container">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Role / Plan</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-center">Domains</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container bg-surface-container-lowest">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-muted">
                      <Icon name="sync" className="animate-spin inline-block mr-2" /> Loading customers...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-muted">
                      No accounts found matching your query.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelf = u.id === user?.id;
                    const isCustomerAdmin = u.is_superuser || u.role === 'superadmin';

                    return (
                      <tr key={u.id} className="hover:bg-surface-container-low transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-container text-xs font-bold text-on-surface">
                              {u.full_name?.charAt(0) || 'U'}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-on-surface truncate flex items-center gap-1.5">
                                {u.full_name}
                                {isSelf && (
                                  <span className="pill pill-plain !text-[10px] !py-0 !px-1.5">You</span>
                                )}
                              </div>
                              <div className="text-muted text-[11px] truncate">{u.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex flex-col gap-1 items-start">
                            {isCustomerAdmin ? (
                              <span className="pill bg-primary/10 text-primary border border-primary/20 !text-[11px]">
                                Superadmin
                              </span>
                            ) : (
                              <span className="pill pill-brand uppercase !text-[11px]">
                                {u.plan || 'trial'}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          {u.is_verified ? (
                            <span className="pill pill-success !text-[11px] inline-flex items-center gap-1">
                              <Icon name="check" size={13} /> Verified
                            </span>
                          ) : (
                            <span className="pill bg-surface-container text-muted !text-[11px]">
                              Pending
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-center font-bold">
                          <button
                            type="button"
                            onClick={() => handleInspectDomains(u)}
                            className="hover:underline text-primary"
                            title="Inspect registered domains"
                          >
                            {u.domain_count}
                          </button>
                        </td>

                        <td className="px-4 py-3.5 text-muted text-[11px]">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleInspectDomains(u)}
                              className="btn-secondary !py-1 !px-2.5 !text-xs"
                              title="View registered domains"
                            >
                              Domains
                            </button>

                            <button
                              type="button"
                              onClick={() => handleImpersonate(u)}
                              disabled={impersonatingId === u.id}
                              className="btn-primary !py-1 !px-3 !text-xs flex items-center gap-1 shadow-sm"
                            >
                              {impersonatingId === u.id ? (
                                <Icon name="sync" size={14} className="animate-spin" />
                              ) : (
                                <Icon name="login" size={14} />
                              )}
                              <span>Open Dashboard</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Inspect Domains Modal */}
      {inspectUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="card max-w-lg w-full space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between border-b border-surface-container pb-3">
              <div>
                <h3 className="font-bold text-base text-on-surface">Domains: {inspectUser.full_name}</h3>
                <p className="text-xs text-muted">{inspectUser.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setInspectUser(null)}
                className="btn-icon"
              >
                <Icon name="close" />
              </button>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto">
              {loadingDomains ? (
                <div className="py-6 text-center text-xs text-muted">
                  <Icon name="sync" className="animate-spin inline-block mr-2" /> Loading domains...
                </div>
              ) : inspectDomains.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted">
                  This user has not registered any domains yet.
                </div>
              ) : (
                inspectDomains.map((d) => (
                  <div key={d.id} className="inset p-3 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-on-surface">{d.domain}</div>
                      <div className="text-xs text-muted">Brand: {d.brand_name}</div>
                    </div>
                    <span className="pill pill-brand text-[11px]">
                      {d.competitors?.length || 0} Competitors
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-surface-container">
              <button
                type="button"
                onClick={() => setInspectUser(null)}
                className="btn-secondary btn-sm"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleImpersonate(inspectUser)}
                className="btn-primary btn-sm flex items-center gap-1.5"
              >
                <Icon name="login" size={16} /> Open Customer Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
