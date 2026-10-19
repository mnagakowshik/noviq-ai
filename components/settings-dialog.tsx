'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  Moon,
  Sun,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
  Database,
  User as UserIcon,
  LogOut,
  BarChart3,
} from 'lucide-react';
import { ThemeMode, User, ChatLimitsInfo } from '@/types/chat';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  limits: ChatLimitsInfo | null;
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  onLogout: () => void;
}

export function SettingsDialog({
  isOpen,
  onClose,
  user,
  limits,
  theme,
  onThemeChange,
  onLogout,
}: SettingsDialogProps) {
  const [apiHealth, setApiHealth] = useState<{ hasApiKey: boolean; model: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetch('/api/health')
        .then((res) => res.json())
        .then((data) => setApiHealth(data))
        .catch(() => setApiHealth(null));
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-2xl p-6 text-[var(--text-primary)]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)]">
          <h2 className="text-lg font-bold">Settings & Account</h2>
          <button
            onClick={onClose}
            type="button"
            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="py-4 space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          {/* User Account Info */}
          {user && (
            <div className="p-3.5 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#7867FB] to-[#8B7CFF] text-white flex items-center justify-center font-bold text-sm shadow-sm">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-sm text-[var(--text-primary)]">{user.name}</span>
                  <span className="text-xs text-[var(--text-muted)]">{user.email}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log out</span>
              </button>
            </div>
          )}

          {/* Storage & Limits Status */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] block mb-2">
              Storage & Usage Limits
            </label>
            <div className="p-3.5 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <BarChart3 className="w-4 h-4 text-[#8B7CFF]" />
                  Active Conversations
                </span>
                <span className="font-mono font-medium text-[var(--text-primary)] bg-[var(--bg-surface)] px-2 py-0.5 rounded border border-[var(--border-color)]">
                  {limits?.chatCount ?? 0} / {limits?.maxChats ?? 5} max
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <Database className="w-4 h-4 text-[#8B7CFF]" />
                  Total Account Messages
                </span>
                <span className="font-mono font-medium text-[var(--text-primary)] bg-[var(--bg-surface)] px-2 py-0.5 rounded border border-[var(--border-color)]">
                  {limits?.userTotalMessages ?? 0} / {limits?.maxUserTotalMessages ?? 50} max
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <Cpu className="w-4 h-4 text-[#8B7CFF]" />
                  Per-Chat Message Limit
                </span>
                <span className="font-mono font-medium text-[var(--text-primary)] bg-[var(--bg-surface)] px-2 py-0.5 rounded border border-[var(--border-color)]">
                  10 messages max
                </span>
              </div>
            </div>
          </div>

          {/* Appearance / Theme */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] block mb-2">
              Appearance
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => onThemeChange('dark')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                  theme === 'dark'
                    ? 'border-[#8B7CFF] bg-[#8B7CFF]/15 text-[var(--text-primary)] shadow-sm'
                    : 'border-[var(--border-color)] bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Moon className="w-4 h-4 text-[#8B7CFF]" />
                <span>Dark Theme</span>
              </button>

              <button
                type="button"
                onClick={() => onThemeChange('light')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                  theme === 'light'
                    ? 'border-[#8B7CFF] bg-[#8B7CFF]/15 text-[var(--text-primary)] shadow-sm'
                    : 'border-[var(--border-color)] bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-500" />
                <span>Light Theme</span>
              </button>
            </div>
          </div>

          {/* Infrastructure & Database Engine */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] block mb-2">
              Infrastructure
            </label>
            <div className="p-3.5 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <Database className="w-4 h-4 text-[#8B7CFF]" />
                  Database
                </span>
                <span className="font-mono font-medium text-[var(--text-primary)] bg-[var(--bg-surface)] px-2 py-0.5 rounded border border-[var(--border-color)]">
                  Turso SQLite
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <Cpu className="w-4 h-4 text-[#8B7CFF]" />
                  Model Engine
                </span>
                <span className="font-mono font-medium text-[var(--text-primary)] bg-[var(--bg-surface)] px-2 py-0.5 rounded border border-[var(--border-color)]">
                  {apiHealth?.model || 'gemini-3.8-flash'}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <KeyRound className="w-4 h-4 text-[#8B7CFF]" />
                  Gemini API Status
                </span>
                {apiHealth?.hasApiKey ? (
                  <span className="flex items-center gap-1 text-emerald-400 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-400 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Key Missing in .env.local
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span>Noviq AI v1.1.0</span>
          <span>Think. Ask. Discover.</span>
        </div>
      </div>
    </div>
  );
}
