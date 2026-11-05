// Small SF Symbols-style line icons.
type P = { className?: string };
const base = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, viewBox: "0 0 24 24", "aria-hidden": true };
export const IconMap = ({ className = "h-6 w-6" }: P) => <svg {...base} className={className}><path d="M9 4 3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5 9 4Z" /><path d="M9 4v13M15 6.5v13" /></svg>;
export const IconCompass = ({ className = "h-6 w-6" }: P) => <svg {...base} className={className}><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" /></svg>;
export const IconPlus = ({ className = "h-6 w-6" }: P) => <svg {...base} className={className}><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></svg>;
export const IconList = ({ className = "h-6 w-6" }: P) => <svg {...base} className={className}><path d="M8 6h12M8 12h12M8 18h12" /><circle cx="4" cy="6" r=".6" fill="currentColor" /><circle cx="4" cy="12" r=".6" fill="currentColor" /><circle cx="4" cy="18" r=".6" fill="currentColor" /></svg>;
export const IconLocate = ({ className = "h-5 w-5" }: P) => <svg {...base} className={className}><path d="M3 11 21 3l-8 18-2-8-8-2Z" /></svg>;
export const IconSearch = ({ className = "h-5 w-5" }: P) => <svg {...base} className={className}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;
export const IconDirections = ({ className = "h-5 w-5" }: P) => <svg {...base} className={className}><path d="M12 2.5 21.5 12 12 21.5 2.5 12 12 2.5Z" /><path d="M9 14v-2.5a1.5 1.5 0 0 1 1.5-1.5H15m-2-2 2 2-2 2" /></svg>;
export const IconChevron = ({ className = "h-4 w-4" }: P) => <svg {...base} className={className}><path d="m9 6 6 6-6 6" /></svg>;
export const IconBack = ({ className = "h-4 w-4" }: P) => <svg {...base} className={className}><path d="m15 6-6 6 6 6" /></svg>;
export const IconFilter = ({ className = "h-5 w-5" }: P) => <svg {...base} className={className}><path d="M4 6h16M7 12h10M10 18h4" /></svg>;
export const IconPhone = ({ className = "h-5 w-5" }: P) => <svg {...base} className={className}><path d="M8 3h3l1 4-2 1a12 12 0 0 0 5 5l1-2 4 1v3a2 2 0 0 1-2 2A14 14 0 0 1 6 5a2 2 0 0 1 2-2Z" /></svg>;
export const IconPin = ({ className = "h-5 w-5" }: P) => <svg {...base} className={className}><path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>;
export const IconKaaba = ({ className = "h-6 w-6" }: P) => <svg viewBox="0 0 24 24" className={className} aria-hidden><rect x="5" y="4" width="14" height="16" rx="1.5" fill="currentColor" /><rect x="5" y="8" width="14" height="2.2" fill="#d4af37" /><rect x="9.5" y="12.5" width="5" height="5" rx="0.6" fill="none" stroke="#d4af37" strokeWidth="1.4" /></svg>;
export const IconShare = ({ className = "h-5 w-5" }: P) => <svg {...base} className={className}><path d="M12 3v12M8 7l4-4 4 4" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /></svg>;
export const Logo = ({ className = "h-7 w-7" }: P) => (
  <svg viewBox="0 0 512 512" className={className} aria-hidden>
    <defs><linearGradient id="lg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#15925f" /><stop offset="1" stopColor="#075239" /></linearGradient>
      <mask id="lm"><rect width="512" height="512" fill="#fff" /><circle cx="272" cy="70" r="30" fill="#000" /></mask></defs>
    <rect width="512" height="512" rx="114" fill="url(#lg)" />
    <path d="M156 404V262c0-58 44-96 100-124 56 28 100 66 100 124v142z" fill="none" stroke="#fff" strokeWidth="30" strokeLinejoin="round" />
    <circle cx="256" cy="312" r="34" fill="#fff" /><circle cx="256" cy="80" r="34" fill="#fff" mask="url(#lm)" />
  </svg>
);
