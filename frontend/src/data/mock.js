export const weeks = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7 (Now)'];

export const modelSeries = {
  all: { label: 'All models', data: [32, 34, 37, 36, 39, 40, 42] },
  chatgpt: { label: 'ChatGPT 4o', data: [38, 41, 43, 44, 46, 47, 48] },
  perplexity: { label: 'Perplexity Pro', data: [40, 44, 47, 49, 51, 53, 54] },
  gemini: { label: 'Gemini 1.5', data: [18, 19, 21, 22, 24, 25, 26] },
};

export const stats = [
  { label: 'Visibility Score', value: '42%', delta: '+6%', icon: 'trending_up', note: 'Citation share across 4,820 prompt queries', spark: [28, 26, 20, 18, 8, 4], tone: 'text-primary' },
  { label: 'Mentions', value: '128', delta: '+14 vs last wk', icon: 'trending_up', note: 'Direct citations & authoritative source links', spark: [26, 28, 18, 16, 10, 6], tone: 'text-secondary' },
  { label: 'Average Position', value: '2.4', delta: '+0.3 rank', icon: 'arrow_upward', note: 'When cited in synthesized AI answers', spark: [24, 20, 22, 12, 10, 8], tone: 'text-tertiary' },
  { label: 'Share of Voice', value: '31%', delta: '+2.8%', icon: 'trending_up', note: 'Relative to 4 tracked competitor brands', spark: [30, 24, 26, 14, 8, 6], tone: 'text-primary' },
];

export const models = [
  { name: 'ChatGPT 4o', icon: 'psychology', pct: 48, queries: '2,314', bar: 'bg-gradient-to-r from-primary to-tertiary-fixed-dim', chip: 'bg-surface-container text-on-surface' },
  { name: 'Perplexity Pro', icon: 'grain', pct: 54, queries: '1,420', bar: 'bg-primary-container', chip: 'bg-primary-fixed text-primary' },
  { name: 'Gemini 1.5 Pro', icon: 'flare', pct: 26, queries: '1,086', bar: 'bg-secondary-container', chip: 'bg-secondary-fixed text-secondary' },
];

export const competitors = [
  { name: 'acme.com', pct: 31, you: true },
  { name: 'FinFlow.io', pct: 27 },
  { name: 'HyperLedger SaaS', pct: 21 },
  { name: 'NovaTreasury', pct: 13 },
  { name: 'Stripe Treasury', pct: 8 },
];

export const results = [
  { prompt: 'best enterprise treasury api 2025', model: 'Perplexity Pro', chip: 'pill-brand', ago: '12m ago', rank: 1 },
  { prompt: 'stripe treasury alternatives for b2b saas', model: 'ChatGPT 4o', chip: 'pill-plain', ago: '28m ago', rank: 2 },
  { prompt: 'automated multi-currency payout infrastructure', model: 'Gemini 1.5', chip: 'pill-brand', ago: '45m ago', rank: null },
  { prompt: 'fastest ledger api for fintech startups', model: 'ChatGPT 4o', chip: 'pill-plain', ago: '1h ago', rank: 1 },
  { prompt: 'real-time fednow payment integration platform', model: 'Perplexity Pro', chip: 'pill-brand', ago: '2h ago', rank: null },
];

export const navItems = [
  { to: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { to: '/prompts', icon: 'terminal', label: 'Prompts' },
  { to: '/competitors', icon: 'pie_chart', label: 'Competitors' },
  { to: '/recommendations', icon: 'auto_awesome', label: 'Recommendations' },
  { to: '/reports', icon: 'monitoring', label: 'Reports' },
  { to: '/settings', icon: 'settings', label: 'Settings' },
];
