'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { loadStoredTheme, saveStoredTheme } from '@/lib/chat-storage';
import { ThemeMode } from '@/types/chat';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className = '', showLabel = false }: ThemeToggleProps) {
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const currentTheme = loadStoredTheme();
    setTheme(currentTheme);
    applyTheme(currentTheme);
    setMounted(true);
  }, []);

  const applyTheme = (newTheme: ThemeMode) => {
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const toggleTheme = () => {
    const nextTheme: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    saveStoredTheme(nextTheme);
    applyTheme(nextTheme);
  };

  if (!mounted) {
    return (
      <div className={`p-2 rounded-lg bg-[var(--bg-surface-elevated)] w-9 h-9 ${className}`} />
    );
  }

  return (
    <button
      onClick={toggleTheme}
      type="button"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] transition-colors duration-150 border border-transparent hover:border-[var(--border-color)] ${className}`}
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 text-amber-400" />
      ) : (
        <Moon className="w-4 h-4 text-violet-600" />
      )}
      {showLabel && (
        <span className="font-medium text-xs">
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </span>
      )}
    </button>
  );
}
