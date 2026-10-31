import React from 'react';

interface LogoProps {
  variant?: 'light' | 'dark';
  subtitle?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const BrightloopLogo: React.FC<LogoProps> = ({
  variant = 'dark',
  subtitle,
  className = '',
  size = 'md'
}) => {
  const iconSize = size === 'sm' ? 'w-6 h-6' : size === 'lg' ? 'w-10 h-10' : 'w-8 h-8';
  const titleSize = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-xl' : 'text-base';
  
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Signature Brightloop double loop in dark container */}
      <div className={`${iconSize} bg-[#080d16] rounded-lg flex items-center justify-center p-1 shadow-sm shrink-0 border border-slate-800/80`}>
        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-[#c1f100]">
          {/* Double infinity loop in kinetic chartreuse */}
          <path
            d="M7 16a4 4 0 1 0 0-8 4 4 0 0 0-4 4 4 4 0 0 0 4 4Zm10 0a4 4 0 1 0 0-8 4 4 0 0 0-4 4 4 4 0 0 0 4 4Z"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9.8 14.2 14.2 9.8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <div className="flex flex-col">
        <span className={`${titleSize} font-bold tracking-tight ${variant === 'dark' ? 'text-[#080d16]' : 'text-white'}`}>
          Brightloop
        </span>
        {subtitle && (
          <span className={`text-[9px] uppercase tracking-wider font-semibold ${variant === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};
