import React from 'react';

export function BrandMark({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <div className={`${className} rounded-full bg-[#1e232d] flex items-center justify-center text-[#c1f100] shadow-sm`}>
      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18.6 6.62c-1.44 0-2.8.56-3.77 1.5l-2.83 2.76-2.83-2.76c-.97-.94-2.33-1.5-3.77-1.5C2.42 6.62 0 9.04 0 12s2.42 5.38 5.4 5.38c1.44 0 2.8-.56 3.77-1.5l2.83-2.76 2.83 2.76c.97.94 2.33 1.5 3.77 1.5 2.98 0 5.4-2.42 5.4-5.38s-2.42-5.38-5.4-5.38zm-13.2 8.76c-1.88 0-3.4-1.52-3.4-3.38s1.52-3.38 3.4-3.38c.94 0 1.83.38 2.47 1.01l2.42 2.37-2.42 2.37c-.64.63-1.53 1.01-2.47 1.01zm13.2 0c-.94 0-1.83-.38-2.47-1.01l-2.42-2.37 2.42-2.37c.64-.63 1.53-1.01 2.47-1.01 1.88 0 3.4 1.52 3.4 3.38s-1.52 3.38-3.4 3.38z" />
      </svg>
    </div>
  );
}

export function BrandWordmark() {
  return (
    <div className="flex items-center gap-2">
      <BrandMark />
      <span className="font-bold text-lg tracking-tight text-[#171c20]">Brightloop</span>
    </div>
  );
}
