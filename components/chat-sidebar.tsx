'use client';

import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  MessageSquare,
  Settings,
  Trash2,
  Edit2,
  Check,
  X,
  PanelLeftClose,
  PanelLeft,
  LogOut,
  User as UserIcon,
  AlertCircle,
} from 'lucide-react';
import { ChatSession, User, ChatLimitsInfo } from '@/types/chat';
import { NoviqLogo } from '@/components/noviq-logo';
import { formatDateLabel } from '@/lib/utils';

interface ChatSidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  user: User | null;
  limits: ChatLimitsInfo | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onRenameSession: (id: string, newTitle: string) => void;
  onDeleteSession: (id: string) => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  isMobile: boolean;
}

export function ChatSidebar({
  sessions,
  activeSessionId,
  user,
  limits,
  onSelectSession,
  onNewChat,
  onRenameSession,
  onDeleteSession,
  onOpenSettings,
  onLogout,
  isOpen,
  onToggleOpen,
  isMobile,
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Filter sessions by search query
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const query = searchQuery.toLowerCase();
    return sessions.filter((s) => s.title.toLowerCase().includes(query));
  }, [sessions, searchQuery]);

  // Group filtered sessions by date
  const groupedSessions = useMemo(() => {
    const groups: { [key: string]: ChatSession[] } = {};
    for (const session of filteredSessions) {
      const label = formatDateLabel(session.updatedAt || session.createdAt);
      if (!groups[label]) {
        groups[label] = [];
      }
      groups[label].push(session);
    }
    return groups;
  }, [filteredSessions]);

  const handleStartRename = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(session.id);
    setEditingTitle(session.title);
  };

  const handleSaveRename = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (editingTitle.trim()) {
      onRenameSession(id, editingTitle.trim());
    }
    setEditingId(null);
  };

  const handleCancelRename = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingId(null);
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmId(id);
  };

  const handleConfirmDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteSession(id);
    setDeleteConfirmId(null);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmId(null);
  };

  const isAtChatLimit = (limits?.chatCount ?? sessions.length) >= 5;

  // If sidebar is collapsed on desktop, show minimal floating toggle
  if (!isOpen && !isMobile) {
    return (
      <div className="hidden md:flex flex-col items-center justify-between py-4 px-2.5 w-16 bg-[var(--bg-surface-subtle)] border-r border-[var(--border-color)] shrink-0 h-screen select-none">
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={onToggleOpen}
            type="button"
            title="Open Sidebar"
            aria-label="Open Sidebar"
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] transition-colors"
          >
            <PanelLeft className="w-5 h-5 text-[#8B7CFF]" />
          </button>

          <button
            onClick={onNewChat}
            type="button"
            title={isAtChatLimit ? 'Chat limit reached (5 max)' : 'New Chat'}
            aria-label="New Chat"
            disabled={isAtChatLimit}
            className={`p-2 rounded-xl transition-colors shadow-sm ${
              isAtChatLimit
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-[#8B7CFF] text-white hover:bg-[#7867FB]'
            }`}
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-2">
          <button
            onClick={onOpenSettings}
            type="button"
            title="Settings"
            aria-label="Settings"
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={onLogout}
            type="button"
            title="Log Out"
            aria-label="Log Out"
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[var(--bg-surface-subtle)] border-r border-[var(--border-color)] w-72 sm:w-80 select-none">
      {/* Top Header */}
      <div className="p-3.5 border-b border-[var(--border-color)] flex items-center justify-between">
        <NoviqLogo size="sm" showTagline={false} />
        <button
          onClick={onToggleOpen}
          type="button"
          aria-label="Close sidebar"
          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] transition-colors"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* New Chat Button & Limit Counter */}
      <div className="p-3 space-y-2">
        <button
          onClick={() => {
            if (!isAtChatLimit) {
              onNewChat();
              if (isMobile) onToggleOpen();
            }
          }}
          type="button"
          disabled={isAtChatLimit}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-sm font-semibold transition-all duration-150 group shadow-sm ${
            isAtChatLimit
              ? 'bg-[var(--bg-surface-elevated)]/50 border-[var(--border-color)] text-[var(--text-muted)] cursor-not-allowed opacity-75'
              : 'bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-elevated)] border-[var(--border-color)] hover:border-[#8B7CFF]/50 text-[var(--text-primary)] hover:shadow'
          }`}
        >
          <span className="flex items-center gap-2">
            <Plus className={`w-4 h-4 ${isAtChatLimit ? 'text-[var(--text-muted)]' : 'text-[#8B7CFF] group-hover:scale-110'} transition-transform`} />
            New Chat
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)]">
            {sessions.length}/5 chats
          </span>
        </button>

        {isAtChatLimit && (
          <div className="px-2 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-center gap-1.5 leading-tight">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
            <span>5-chat limit reached. Delete a chat to create a new one.</span>
          </div>
        )}
      </div>

      {/* Search Input */}
      {sessions.length > 0 && (
        <div className="px-3 pb-2">
          <div className="relative flex items-center w-full">
            <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#8B7CFF]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Chat History List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-4 py-2">
        {filteredSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
            <MessageSquare className="w-8 h-8 text-[var(--text-muted)]/40 mb-2" />
            <p className="text-xs text-[var(--text-muted)]">
              {searchQuery ? 'No matching chats found' : 'No saved conversations'}
            </p>
          </div>
        ) : (
          Object.entries(groupedSessions).map(([dateGroup, items]) => (
            <div key={dateGroup} className="space-y-1">
              <div className="px-3 py-1 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                {dateGroup}
              </div>
              {items.map((session) => {
                const isActive = session.id === activeSessionId;
                const isEditing = session.id === editingId;
                const isDeleting = session.id === deleteConfirmId;
                const msgCount = session.messageCount ?? session.messages?.length ?? 0;

                if (isDeleting) {
                  return (
                    <div
                      key={session.id}
                      className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs flex items-center justify-between gap-2"
                    >
                      <span className="text-rose-400 font-medium truncate">Delete conversation?</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => handleConfirmDelete(session.id, e)}
                          className="px-2 py-0.5 rounded bg-rose-600 text-white text-[11px] font-medium hover:bg-rose-700"
                        >
                          Yes
                        </button>
                        <button
                          onClick={handleCancelDelete}
                          className="px-2 py-0.5 rounded bg-[var(--bg-surface)] text-[var(--text-primary)] text-[11px] hover:bg-[var(--bg-surface-elevated)]"
                        >
                          No
                        </button>
                      </div>
                    </div>
                  );
                }

                if (isEditing) {
                  return (
                    <div
                      key={session.id}
                      className="p-1.5 rounded-xl bg-[var(--bg-surface-elevated)] border border-[#8B7CFF] flex items-center gap-1.5"
                    >
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRename(session.id);
                          if (e.key === 'Escape') handleCancelRename();
                        }}
                        autoFocus
                        className="flex-1 bg-transparent text-xs px-1.5 py-0.5 text-[var(--text-primary)] focus:outline-none"
                      />
                      <button
                        onClick={(e) => handleSaveRename(session.id, e)}
                        className="p-1 rounded text-emerald-400 hover:bg-emerald-500/20"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleCancelRename(e)}
                        className="p-1 rounded text-[var(--text-muted)] hover:bg-[var(--bg-surface)]"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                }

                return (
                  <div
                    key={session.id}
                    onClick={() => {
                      onSelectSession(session.id);
                      if (isMobile) onToggleOpen();
                    }}
                    className={`group relative flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all duration-150 ${
                      isActive
                        ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm border border-[var(--border-color)] font-semibold'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-elevated)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <MessageSquare
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isActive ? 'text-[#8B7CFF]' : 'text-[var(--text-muted)]'
                        }`}
                      />
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="truncate">{session.title || 'Untitled Chat'}</span>
                        <span className="text-[10px] text-[var(--text-muted)] font-normal flex items-center gap-1">
                          <span>{msgCount}/10 msgs</span>
                        </span>
                      </div>
                    </div>

                    <div className="hidden group-hover:flex items-center gap-0.5 shrink-0 ml-1">
                      <button
                        onClick={(e) => handleStartRename(session, e)}
                        title="Rename"
                        className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)]"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteClick(session.id, e)}
                        title="Delete"
                        className="p-1 rounded text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-500/10"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Bottom Bar: User Info, Settings & Logout */}
      <div className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-surface)]/40 space-y-2">
        {user && (
          <div className="flex items-center justify-between px-2 py-1.5 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-color)]">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-[#8B7CFF]/20 text-[#8B7CFF] flex items-center justify-center shrink-0 font-bold text-xs">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold truncate text-[var(--text-primary)]">{user.name}</span>
                <span className="text-[10px] truncate text-[var(--text-muted)]">{user.email}</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-1">
          <button
            onClick={onOpenSettings}
            type="button"
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] transition-colors"
          >
            <Settings className="w-4 h-4 text-[var(--text-muted)]" />
            <span>Settings</span>
          </button>
          <button
            onClick={onLogout}
            type="button"
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </button>
        </div>
      </div>
    </div>
  );

  // If Mobile, render inside fixed overlay with backdrop
  if (isMobile) {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex">
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={onToggleOpen}
        />
        <div className="relative z-10 animate-in slide-in-from-left duration-200">
          {sidebarContent}
        </div>
      </div>
    );
  }

  // Desktop sidebar
  return <div className="hidden md:block shrink-0 h-screen">{sidebarContent}</div>;
}
