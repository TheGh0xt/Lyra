/**
 * The PMIE owl — the empty- and error-state mark.
 *
 * Drawn from the design's SVG. It uses theme tokens for every fill, so it
 * re-colours with the theme instead of needing a second asset, and it carries
 * no text: it is decorative and always `aria-hidden`, with the real message in
 * the heading beside it.
 */
export function Owl({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <rect x="14" y="34" width="36" height="26" rx="7" fill="var(--violet)" opacity=".9" />
      <path d="M32 34 L24 60 M32 34 L40 60" stroke="var(--canvas)" strokeWidth="2.2" strokeLinecap="round" />
      <rect x="14" y="47" width="36" height="3.4" fill="var(--canvas)" opacity=".55" />
      <rect x="15" y="10" width="34" height="28" rx="12" fill="var(--elev)" stroke="var(--violet)" strokeWidth="2" />
      <path d="M9 16h46" stroke="var(--violet)" strokeWidth="3" strokeLinecap="round" />
      <rect x="19" y="5" width="26" height="11" rx="3.5" fill="var(--violet)" />
      <circle cx="25" cy="26" r="5.4" fill="var(--canvas)" stroke="var(--violet)" strokeWidth="1.8" />
      <circle cx="39" cy="26" r="5.4" fill="var(--canvas)" stroke="var(--violet)" strokeWidth="1.8" />
      <circle cx="26.4" cy="26" r="2.1" fill="var(--text)" />
      <circle cx="40.4" cy="26" r="2.1" fill="var(--text)" />
      <path d="M32 30l3.2 4.4h-6.4z" fill="var(--am)" />
    </svg>
  );
}
