import Logo from './Logo.jsx';
import Icon from './Icon.jsx';

const bars = [
  { name: 'Your brand', pct: 42, bar: 'bg-primary-container', strong: true },
  { name: 'Category average', pct: 18, bar: 'bg-surface-container-highest' },
  { name: 'Next nearest rival', pct: 27, bar: 'bg-secondary-fixed-dim' },
];

function Preview() {
  return (
    <div className="auth-preview-pane">
      <div className="glow -right-24 -top-24 h-96 w-96 bg-primary-fixed opacity-60" />
      <div className="glow bottom-10 left-10 h-80 w-80 bg-surface-container-highest opacity-50" />
      <div className="relative z-10 flex gap-2">
        {['ChatGPT 4o', 'Perplexity Pro', 'Gemini 1.5 Pro'].map((m) => <span key={m} className="glass">{m}</span>)}
      </div>
      <div className="relative z-10 my-auto py-8">
        <div className="float-card">
          <div className="flex items-center justify-between border-b border-surface-container pb-4">
            <span className="text-[13px] font-semibold">Brand visibility benchmark</span>
            <span className="text-code">Fintech SaaS</span>
          </div>
          <div className="flex items-baseline justify-between pb-4 pt-5">
            <span className="stat-value">42<span className="text-2xl font-semibold text-secondary">%</span></span>
            <span className="pill pill-success"><Icon name="arrow_upward" size={14} />12% vs last mo</span>
          </div>
          <div className="space-y-3">
            {bars.map((b) => (
              <div key={b.name}>
                <div className="mb-1.5 flex justify-between text-[11px] font-semibold">
                  <span className={b.strong ? '' : 'text-muted'}>{b.name}</span>
                  <span className={b.strong ? 'font-bold text-primary' : 'text-outline'}>{b.pct}%</span>
                </div>
                <div className="progress"><div className={`progress-bar ${b.bar}`} style={{ width: `${b.pct}%` }} /></div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-surface-container-high pt-3.5">
            <span className="flex items-center gap-2 truncate font-mono text-xs"><Icon name="verified" size={16} className="text-secondary" />"best treasury api" → #1</span>
            <span className="text-[11px] font-semibold text-tertiary">Cited</span>
          </div>
        </div>
      </div>
      <div className="relative z-10 max-w-md">
        <h2 className="mb-2 text-2xl font-semibold tracking-tight">See where AI recommends your brand.</h2>
        <p className="text-muted">Track citations, sentiment and competitor share of voice across ChatGPT, Perplexity and Gemini.</p>
      </div>
    </div>
  );
}

export default function AuthLayout({ title, subtitle, footer, children }) {
  return (
    <div className="auth-grid">
      <div className="auth-form-pane">
        <Logo tagline="AI search visibility" />
        <div className="mx-auto w-full max-w-md py-8">
          <h1 className="h-hero mb-2">{title}</h1>
          <p className="mb-8 text-muted">{subtitle}</p>
          {children}
          <p className="mt-8 text-center text-[13px] text-muted">{footer}</p>
        </div>
        <div className="mx-auto flex w-full max-w-md justify-between border-t border-surface-container pt-6 text-code">
          <span>SOC-2 Type II Certified</span><span>256-bit Encryption</span>
        </div>
      </div>
      <Preview />
    </div>
  );
}
