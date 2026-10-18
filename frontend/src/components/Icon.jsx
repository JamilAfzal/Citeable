export default function Icon({ name, size, className = '' }) {
  return (
    <span className={`icon ${className}`} style={size ? { fontSize: size } : undefined} aria-hidden="true">
      {name}
    </span>
  );
}
