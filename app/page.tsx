'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { loadStoredTheme, saveStoredTheme } from '@/lib/chat-storage';
import { ChatSession, ThemeMode, User, ChatLimitsInfo } from '@/types/chat';
import { ChatSidebar } from '@/components/chat-sidebar';
import { ChatWindow } from '@/components/chat-window';
import { SettingsDialog } from '@/components/settings-dialog';
import { truncateTitle } from '@/lib/utils';

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [limits, setLimits] = useState<ChatLimitsInfo | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // 1. Fetch user profile, limits, and conversations from Turso backend
  const loadUserDataAndChats = useCallback(async () => {
    try {
      // Check auth & limits
      const meRes = await fetch('/api/auth/me');
      if (!meRes.ok) {
        router.push('/login');
        return;
      }
      const meData = await meRes.json();
      setUser(meData.user);
      setLimits(meData.limits);

      // Load chats
      const chatsRes = await fetch('/api/chats');
      if (chatsRes.ok) {
        const chatsData = await chatsRes.json();
        setSessions(chatsData.chats || []);
        if (chatsData.limits) {
          setLimits(chatsData.limits);
        }
      }
    } catch (err) {
      console.error('Failed to load user data:', err);
    }
  }, [router]);

  // Load single chat messages when activeSessionId changes
  const loadActiveChat = useCallback(async (chatId: string) => {
    try {
      const res = await fetch(`/api/chats/${chatId}`);
      if (res.ok) {
        const data = await res.json();
        setActiveSession(data.chat);
      } else {
        setActiveSession(null);
      }
    } catch (err) {
      console.error('Failed to load chat details:', err);
      setActiveSession(null);
    }
  }, []);

  // Initialize
  useEffect(() => {
    const storedTheme = loadStoredTheme();
    setTheme(storedTheme);
    if (storedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    loadUserDataAndChats().then(() => setIsMounted(true));

    return () => window.removeEventListener('resize', checkMobile);
  }, [loadUserDataAndChats]);

  // Trigger loading active chat messages
  useEffect(() => {
    if (activeSessionId) {
      loadActiveChat(activeSessionId);
    } else {
      setActiveSession(null);
    }
  }, [activeSessionId, loadActiveChat]);

  // Global Keyboard Shortcuts (Ctrl+K / Cmd+K for New Chat)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        handleCreateNewSession();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handler: Create New Session via Turso API
  const handleCreateNewSession = useCallback(async (initialMessage?: string): Promise<string> => {
    const title = initialMessage ? truncateTitle(initialMessage, 35) : 'New Chat';
    const res = await fetch('/api/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to create new conversation');
    }

    const data = await res.json();
    const createdChat = data.chat;

    setSessions((prev) => [createdChat, ...prev]);
    setActiveSessionId(createdChat.id);
    setActiveSession(createdChat);

    // Refresh limits
    loadUserDataAndChats();

    return createdChat.id;
  }, [loadUserDataAndChats]);

  // Handler: Update Existing Session in UI (during streaming)
  const handleUpdateSession = useCallback((updatedSession: ChatSession) => {
    setActiveSession(updatedSession);
    setSessions((prev) => {
      const index = prev.findIndex((s) => s.id === updatedSession.id);
      if (index >= 0) {
        const next = [...prev];
        next[index] = {
          ...next[index],
          title: updatedSession.title,
          messageCount: updatedSession.messages.length,
          updatedAt: updatedSession.updatedAt,
        };
        return next;
      }
      return [updatedSession, ...prev];
    });
  }, []);

  // Handler: Rename Session
  const handleRenameSession = useCallback(async (id: string, newTitle: string) => {
    try {
      const res = await fetch(`/api/chats/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });

      if (res.ok) {
        setSessions((prev) =>
          prev.map((s) => (s.id === id ? { ...s, title: newTitle, updatedAt: Date.now() } : s))
        );
        if (activeSessionId === id) {
          setActiveSession((prev) => (prev ? { ...prev, title: newTitle } : null));
        }
      }
    } catch (err) {
      console.error('Failed to rename session:', err);
    }
  }, [activeSessionId]);

  // Handler: Delete Session
  const handleDeleteSession = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/chats/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== id));
        if (activeSessionId === id) {
          setActiveSessionId(null);
          setActiveSession(null);
        }
        // Refresh counts and limits
        loadUserDataAndChats();
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  }, [activeSessionId, loadUserDataAndChats]);

  // Handler: Logout
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/login');
      router.refresh();
    }
  };

  // Handler: Switch Theme
  const handleThemeChange = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    saveStoredTheme(newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  if (!isMounted) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#101522] text-[#F3F4F8]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#8B7CFF] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold tracking-wide text-gray-400">Loading Noviq AI...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--bg-page)] text-[var(--text-primary)]">
      {/* Collapsible Left Sidebar */}
      <ChatSidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        user={user}
        limits={limits}
        onSelectSession={(id) => {
          setActiveSessionId(id);
        }}
        onNewChat={() => handleCreateNewSession()}
        onRenameSession={handleRenameSession}
        onDeleteSession={handleDeleteSession}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        onToggleOpen={() => setIsSidebarOpen((prev) => !prev)}
        isMobile={isMobile}
      />

      {/* Main Chat Interface Window */}
      <main className="flex-1 flex flex-col h-full min-w-0">
        <ChatWindow
          session={activeSession}
          limits={limits}
          onUpdateSession={handleUpdateSession}
          onCreateNewSession={handleCreateNewSession}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onRefreshData={loadUserDataAndChats}
        />
      </main>

      {/* Settings Modal Dialog */}
      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        user={user}
        limits={limits}
        theme={theme}
        onThemeChange={handleThemeChange}
        onLogout={handleLogout}
      />
    </div>
  );
}
