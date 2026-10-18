import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';
import Topbar from '../components/Topbar.jsx';
import StatCard from '../components/StatCard.jsx';
import LineChart from '../components/LineChart.jsx';
import Icon from '../components/Icon.jsx';
import { stats, models, competitors, results, modelSeries, weeks } from '../data/mock.js';
import { useAuth } from '../context/AuthContext.jsx';
import { domainsApi } from '../api/client.js';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, impersonation, exitImpersonation } = useAuth();
  const [range, setRange] = useState('30 days');
  const [model, setModel] = useState('all');

  // Domains state
  const [domains, setDomains] = useState([]);
  const [activeDomain, setActiveDomain] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDomain, setNewDomain] = useState({ domain: '', brand_name: '', niche: '' });
  const [addingDomain, setAddingDomain] = useState(false);
  const [domainError, setDomainError] = useState('');

  const loadDomains = async () => {
    try {
      const res = await domainsApi.list();
      setDomains(res || []);
      if (res && res.length > 0) {
        setActiveDomain(res[0]);
      }
    } catch (e) {
      console.error('Failed to load domains:', e);
    }
  };

  useEffect(() => {
    loadDomains();
  }, [user?.id]);

  const handleCreateDomain = async (e) => {
    e.preventDefault();
    if (!newDomain.domain || !newDomain.brand_name) {
      return setDomainError('Domain and Brand Name are required.');
    }

    setAddingDomain(true);
    setDomainError('');

    try {
      const created = await domainsApi.create(newDomain);
      setDomains([created, ...domains]);
      setActiveDomain(created);
      setShowAddModal(false);
      setNewDomain({ domain: '', brand_name: '', niche: '' });
    } catch (err) {
      setDomainError(err.message || 'Failed to create domain');
    } finally {
      setAddingDomain(false);
    }
  };

  const handleReturnToAdmin = () => {
    exitImpersonation();
    navigate('/admin');
  };

  const currentDomainName = activeDomain?.domain || (domains.length > 0 ? domains[0].domain : 'acme.com');

  return (
    <>
      {/* Impersonation Banner */}
      {impersonation.isImpersonating && (
        <div className="bg-primary text-on-primary px-6 py-2.5 flex items-center justify-between sticky top-0 z-50 shadow-md">
          <div className="flex items-center gap-2.5 text-xs font-bold">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-white">
              <Icon name="visibility" size={15} />
            </span>
            <span>
              Impersonation Mode: Viewing dashboard as{' '}
              <span className="underline decoration-white/60 underline-offset-2">{user?.full_name}</span>{' '}
              <span className="opacity-80 font-normal">({user?.email})</span>
            </span>
            <span className="pill !bg-white/20 !text-white !text-[10px] uppercase tracking-wider ml-1">
              Customer View
            </span>
          </div>

          <button
            type="button"
            onClick={handleReturnToAdmin}
            className="btn-secondary !bg-surface-container-lowest !text-primary !py-1 !px-3.5 text-xs font-bold hover:!bg-surface-container flex items-center gap-1.5 shadow-sm"
          >
            <Icon name="arrow_back" size={15} /> Return to Admin Console
          </button>
        </div>
      )}

      <Sidebar
        domains={domains}
        activeDomain={activeDomain}
        onSelectDomain={setActiveDomain}
        onAddDomain={() => setShowAddModal(true)}
      />

      <Topbar range={range} onRange={setRange} />

      <main className="main-area">
        <div className="mx-auto flex max-w-7xl flex-col gap-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="h-page">Dashboard</h1>
                <span className="pill pill-success">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-tertiary-fixed-dim" />Live
                </span>
              </div>
              <p className="text-muted">
                AI visibility for <span className="font-semibold text-on-surface">{currentDomainName}</span> · synced 4m ago
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="btn-secondary btn-sm flex items-center gap-1.5 text-xs font-semibold self-start sm:self-auto"
            >
              <Icon name="add" size={16} /> Track New Domain
            </button>
          </div>

          {/* Stat Cards */}
          <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((s) => <StatCard key={s.label} {...s} />)}
          </section>

          {/* Visibility and AI Engines */}
          <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <div className="card lg:col-span-8">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="card-title">Visibility over time</h2>
                  <p className="text-[13px] text-muted">Weekly trend across AI engines</p>
                </div>
                <div className="segmented">
                  {Object.entries(modelSeries).map(([key, m]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setModel(key)}
                      className={`segmented-btn ${model === key ? 'segmented-btn-active' : ''}`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-6">
                <LineChart data={modelSeries[model].data} labels={weeks} />
              </div>
              <div className="inset mt-4 flex flex-wrap items-center gap-4 text-[11px] font-medium text-muted">
                <span className="flex items-center gap-2">
                  <span className="h-1 w-3 rounded-full bg-primary" />{currentDomainName}
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-0.5 w-3 rounded-full bg-outline-variant" />Industry baseline (34%)
                </span>
              </div>
            </div>

            <div className="card lg:col-span-4">
              <h2 className="card-title">By model</h2>
              <p className="text-[13px] text-muted">Citation rate per AI engine</p>
              <div className="mt-6 flex flex-col gap-5">
                {models.map((m) => (
                  <div key={m.name} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-[13px] font-bold">
                        <span className={`flex h-6 w-6 items-center justify-center rounded-md ${m.chip}`}>
                          <Icon name={m.icon} size={15} />
                        </span>
                        {m.name}
                      </span>
                      <span className="text-[13px] font-bold">
                        {m.pct}% <span className="text-code ml-1">{m.queries}</span>
                      </span>
                    </div>
                    <div className="progress">
                      <div className={`progress-bar ${m.bar}`} style={{ width: `${m.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="inset mt-6 flex items-start gap-2.5 text-[13px] text-muted">
                <Icon name="tips_and_updates" className="text-primary" />
                <p>
                  <strong className="text-on-surface">Perplexity</strong> citations bring the highest click-through (
                  <span className="font-semibold text-tertiary">18.4%</span>).
                </p>
              </div>
            </div>
          </section>

          {/* Competitors and Recent Prompts */}
          <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="card">
              <h2 className="card-title">Competitor share of voice</h2>
              <p className="text-[13px] text-muted">Benchmarked against tracked competitors</p>
              <div className="mt-6 flex flex-col gap-4">
                {competitors.map((c) => (
                  <div key={c.name} className={`flex flex-col gap-1.5 ${c.you ? 'inset' : 'px-3'}`}>
                    <div className="flex justify-between text-sm">
                      <span className={c.you ? 'font-bold' : 'font-medium'}>
                        {c.you ? currentDomainName : c.name}
                        {c.you && <span className="ml-1 font-medium text-primary">(You)</span>}
                      </span>
                      <span className={`font-bold ${c.you ? 'text-primary' : 'text-muted'}`}>{c.pct}%</span>
                    </div>
                    <div className="progress">
                      <div className={`progress-bar ${c.you ? '' : '!bg-outline-variant'}`} style={{ width: `${c.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h2 className="card-title">Recent prompt results</h2>
              <p className="mb-2 text-[13px] text-muted">Latest checks across engines</p>
              <div className="divide-y divide-surface-container">
                {results.map((r) => (
                  <div key={r.prompt} className="list-row">
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-semibold">{r.prompt}</div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className={`pill ${r.chip}`}>{r.model}</span>
                        <span className="text-code">{r.ago}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className={`pill ${r.rank ? 'pill-success' : 'pill-danger'}`}>
                        {r.rank ? 'Mentioned' : 'Not mentioned'}
                      </span>
                      <span className={`w-6 text-right text-lg font-extrabold ${r.rank ? '' : 'font-medium text-outline'}`}>
                        {r.rank ? `#${r.rank}` : '--'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" className="link mt-4 inline-flex items-center gap-1 text-[13px]">
                View all prompt logs <Icon name="arrow_forward" size={16} />
              </button>
            </div>
          </section>

          {/* Action Recommendations */}
          <section className="card flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div className="flex max-w-4xl items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-container text-on-primary shadow-md">
                <Icon name="auto_awesome" size={24} />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="pill pill-brand self-start">High impact · +8.4% est. visibility</span>
                <h3 className="text-lg font-bold tracking-tight">
                  ChatGPT 4o keeps citing FinFlow.io for “multi-currency payout infrastructure”
                </h3>
                <p className="text-muted">
                  Your docs lack a comparison table and API latency benchmarks for cross-border payouts. Publishing a benchmark page with schema markup could win about <strong className="text-on-surface">140 weekly prompts</strong>.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
              <button type="button" className="btn-primary">
                <Icon name="magic_button" size={18} />Generate content brief
              </button>
              <button type="button" className="link inline-flex items-center gap-1 text-[13px] !text-muted hover:!text-primary">
                View all 14 recommendations <Icon name="arrow_forward" size={16} />
              </button>
            </div>
          </section>
        </div>
      </main>

      {/* Add Domain Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="card max-w-md w-full space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between border-b border-surface-container pb-3">
              <h3 className="font-bold text-base text-on-surface">Track a New Domain</h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="btn-icon">
                <Icon name="close" />
              </button>
            </div>

            {domainError && (
              <div className="p-3 text-xs rounded-lg bg-error/10 text-error border border-error/20 flex items-center gap-2">
                <Icon name="error" size={16} /> {domainError}
              </div>
            )}

            <form onSubmit={handleCreateDomain} className="space-y-3">
              <div>
                <label className="field-label" htmlFor="domain-input">Website Domain</label>
                <input
                  id="domain-input"
                  className="field-input text-xs"
                  placeholder="e.g. acme.com or https://company.io"
                  value={newDomain.domain}
                  onChange={(e) => setNewDomain({ ...newDomain, domain: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="field-label" htmlFor="brand-input">Brand Name</label>
                <input
                  id="brand-input"
                  className="field-input text-xs"
                  placeholder="e.g. Acme Inc"
                  value={newDomain.brand_name}
                  onChange={(e) => setNewDomain({ ...newDomain, brand_name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="field-label" htmlFor="niche-input">Niche / Industry (Optional)</label>
                <input
                  id="niche-input"
                  className="field-input text-xs"
                  placeholder="e.g. Fintech B2B SaaS"
                  value={newDomain.niche}
                  onChange={(e) => setNewDomain({ ...newDomain, niche: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-surface-container">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingDomain}
                  className="btn-primary btn-sm flex items-center gap-1.5"
                >
                  {addingDomain ? 'Adding...' : 'Start Tracking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
