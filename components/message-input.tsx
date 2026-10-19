'use client';

import React, { useRef, useEffect } from 'react';
import { ArrowUp, Square, AlertCircle, Plus } from 'lucide-react';
import { MAX_USER_MESSAGE_LENGTH } from '@/lib/db';

interface MessageInputProps {
  input: string;
  setInput: (value: string) => void;
  onSend: () => void;
  onStop?: () => void;
  isLoading: boolean;
  disabled?: boolean;
  disabledReason?: string | null;
  onNewChat?: () => void;
}

export function MessageInput({
  input,
  setInput,
  onSend,
  onStop,
  isLoading,
  disabled = false,
  disabledReason = null,
  onNewChat,
}: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea up to 200px
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = 'auto';
    const nextHeight = Math.min(textarea.scrollHeight, 200);
    textarea.style.height = `${Math.max(nextHeight, 48)}px`;
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && input.trim() && !disabled && input.length <= MAX_USER_MESSAGE_LENGTH) {
        onSend();
      }
    }
  };

  const isOverLength = input.length > MAX_USER_MESSAGE_LENGTH;
  const isSendDisabled = disabled || isOverLength || (!isLoading && !input.trim());

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-3 pt-1">
      {/* Disabled Banner when limit is reached */}
      {disabled && disabledReason && (
        <div className="mb-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center justify-between gap-3 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-medium">{disabledReason}</span>
          </div>
          {onNewChat && (
            <button
              onClick={onNewChat}
              type="button"
              className="shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#8B7CFF] hover:bg-[#7867FB] text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Chat</span>
            </button>
          )}
        </div>
      )}

      <div className={`relative flex items-end w-full rounded-2xl bg-[var(--bg-surface)] border ${
        isOverLength ? 'border-rose-500 ring-1 ring-rose-500/20' : 'border-[var(--border-color)]'
      } focus-within:border-[#8B7CFF] focus-within:ring-2 focus-within:ring-[#8B7CFF]/20 shadow-sm transition-all duration-150`}>
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? (disabledReason || 'Chat is disabled') : 'Ask Noviq AI anything...'}
          rows={1}
          disabled={disabled}
          maxLength={MAX_USER_MESSAGE_LENGTH + 100}
          className="w-full resize-none bg-transparent px-4 py-3.5 text-sm sm:text-base text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none max-h-[200px] leading-relaxed disabled:opacity-60 disabled:cursor-not-allowed"
        />

        <div className="flex items-center pb-2.5 pr-2.5 shrink-0 gap-2">
          {/* Character Counter when typing */}
          {input.length > 0 && !disabled && (
            <span
              className={`text-[11px] font-mono select-none px-1.5 py-0.5 rounded ${
                isOverLength
                  ? 'text-rose-400 font-bold bg-rose-500/10'
                  : input.length > 1800
                  ? 'text-amber-400 bg-amber-500/10'
                  : 'text-[var(--text-muted)]'
              }`}
            >
              {input.length.toLocaleString()} / {MAX_USER_MESSAGE_LENGTH.toLocaleString()}
            </span>
          )}

          {isLoading ? (
            <button
              onClick={onStop}
              type="button"
              aria-label="Stop generating response"
              className="w-8 h-8 rounded-xl bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center transition-colors shadow-sm cursor-pointer"
              title="Stop generating"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
          ) : (
            <button
              onClick={onSend}
              type="button"
              disabled={isSendDisabled}
              aria-label="Send message"
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-150 shadow-sm ${
                isSendDisabled
                  ? 'bg-[var(--bg-surface-elevated)] text-[var(--text-muted)] cursor-not-allowed'
                  : 'bg-[#8B7CFF] hover:bg-[#7867FB] text-white cursor-pointer hover:shadow-md hover:shadow-[#8B7CFF]/25'
              }`}
            >
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
            </button>
          )}
        </div>
      </div>

      {/* Footer Branding */}
      <div className="flex items-center justify-center gap-1.5 mt-2 text-[11px] text-[var(--text-muted)] select-none">
        <span>Powered by</span>
        <span className="font-medium text-[#8B7CFF]">Google Gemini</span>
        <span>•</span>
        <span>Turso Database</span>
        <span>•</span>
        <span>Noviq AI may make mistakes. Verify important info.</span>
      </div>
    </div>
  );
}
