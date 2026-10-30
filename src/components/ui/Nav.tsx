"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconCompass, IconList, IconMap, IconPlus, Logo } from "./Icons";

const TABS = [
  { href: "/", label: "Explore", Icon: IconMap, match: (p: string) => p === "/" || p.startsWith("/place") },
  { href: "/qibla", label: "Qibla", Icon: IconCompass, match: (p: string) => p.startsWith("/qibla") },
  { href: "/add", label: "Add", Icon: IconPlus, match: (p: string) => p.startsWith("/add") || p.startsWith("/submit") },
  { href: "/directory", label: "Directory", Icon: IconList, match: (p: string) => p.startsWith("/directory") || p.startsWith("/city") },
];

export function Header() {
  const path = usePathname() || "/";
  return (
    <header className="glass sticky top-0 z-30 border-b border-hairline pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-[family-name:var(--font-display)] text-[18px] font-bold text-ink">
          <Logo /> wheretopray
        </Link>
        <nav className="hidden items-center gap-1 text-sm md:flex" aria-label="Main">
          {TABS.map((t) => (
            <Link key={t.href} href={t.href} aria-current={t.match(path) ? "page" : undefined}
              className={`rounded-full px-3.5 py-1.5 font-medium ${t.match(path) ? "bg-surface-2 text-ink" : "text-ink-2 hover:text-ink"}`}>{t.label}</Link>
          ))}
          <Link href="/bengaluru/gaps" className={`rounded-full px-3.5 py-1.5 font-medium ${path.startsWith("/bengaluru") ? "bg-surface-2 text-ink" : "text-ink-2 hover:text-ink"}`}>Gaps</Link>
          <Link href="/share" className={`rounded-full px-3.5 py-1.5 font-medium ${path.startsWith("/share") ? "bg-surface-2 text-ink" : "text-ink-2 hover:text-ink"}`}>Share</Link>
        </nav>
        <Link href="/share" className="text-sm font-medium text-accent-text md:hidden">Share</Link>
      </div>
    </header>
  );
}

export function TabBar() {
  const path = usePathname() || "/";
  return (
    <nav className="tabbar glass fixed inset-x-0 bottom-0 z-40 h-[var(--tabbar-h)] border-t border-hairline pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Tabs">
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {TABS.map(({ href, label, Icon, match }) => {
          const on = match(path);
          return (
            <li key={href}>
              <Link href={href} aria-current={on ? "page" : undefined} className={`flex h-[60px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${on ? "text-accent-text" : "text-ink-3"}`}>
                <Icon className="h-6 w-6" />{label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
