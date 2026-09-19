import React from 'react';

interface HumersLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'dark' | 'light';
  showSubtitle?: boolean;
}

export const HumersLogo: React.FC<HumersLogoProps> = ({
  className = '',
  size = 'md',
  variant = 'dark',
  showSubtitle = false,
}) => {
  const heightClasses = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-11',
    xl: 'h-14',
  };

  const primaryFill = variant === 'light' ? '#FFFFFF' : '#111827';
  const subtitleColor = variant === 'light' ? 'text-slate-300' : 'text-slate-500';

  return (
    <div className={`inline-flex items-center space-x-3 ${className}`}>
      {/* Exact Vector Rendering of the HUMERS brandmark with Red 3-Bar E */}
      <svg
        className={`${heightClasses[size]} w-auto shrink-0 select-none`}
        viewBox="0 0 460 74"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="HUMERS"
      >
        {/* Letters H, U, M */}
        <g fill={primaryFill}>
          {/* H */}
          <path d="M 12 12 L 23 12 C 24.5 12 25 12.5 25 14 L 25 32 L 53 32 L 53 14 C 53 12.5 53.5 12 55 12 L 66 12 C 67.5 12 68 12.5 68 14 L 68 60 C 68 61.5 67.5 62 66 62 L 55 62 C 53.5 62 53 61.5 53 60 L 53 42 L 25 42 L 25 60 C 25 61.5 24.5 62 23 62 L 12 62 C 10.5 62 10 61.5 10 60 L 10 14 C 10 12.5 10.5 12 12 12 Z" />

          {/* U */}
          <path d="M 88 12 L 99 12 C 100.5 12 101 12.5 101 14 L 101 46 C 101 50 103.5 52.5 107.5 52.5 L 132.5 52.5 C 136.5 52.5 139 50 139 46 L 139 14 C 139 12.5 139.5 12 141 12 L 152 12 C 153.5 12 154 12.5 154 14 L 154 47 C 154 57 146 62 135 62 L 105 62 C 94 62 86 57 86 47 L 86 14 C 86 12.5 86.5 12 88 12 Z" />

          {/* M */}
          <path d="M 172 12 L 184 12 C 185.5 12 186.2 12.8 186.6 14.2 L 202 44.5 L 217.4 14.2 C 217.8 12.8 218.5 12 220 12 L 232 12 C 233.5 12 234 12.5 234 14 L 234 60 C 234 61.5 233.5 62 232 62 L 221 62 C 219.5 62 219 61.5 219 60 L 219 28 L 206.5 52.5 C 206 53.5 205 54 202 54 C 199 54 198 53.5 197.5 52.5 L 185 28 L 185 60 C 185 61.5 184.5 62 183 62 L 172 62 C 170.5 62 170 61.5 170 60 L 170 14 C 170 12.5 170.5 12 172 12 Z" />
        </g>

        {/* E - Three Vibrant Red Horizontal Bars with Slanted Edge */}
        <g fill="#E52320">
          <polygon points="263,12 308,12 308,22 253,22" />
          <polygon points="263,32 308,32 308,42 253,42" />
          <polygon points="263,52 308,52 308,62 253,62" />
        </g>

        {/* Letters R, S */}
        <g fill={primaryFill}>
          {/* R */}
          <path d="M 326 12 L 358 12 C 368 12 374 17 374 26 C 374 32.5 370 37 363 38.8 L 374.5 59.8 C 375.2 61 374.5 62 373 62 L 360 62 C 358.5 62 357.8 61.2 357.2 60 L 347.5 41 L 339 41 L 339 60 C 339 61.5 338.5 62 337 62 L 326 62 C 324.5 62 324 61.5 324 60 L 324 14 C 324 12.5 324.5 12 326 12 Z M 339 22 L 339 31.5 L 355.5 31.5 C 359.5 31.5 361.5 29.5 361.5 26.5 C 361.5 23.5 359.5 22 355.5 22 Z" />

          {/* S */}
          <path d="M 402 12 L 436 12 C 445 12 450 17 450 24.5 C 450 31.5 445 35 435 36 L 417 38 C 413.5 38.5 411.5 40 411.5 42.5 C 411.5 45.5 414 47 419 47 L 448 47 C 449.5 47 450 47.5 450 49 L 450 59 C 450 60.5 449.5 61 448 61 L 413 61 C 403 61 398 56 398 48 C 398 40.5 403 36.5 414 35.5 L 431 33.5 C 435 33 437 31.5 437 29 C 437 26 434.5 24.5 430 24.5 L 402 24.5 C 400.5 24.5 400 24 400 22.5 L 400 13.5 C 400 12.5 400.5 12 402 12 Z" />
        </g>
      </svg>

      {showSubtitle && (
        <div className="border-l border-slate-300 pl-3 leading-tight hidden sm:block">
          <div className="text-[11px] font-black tracking-wider text-slate-800 uppercase">
            E-MANAGEMENT
          </div>
          <div className={`text-[10px] ${subtitleColor}`}>
            Enterprise Document Registry
          </div>
        </div>
      )}
    </div>
  );
};
