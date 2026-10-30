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
  const pill = (on: boolean) => `rounded-full px-3.5 py-1.5 text-[14px] font-medium ${on ? "bg-surface-2 text-ink" : "text-ink-2 hover:text-ink"}`;
  return (
    <header className="glass sticky top-0 z-30 border-b border-hairline pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2.5 text-[17px] font-semibold tracking-[-0.02em] text-ink">
          <Logo className="h-7 w-7" /> wheretopray
        </Link>
        <nav className="hidden items-center gap-0.5 md:flex" aria-label="Main">
          {TABS.map((t) => <Link key={t.href} href={t.href} aria-current={t.match(path) ? "page" : undefined} className={pill(t.match(path))}>{t.label}</Link>)}
          <Link href="/about" className={pill(path.startsWith("/about"))}>About</Link>
          <Link href="/share" className="ml-2 rounded-full bg-ink px-4 py-1.5 text-[14px] font-medium text-surface hover:opacity-90">Share</Link>
        </nav>
        <Link href="/share" className="rounded-full bg-surface-2 px-3.5 py-1.5 text-[14px] font-medium text-ink md:hidden">Share</Link>
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
              <Link href={href} aria-current={on ? "page" : undefined} className={`flex h-[58px] flex-col items-center justify-center gap-1 text-[11px] font-medium ${on ? "text-accent-text" : "text-ink-3"}`}>
                <Icon className="h-[22px] w-[22px]" />{label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
