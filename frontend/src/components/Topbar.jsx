import { useState } from 'react';
import Icon from './Icon.jsx';

const ranges = ['Last 7 days', '30 days', '90 days'];

export default function Topbar({ range, onRange }) {
  const [running, setRunning] = useState(false);
  const run = () => { setRunning(true); setTimeout(() => setRunning(false), 1800); }; // TODO: POST /domains/{id}/run

  return (
    <header className="topbar">
      <div className="segmented">
        {ranges.map((r) => (
          <button key={r} type="button" onClick={() => onRange(r)}
            className={`segmented-btn ${range === r ? '!bg-surface-container-lowest !font-bold !text-primary shadow-sm' : ''}`}>{r}</button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button type="button" className="btn-icon" aria-label="Notifications">
          <Icon name="notifications" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-error ring-2 ring-surface-container-lowest" />
        </button>
        <button type="button" onClick={run} disabled={running} className="btn-primary btn-sm disabled:opacity-70">
          <Icon name={running ? 'sync' : 'bolt'} size={18} className={running ? 'animate-spin' : ''} />{running ? 'Running…' : 'Run now'}
        </button>
      </div>
    </header>
  );
}
