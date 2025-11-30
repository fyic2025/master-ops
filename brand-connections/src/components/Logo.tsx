'use client';

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export default function Logo({ className = '', size = 40, showText = false }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        {/* Background */}
        <rect width="48" height="48" rx="10" fill="url(#logoGradient)" />

        {/* Connection Symbol - Two interlocked rings representing brand-retailer connection */}
        <g transform="translate(8, 12)">
          {/* Left ring (Brand) */}
          <circle
            cx="12"
            cy="12"
            r="9"
            stroke="white"
            strokeWidth="3"
            fill="none"
            opacity="0.9"
          />

          {/* Right ring (Retailer) */}
          <circle
            cx="20"
            cy="12"
            r="9"
            stroke="white"
            strokeWidth="3"
            fill="none"
            opacity="0.9"
          />

          {/* Center connection highlight */}
          <path
            d="M 16 5 Q 16 12 16 19"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.6"
          />
        </g>

        {/* Gradient Definition */}
        <defs>
          <linearGradient id="logoGradient" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="50%" stopColor="#0EA5E9" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
        </defs>
      </svg>

      {showText && (
        <span className="font-semibold text-gray-900">Brand Connections</span>
      )}
    </div>
  );
}

// Alternative logo version - abstract network nodes
export function LogoNetwork({ className = '', size = 40, showText = false }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        {/* Background */}
        <rect width="48" height="48" rx="10" fill="url(#networkGradient)" />

        {/* Network nodes */}
        <g>
          {/* Connection lines */}
          <line x1="16" y1="16" x2="32" y2="16" stroke="white" strokeWidth="2" opacity="0.7" />
          <line x1="16" y1="16" x2="24" y2="32" stroke="white" strokeWidth="2" opacity="0.7" />
          <line x1="32" y1="16" x2="24" y2="32" stroke="white" strokeWidth="2" opacity="0.7" />
          <line x1="16" y1="16" x2="10" y2="24" stroke="white" strokeWidth="2" opacity="0.5" />
          <line x1="32" y1="16" x2="38" y2="24" stroke="white" strokeWidth="2" opacity="0.5" />

          {/* Main nodes */}
          <circle cx="16" cy="16" r="5" fill="white" />
          <circle cx="32" cy="16" r="5" fill="white" />
          <circle cx="24" cy="32" r="6" fill="white" />

          {/* Secondary nodes */}
          <circle cx="10" cy="24" r="3" fill="white" opacity="0.7" />
          <circle cx="38" cy="24" r="3" fill="white" opacity="0.7" />
        </g>

        <defs>
          <linearGradient id="networkGradient" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="50%" stopColor="#0EA5E9" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
        </defs>
      </svg>

      {showText && (
        <span className="font-semibold text-gray-900">Brand Connections</span>
      )}
    </div>
  );
}

// Arrow/growth logo - represents brand growth through connection
export function LogoGrowth({ className = '', size = 40, showText = false }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        {/* Background */}
        <rect width="48" height="48" rx="10" fill="url(#growthGradient)" />

        {/* Abstract B+C combined with upward arrow */}
        <g transform="translate(10, 10)">
          {/* Upward growth arrow */}
          <path
            d="M 14 6 L 14 22 M 8 12 L 14 6 L 20 12"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />

          {/* Connection dots at base */}
          <circle cx="8" cy="22" r="3" fill="white" opacity="0.8" />
          <circle cx="20" cy="22" r="3" fill="white" opacity="0.8" />

          {/* Connecting arc at bottom */}
          <path
            d="M 8 22 Q 14 28 20 22"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            opacity="0.6"
          />
        </g>

        <defs>
          <linearGradient id="growthGradient" x1="0" y1="48" x2="48" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="50%" stopColor="#0EA5E9" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>
        </defs>
      </svg>

      {showText && (
        <span className="font-semibold text-gray-900">Brand Connections</span>
      )}
    </div>
  );
}
