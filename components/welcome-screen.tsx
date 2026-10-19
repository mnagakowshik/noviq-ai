'use client';

import React from 'react';
import { NoviqLogo } from '@/components/noviq-logo';
import { Lightbulb, Code2, BookOpen, Wand2, ArrowUpRight } from 'lucide-react';

interface WelcomeScreenProps {
  onSelectPrompt: (promptText: string) => void;
}

const PROMPT_SUGGESTIONS = [
  {
    title: 'Explain a difficult concept',
    description: 'Break down quantum computing in simple, intuitive terms',
    prompt: 'Explain quantum computing in simple terms with everyday analogies, highlighting superposition and entanglement.',
    icon: Lightbulb,
    color: 'from-amber-500/20 to-orange-500/10 text-amber-400',
  },
  {
    title: 'Help me write code',
    description: 'Write a TypeScript debounce utility function with generics',
    prompt: 'Write a robust TypeScript debounce function with generic arguments, clean types, and an example of usage.',
    icon: Code2,
    color: 'from-blue-500/20 to-cyan-500/10 text-blue-400',
  },
  {
    title: 'Summarize a topic',
    description: 'Provide key takeaways from modern clean architecture',
    prompt: 'Summarize the core principles of Clean Architecture and Domain-Driven Design into actionable best practices.',
    icon: BookOpen,
    color: 'from-emerald-500/20 to-teal-500/10 text-emerald-400',
  },
  {
    title: 'Generate creative ideas',
    description: 'Brainstorm engaging product names for an eco startup',
    prompt: 'Brainstorm 10 catchy, brandable names and taglines for an eco-friendly smart consumer tech startup.',
    icon: Wand2,
    color: 'from-purple-500/20 to-pink-500/10 text-purple-400',
  },
];

export function WelcomeScreen({ onSelectPrompt }: WelcomeScreenProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-8 max-w-3xl mx-auto w-full select-none">
      {/* Brand & Greeting */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="mb-4 transform hover:scale-105 transition-transform duration-200">
          <NoviqLogo size="lg" />
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--text-primary)] tracking-tight">
          What can I help you with?
        </h1>
        <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-2 font-normal">
          Ask anything. Explore new ideas.
        </p>
      </div>

      {/* Suggested Prompt Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full">
        {PROMPT_SUGGESTIONS.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              onClick={() => onSelectPrompt(item.prompt)}
              type="button"
              className="group relative flex flex-col items-start p-4 rounded-xl text-left bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-elevated)] border border-[var(--border-color)] hover:border-[#8B7CFF]/50 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${item.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[#8B7CFF] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </div>
              <h3 className="font-semibold text-sm text-[var(--text-primary)] group-hover:text-[#8B7CFF] transition-colors">
                {item.title}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2 leading-relaxed">
                {item.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
