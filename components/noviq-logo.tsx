import React from 'react';
import { Sparkles } from 'lucide-react';

interface NoviqLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  className?: string;
}

export function NoviqLogo({ size = 'md', showTagline = false, className = '' }: NoviqLogoProps) {
  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
  };

  const textSizes = {
    sm: 'text-base font-semibold',
    md: 'text-lg font-bold',
    lg: 'text-2xl font-bold tracking-tight',
  };

  const containerSizes = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-2.5',
  };

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <div
        className={`flex items-center justify-center rounded-xl bg-gradient-to-tr from-[#7867FB] to-[#8B7CFF] text-white shadow-md shadow-[#8B7CFF]/20 ${containerSizes[size]}`}
      >
        <Sparkles className={`${iconSizes[size]} text-white fill-white/20`} />
      </div>
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 leading-none">
          <span className={`${textSizes[size]} text-[var(--text-primary)] font-bold tracking-tight`}>
            Noviq
          </span>
          <span
            className={`${textSizes[size]} font-extrabold text-[#8B7CFF] drop-shadow-sm`}
          >
            AI
          </span>
        </div>
        {showTagline && (
          <span className="text-[11px] text-[var(--text-muted)] tracking-wide mt-1">
            Think. Ask. Discover.
          </span>
        )}
      </div>
    </div>
  );
}
