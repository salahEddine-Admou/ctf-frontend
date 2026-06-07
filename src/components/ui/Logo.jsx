const LOGO_SRC = '/logo.png';

export default function Logo({ className = '', variant = 'default' }) {
  const sizes = {
    sm: 'h-8',
    default: 'h-10',
    md: 'h-12',
    lg: 'h-16',
    xl: 'h-20',
    hero: 'h-24 max-w-full',
  };

  const heightClass = sizes[variant] || sizes.default;

  return (
    <img
      src={LOGO_SRC}
      alt="NICE FIRE CONSULTING - Protection incendie Maroc"
      className={`${heightClass} w-auto object-contain ${className}`}
    />
  );
}
