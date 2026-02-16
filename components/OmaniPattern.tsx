'use client';

export default function OmaniPattern() {
  return (
    <div className="absolute inset-0 opacity-5 pointer-events-none">
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="omani-pattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
            <circle cx="50" cy="50" r="2" fill="currentColor" />
            <path d="M20,20 L80,80 M80,20 L20,80" stroke="currentColor" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#omani-pattern)" />
      </svg>
    </div>
  );
}
