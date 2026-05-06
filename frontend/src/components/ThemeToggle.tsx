'use client';

import { useTheme } from '@/hooks/useTheme';

export default function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme();

  if (!mounted) return null;

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full border border-border bg-card text-foreground hover:bg-muted transition-colors flex items-center justify-center w-8 h-8"
      aria-label="Toggle Theme"
    >
      {theme === 'dark' ? '🌙' : '☀️'}
    </button>
  );
}
