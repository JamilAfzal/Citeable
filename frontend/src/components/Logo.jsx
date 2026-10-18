import Icon from './Icon.jsx';

export default function Logo({ tagline }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-container text-on-primary shadow-sm">
        <Icon name="format_quote" size={22} />
      </div>
      <div className="flex flex-col">
        <span className="text-lg font-bold leading-tight tracking-tight">Citeable</span>
        {tagline && <span className="text-[11px] font-medium text-muted">{tagline}</span>}
      </div>
    </div>
  );
}
