'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { ThemeToggle } from './ThemeToggle';

const TABS = [
  { href: '/dashboard', label: 'Home', icon: '🏠' },
  { href: '/deals', label: 'Deals', icon: '🔥' },
  { href: '/search', label: 'Search', icon: '🔍' },
  { href: '/watchlist', label: 'Watchlist', icon: '⭐' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

export function TopBar({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-bg/80 px-4 py-3 backdrop-blur">
      <Link href="/dashboard" className="flex items-center gap-2">
        <span className="text-lg">🔥</span>
        <span className="text-base font-semibold">{title}</span>
      </Link>
      <div className="flex items-center gap-2">
        <Link href="/system" className="rounded-lg px-2 py-1 text-xs text-muted hover:bg-surface-2" title="System status">
          ● system
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="safe-bottom sticky bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-stretch justify-between">
        {TABS.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(tab.href + '/');
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={clsx(
                'flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] transition',
                active ? 'text-accent' : 'text-muted'
              )}
            >
              <span className="text-lg leading-none">{tab.icon}</span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
