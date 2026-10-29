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
