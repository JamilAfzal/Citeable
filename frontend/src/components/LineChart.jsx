const W = 760, X0 = 60, X1 = 720, TOP = 30, BASE = 210, MAX = 60;

export default function LineChart({ data, labels, baseline = 34 }) {
  const x = (i) => X0 + (i * (X1 - X0)) / (data.length - 1);
  const y = (v) => BASE - (v / MAX) * (BASE - TOP);
  const line = data.map((v, i) => `${i ? 'L' : 'M'} ${x(i)} ${y(v)}`).join(' ');
  const last = data.length - 1;
  const diff = data[last] - data[last - 1];

  return (
    <svg viewBox={`0 0 ${W} 260`} className="h-64 w-full select-none overflow-visible">
      <defs>
        <linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#4F46E5" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 20, 40, 60].map((v) => (
        <g key={v}>
          <line x1="45" x2="740" y1={y(v)} y2={y(v)} stroke="#eaedff" strokeDasharray="4 4" />
          <text x="35" y={y(v) + 4} textAnchor="end" fontSize="11" fill="#777587">{v}%</text>
        </g>
      ))}
      <line x1={X0} x2={X1} y1={y(baseline)} y2={y(baseline)} stroke="#c7c4d8" strokeDasharray="6 6" strokeWidth="2" />
      <path d={`${line} L ${X1} ${BASE} L ${X0} ${BASE} Z`} fill="url(#area)" />
      <path d={line} fill="none" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r={i === last ? 6 : 4.5} fill={i === last ? '#4f46e5' : '#fff'} stroke={i === last ? '#fff' : '#4f46e5'} strokeWidth={i === last ? 3 : 2.5} />
      ))}
      <g transform={`translate(${X1 - 70}, ${y(data[last]) - 58})`}>
        <rect width="104" height="42" rx="8" fill="#131b2e" />
        <text x="52" y="18" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">Week {data.length}: {data[last]}%</text>
        <text x="52" y="32" textAnchor="middle" fontSize="10" fontWeight="600" fill="#4edea3">{diff >= 0 ? '+' : ''}{diff}% vs prior</text>
      </g>
      {labels.map((l, i) => <text key={l} x={x(i)} y="235" textAnchor="middle" fontSize="11" fill="#777587">{l}</text>)}
    </svg>
  );
}
