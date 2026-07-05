/** Decorative hero illustration: a phone scanning a QR tag with a shield check. */
export default function HeroArt() {
  return (
    <svg viewBox="0 0 420 360" xmlns="http://www.w3.org/2000/svg" width="100%" style={{ maxWidth: 420 }} role="img" aria-label="Phone scanning a SecureTag QR">
      <defs>
        <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.06" />
        </linearGradient>
      </defs>

      {/* floating tag card with QR */}
      <g transform="translate(30 40)">
        <rect x="0" y="0" width="150" height="150" rx="18" fill="#fff" />
        <g fill="#191b2e">
          {/* finder squares */}
          <rect x="18" y="18" width="34" height="34" rx="4" fill="none" stroke="#191b2e" strokeWidth="7" />
          <rect x="98" y="18" width="34" height="34" rx="4" fill="none" stroke="#191b2e" strokeWidth="7" />
          <rect x="18" y="98" width="34" height="34" rx="4" fill="none" stroke="#191b2e" strokeWidth="7" />
          {/* modules */}
          <rect x="66" y="18" width="10" height="10" /><rect x="66" y="34" width="10" height="10" />
          <rect x="66" y="66" width="10" height="10" /><rect x="82" y="66" width="10" height="10" />
          <rect x="98" y="66" width="10" height="10" /><rect x="122" y="66" width="10" height="10" />
          <rect x="18" y="66" width="10" height="10" /><rect x="34" y="66" width="10" height="10" />
          <rect x="66" y="98" width="10" height="10" /><rect x="66" y="122" width="10" height="10" />
          <rect x="98" y="98" width="10" height="10" /><rect x="122" y="98" width="10" height="10" />
          <rect x="98" y="122" width="10" height="10" /><rect x="82" y="98" width="10" height="10" />
          <rect x="122" y="122" width="10" height="10" />
        </g>
      </g>

      {/* phone */}
      <g transform="translate(210 120)">
        <rect x="0" y="0" width="150" height="210" rx="26" fill="url(#glass)" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="2" />
        <rect x="14" y="18" width="122" height="150" rx="12" fill="#fff" />
        {/* shield check inside phone */}
        <g transform="translate(52 44)">
          <path d="M23 0 46 8v18c0 16-11 27-23 34C11 53 0 42 0 26V8L23 0Z" fill="#4e46dc" />
          <path d="M13 26l7 7 14-15" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <rect x="34" y="182" width="82" height="8" rx="4" fill="#ffffff" fillOpacity="0.5" />
        <circle cx="75" cy="9" r="3" fill="#ffffff" fillOpacity="0.7" />
      </g>

      {/* scan beam */}
      <g stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.85">
        <line x1="188" y1="150" x2="214" y2="150" />
        <line x1="192" y1="120" x2="212" y2="132" />
        <line x1="192" y1="180" x2="212" y2="168" />
      </g>
    </svg>
  );
}
