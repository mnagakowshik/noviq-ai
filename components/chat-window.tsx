'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Menu,
  Plus,
  ArrowDown,
  AlertCircle,
  Settings,
  Sparkles,
  Database,
} from 'lucide-react';
import { ChatSession, ChatMessage as ChatMessageType, ChatLimitsInfo } from '@/types/chat';
import { ChatMessage } from '@/components/chat-message';
import { MessageInput } from '@/components/message-input';
import { WelcomeScreen } from '@/components/welcome-screen';
import { ThemeToggle } from '@/components/theme-toggle';
import { generateId, truncateTitle } from '@/lib/utils';
import { MAX_MESSAGES_PER_CHAT } from '@/lib/db';

interface ChatWindowProps {
  session: ChatSession | null;
  limits: ChatLimitsInfo | null;
  onUpdateSession: (updated: ChatSession) => void;
  onCreateNewSession: (initialMessage?: string) => Promise<string>;
  onToggleSidebar: () => void;
  onOpenSettings: () => void;
  onRefreshData?: () => void;
}

export function ChatWindow({
  session,
  limits,
  onUpdateSession,
  onCreateNewSession,
  onToggleSidebar,
  onOpenSettings,
  onRefreshData,
}: ChatWindowProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isAutoScrollEnabled = useRef(true);

  // Monitor scroll position to show/hide "Scroll to bottom" button
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    const distanceToBottom = scrollHeight - (scrollTop + clientHeight);

    if (distanceToBottom > 150) {
      isAutoScrollEnabled.current = false;
      setShowScrollBottom(true);
    } else {
      isAutoScrollEnabled.current = true;
      setShowScrollBottom(false);
    }
  }, []);

  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  };

  useEffect(() => {
    if (isAutoScrollEnabled.current) {
      scrollToBottom(false);
    }
  }, [session?.messages]);

  // Clean up abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Message Limits checks
  const currentMessageCount = session?.messages?.length || 0;
  const isChatLimitReached = currentMessageCount >= MAX_MESSAGES_PER_CHAT;
  const isAccountLimitReached = (limits?.userTotalMessages ?? 0) >= 50;
  const isInputDisabled = isChatLimitReached || isAccountLimitReached;

  let disabledReason: string | null = null;
  if (isChatLimitReached) {
    disabledReason = `This chat has reached its message limit (${MAX_MESSAGES_PER_CHAT}/${MAX_MESSAGES_PER_CHAT} messages). Start a new chat to continue.`;
  } else if (isAccountLimitReached) {
    disabledReason = 'Storage limit reached (50/50 messages across all chats). Please delete an older conversation.';
  }

  // Handle Stop Generation
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);

    if (session && session.messages.length > 0) {
      const updatedMessages = [...session.messages];
      const lastMsg = updatedMessages[updatedMessages.length - 1];
      if (lastMsg && lastMsg.role === 'assistant' && lastMsg.isStreaming) {
        lastMsg.isStreaming = false;
        onUpdateSession({
          ...session,
          messages: updatedMessages,
          updatedAt: Date.now(),
        });
      }
    }
  };

  // Core Send / Stream Handler
  const handleSendMessage = async (textToSend?: string) => {
    const messageContent = (textToSend || input).trim();
    if (!messageContent) return;
    if (isLoading || isInputDisabled) return;

    setErrorMessage(null);
    setInput('');

    let currentSession = session;

    // If no active session, create a new one first in Turso
    if (!currentSession) {
      try {
        const newId = await onCreateNewSession(messageContent);
        currentSession = {
          id: newId,
          title: truncateTitle(messageContent),
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
      } catch (err: unknown) {
        setErrorMessage(err instanceof Error ? err.message : 'Failed to start conversation.');
        return;
      }
    }

    const userMessage: ChatMessageType = {
      id: generateId(),
      role: 'user',
      content: messageContent,
      createdAt: Date.now(),
    };

    const assistantMessageId = generateId();
    const assistantPlaceholder: ChatMessageType = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
      isStreaming: true,
    };

    const sessionWithPlaceholder: ChatSession = {
      ...currentSession,
      title:
        currentSession.title === 'New Chat' || !currentSession.title
          ? truncateTitle(messageContent)
          : currentSession.title,
      messages: [...currentSession.messages, userMessage, assistantPlaceholder],
      updatedAt: Date.now(),
    };

    onUpdateSession(sessionWithPlaceholder);
    setIsLoading(true);
    isAutoScrollEnabled.current = true;
    scrollToBottom();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: currentSession.id,
          message: messageContent,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        let errData;
        try {
          errData = await response.json();
        } catch {
          errData = { error: `Server error: ${response.statusText} (${response.status})` };
        }
        throw new Error(errData.error || 'Failed to communicate with AI endpoint.');
      }

      if (!response.body) {
        throw new Error('No readable stream available in response.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunkText = decoder.decode(value, { stream: true });
        accumulatedText += chunkText;

        const updatedList = [...currentSession.messages, userMessage];
        updatedList.push({
          id: assistantMessageId,
          role: 'assistant',
          content: accumulatedText,
          createdAt: Date.now(),
          isStreaming: true,
        });

        onUpdateSession({
          ...currentSession,
          messages: updatedList,
          updatedAt: Date.now(),
        });
      }

      // Finalize response
      const finalizedList = [...currentSession.messages, userMessage];
      finalizedList.push({
        id: assistantMessageId,
        role: 'assistant',
        content: accumulatedText || 'No response returned from the model.',
        createdAt: Date.now(),
        isStreaming: false,
      });

      onUpdateSession({
        ...currentSession,
        messages: finalizedList,
        messageCount: finalizedList.length,
        updatedAt: Date.now(),
      });

      // Refresh limits and storage counts from server
      if (onRefreshData) {
        onRefreshData();
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }

      const errStr = err instanceof Error ? err.message : 'An unknown error occurred';
      setErrorMessage(errStr);

      // Revert the placeholder if generation failed
      const updatedMessages = sessionWithPlaceholder.messages.filter(
        (m) => m.id !== assistantMessageId
      );
      onUpdateSession({
        ...currentSession,
        messages: updatedMessages,
        updatedAt: Date.now(),
      });

      if (onRefreshData) {
        onRefreshData();
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const hasMessages = session && session.messages.length > 0;

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[var(--bg-page)] relative">
      {/* Top Navbar */}
      <header className="h-14 border-b border-[var(--border-color)] bg-[var(--bg-surface)]/80 backdrop-blur-md px-4 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onToggleSidebar}
            type="button"
            aria-label="Toggle chat sidebar"
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 truncate">
            <span className="font-semibold text-sm truncate text-[var(--text-primary)]">
              {session?.title || 'New Chat'}
            </span>

            {/* Model Badge */}
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#8B7CFF]/15 text-[#8B7CFF] border border-[#8B7CFF]/30 shrink-0">
              <Sparkles className="w-2.5 h-2.5" />
              Gemini Flash
            </span>

            {/* Chat Message Usage Counter Badge */}
            {session && (
              <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border shrink-0 ${
                isChatLimitReached
                  ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                  : currentMessageCount >= 8
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  : 'bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] border-[var(--border-color)]'
              }`}>
                <Database className="w-2.5 h-2.5" />
                {currentMessageCount}/{MAX_MESSAGES_PER_CHAT} msgs
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => onCreateNewSession()}
            type="button"
            aria-label="Start new chat"
            title="Start new chat"
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] transition-colors flex items-center gap-1.5 text-xs font-medium"
          >
            <Plus className="w-4 h-4 text-[#8B7CFF]" />
            <span className="hidden sm:inline">New Chat</span>
          </button>

          <ThemeToggle />

          <button
            onClick={onOpenSettings}
            type="button"
            aria-label="Open settings"
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Messages Area or Welcome Screen */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto flex flex-col relative"
      >
        {/* Error notification banner */}
        {errorMessage && (
          <div className="p-3 mx-4 my-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400 flex items-start gap-2.5 shadow-sm max-w-3xl mx-auto w-full">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Unable to complete request</p>
              <p className="mt-0.5 text-rose-300/90">{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-white"
            >
              Dismiss
            </button>
          </div>
        )}

        {!hasMessages ? (
          <WelcomeScreen onSelectPrompt={(prompt) => handleSendMessage(prompt)} />
        ) : (
          <div className="py-4 space-y-1">
            {session.messages.map((message, idx) => {
              const isLatest = idx === session.messages.length - 1;
              return (
                <ChatMessage
                  key={message.id || idx}
                  message={message}
                  isLatest={isLatest}
                  isLoading={isLoading}
                />
              );
            })}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        )}

        {/* Scroll to bottom button */}
        {showScrollBottom && (
          <button
            onClick={() => scrollToBottom(true)}
            aria-label="Scroll to bottom"
            type="button"
            className="fixed bottom-24 right-6 sm:right-10 p-2.5 rounded-full bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] border border-[var(--border-color)] shadow-lg hover:shadow-xl transition-all duration-150 z-30"
          >
            <ArrowDown className="w-4 h-4 text-[#8B7CFF]" />
          </button>
        )}
      </div>

      {/* Message Composer Footer */}
      <footer className="shrink-0 bg-[var(--bg-page)] pt-1 pb-2">
        <MessageInput
          input={input}
          setInput={setInput}
          onSend={() => handleSendMessage()}
          onStop={handleStopGeneration}
          isLoading={isLoading}
          disabled={isInputDisabled}
          disabledReason={disabledReason}
          onNewChat={() => onCreateNewSession()}
        />
      </footer>
    </div>
  );
}
