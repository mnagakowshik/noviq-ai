'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, RotateCcw, User, Sparkles } from 'lucide-react';
import { ChatMessage as ChatMessageType } from '@/types/chat';

interface ChatMessageProps {
  message: ChatMessageType;
  isLatest: boolean;
  onRegenerate?: () => void;
  isLoading?: boolean;
}

export function ChatMessage({ message, isLatest, onRegenerate, isLoading = false }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  };

  if (isUser) {
    return (
      <div className="flex justify-end w-full group py-3 px-4 sm:px-6">
        <div className="max-w-[85%] md:max-w-[75%] lg:max-w-[65%] flex items-start gap-3">
          <div className="bg-[#8B7CFF]/15 border border-[#8B7CFF]/30 text-[var(--text-primary)] rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm text-[15px] leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </div>
          <div className="w-8 h-8 rounded-full bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-secondary)] shrink-0 mt-0.5">
            <User className="w-4 h-4" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start w-full group py-4 px-4 sm:px-6 hover:bg-[var(--bg-surface-subtle)]/40 transition-colors">
      <div className="w-full max-w-3xl mx-auto flex items-start gap-3.5">
        {/* Assistant Avatar */}
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#7867FB] to-[#8B7CFF] text-white flex items-center justify-center shrink-0 mt-1 shadow-sm shadow-[#8B7CFF]/20">
          <Sparkles className="w-4 h-4 fill-white/20" />
        </div>

        {/* Assistant Content Container */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-[#8B7CFF] tracking-wide uppercase">
              Noviq AI
            </span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleCopyMessage}
                title="Copy entire response"
                type="button"
                className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] transition-colors text-xs flex items-center gap-1"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="text-[11px]">{copied ? 'Copied' : 'Copy'}</span>
              </button>

              {isLatest && onRegenerate && !isLoading && (
                <button
                  onClick={onRegenerate}
                  title="Regenerate response"
                  type="button"
                  className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] transition-colors text-xs flex items-center gap-1 ml-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Retry</span>
                </button>
              )}
            </div>
          </div>

          <div className="prose-noviq break-words">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  const language = match ? match[1] : '';
                  const codeString = String(children).replace(/\n$/, '');

                  if (!inline && (match || codeString.includes('\n'))) {
                    return (
                      <CodeBlock code={codeString} language={language || 'text'} />
                    );
                  }

                  return (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
                a({ href, children, ...props }: any) {
                  return (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#8B7CFF] hover:underline font-medium"
                      {...props}
                    >
                      {children}
                    </a>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>

            {message.isStreaming && (
              <span className="inline-block w-2 h-4 ml-1 bg-[#8B7CFF] animate-cursor-blink align-middle rounded-sm" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code snippet:', err);
    }
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-[var(--border-color)] bg-[#0C101A] shadow-md text-sm">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#151B2B] border-b border-[var(--border-color)] text-xs text-gray-400">
        <span className="font-mono text-[11px] uppercase tracking-wider text-[#8B7CFF]">
          {language}
        </span>
        <button
          onClick={handleCopyCode}
          type="button"
          className="flex items-center gap-1.5 px-2 py-0.5 rounded text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 text-[11px]">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="text-[11px]">Copy Code</span>
            </>
          )}
        </button>
      </div>
      <div className="p-4 overflow-x-auto font-mono text-[13.5px] leading-relaxed text-gray-200">
        <pre className="!bg-transparent !p-0 !m-0">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}
