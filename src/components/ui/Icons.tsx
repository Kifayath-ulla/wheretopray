// Line icons, 1.7 stroke, 24 grid.
type P = { className?: string };
const base = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, viewBox: "0 0 24 24", "aria-hidden": true };
export const IconMap = ({ className = "h-6 w-6" }: P) => <svg {...base} className={className}><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></svg>;
export const IconCompass = ({ className = "h-6 w-6" }: P) => <svg {...base} className={className}><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" /></svg>;
export const IconPlus = ({ className = "h-6 w-6" }: P) => <svg {...base} className={className}><path d="M12 5v14M5 12h14" /></svg>;
export const IconList = ({ className = "h-6 w-6" }: P) => <svg {...base} className={className}><rect x="4" y="4" width="7" height="7" rx="2" /><rect x="13" y="4" width="7" height="7" rx="2" /><rect x="4" y="13" width="7" height="7" rx="2" /><rect x="13" y="13" width="7" height="7" rx="2" /></svg>;
export const IconLocate = ({ className = "h-5 w-5" }: P) => <svg {...base} className={className}><path d="M20 4 4 10.5l6.5 2.9L13.5 20 20 4Z" /></svg>;
export const IconSearch = ({ className = "h-5 w-5" }: P) => <svg {...base} className={className}><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></svg>;
export const IconDirections = ({ className = "h-5 w-5" }: P) => <svg {...base} className={className}><path d="M12 2.8 21.2 12 12 21.2 2.8 12 12 2.8Z" /><path d="M9.5 14v-2a1.5 1.5 0 0 1 1.5-1.5h3.5m-1.7-1.8 1.8 1.8-1.8 1.8" /></svg>;
export const IconChevron = ({ className = "h-4 w-4" }: P) => <svg {...base} className={className}><path d="m9 6 6 6-6 6" /></svg>;
export const IconBack = ({ className = "h-4 w-4" }: P) => <svg {...base} className={className}><path d="m15 6-6 6 6 6" /></svg>;
export const IconShare = ({ className = "h-5 w-5" }: P) => <svg {...base} className={className}><path d="M12 3v12M8 7l4-4 4 4" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /></svg>;
export const IconPhone = ({ className = "h-5 w-5" }: P) => <svg {...base} className={className}><path d="M5 4h3l1.5 4-2 1.3a11 11 0 0 0 7.2 7.2l1.3-2 4 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" /></svg>;
export const IconGlobe = ({ className = "h-5 w-5" }: P) => <svg {...base} className={className}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>;
export const IconInfo = ({ className = "h-4 w-4" }: P) => <svg {...base} className={className}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>;
export const IconClose = ({ className = "h-4 w-4" }: P) => <svg {...base} className={className}><path d="m6 6 12 12M18 6 6 18" /></svg>;
export const Logo = ({ className = "h-7 w-7" }: P) => (
  <svg viewBox="0 0 512 512" className={className} aria-hidden>
    <rect width="512" height="512" rx="120" fill="var(--accent)" />
    <path d="M156 404V262c0-58 44-96 100-124 56 28 100 66 100 124v142z" fill="none" stroke="var(--on-accent)" strokeWidth="30" strokeLinejoin="round" />
    <circle cx="256" cy="312" r="34" fill="var(--on-accent)" />
  </svg>
);
