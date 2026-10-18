import Icon from './Icon.jsx';

const sparkPath = (pts) => pts.map((y, i) => `${i ? 'L' : 'M'} ${(i * 80) / (pts.length - 1)} ${y}`).join(' ');

export default function StatCard({ label, value, delta, icon, note, spark, tone }) {
  const d = sparkPath(spark);
  const last = spark[spark.length - 1];
  return (
    <div className="card card-hover">
      <div className="flex items-start justify-between">
        <span className="stat-label">{label}</span>
        <span className="pill pill-success"><Icon name={icon} size={14} />{delta}</span>
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <span className="stat-value">{value}</span>
        <svg viewBox="0 0 80 36" className={`h-9 w-20 overflow-visible ${tone}`}>
          <path d={`${d} L 80 36 L 0 36 Z`} fill="currentColor" fillOpacity="0.08" />
          <path d={d} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="80" cy={last} r="3.5" fill="currentColor" />
        </svg>
      </div>
      <p className="mt-2 text-[13px] text-muted">{note}</p>
    </div>
  );
}
