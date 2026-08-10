'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system');

  useEffect(() => {
    const stored = (localStorage.getItem('dealbot-theme') as Theme) || 'system';
    setTheme(stored);
  }, []);

  function apply(next: Theme) {
    setTheme(next);
    localStorage.setItem('dealbot-theme', next);
    const isDark = next === 'dark' || (next === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
  }

  function cycle() {
    const order: Theme[] = ['system', 'light', 'dark'];
    apply(order[(order.indexOf(theme) + 1) % order.length]);
  }

  const icon = theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '🖥️';

  return (
    <button
      onClick={cycle}
      className="rounded-lg px-2 py-1 text-sm hover:bg-surface-2"
      title={`Theme: ${theme}`}
      aria-label="Toggle theme"
    >
      {icon}
    </button>
  );
}
