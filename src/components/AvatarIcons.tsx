// Premium SVG avatar icons — stored as key string in DB, rendered as crisp SVG
// No external files, no storage cost, scales perfectly

export const AVATAR_OPTIONS: { key: string; label: string }[] = [
  { key: "", label: "None" },
  { key: "maple", label: "Maple" },
  { key: "heart", label: "Heart" },
  { key: "compass", label: "Compass" },
  { key: "star", label: "Star" },
  { key: "bird", label: "Bird" },
  { key: "mountain", label: "Mountain" },
  { key: "sun", label: "Sun" },
  { key: "moon", label: "Moon" },
  { key: "flower", label: "Flower" },
  { key: "shield", label: "Shield" },
  { key: "gem", label: "Gem" },
  { key: "wave", label: "Wave" },
  { key: "bolt", label: "Bolt" },
  { key: "flame", label: "Flame" },
  { key: "crown", label: "Crown" },
  { key: "leaf", label: "Leaf" },
];

// Returns SVG content for a given avatar key
export function AvatarIcon({ icon, size = 24, className = "" }: { icon: string; size?: number; className?: string }) {
  const s = size;
  const sw = size > 20 ? 1.5 : 1.2;
  const props = { width: s, height: s, viewBox: "0 0 24 24", fill: "none", className, xmlns: "http://www.w3.org/2000/svg" };

  switch (icon) {
    case "maple":
      return (
        <svg {...props}>
          <path d="M12 2L9.5 7.5L4 6.5L7 11L3 14H8L7 19L12 16L17 19L16 14H21L17 11L20 6.5L14.5 7.5L12 2Z"
            stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 16V22" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" />
        </svg>
      );
    case "heart":
      return (
        <svg {...props}>
          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z"
            stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "compass":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={sw} />
          <polygon points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88"
            stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.15" />
        </svg>
      );
    case "star":
      return (
        <svg {...props}>
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
            stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "bird":
      return (
        <svg {...props}>
          <path d="M20 7C20 4.79 18.21 3 16 3C13.79 3 12 4.79 12 7C12 7 8 7 4 11" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4 11C4 11 4 16 8 18L12 20L16 18C20 16 20 11 20 11" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="16" cy="6" r="1" fill="currentColor" />
        </svg>
      );
    case "mountain":
      return (
        <svg {...props}>
          <path d="M12 4L2 20H22L12 4Z" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
          <path d="M7 20L12 13L15 16L18 12" stroke="currentColor" strokeWidth={sw * 0.8} strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
        </svg>
      );
    case "sun":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth={sw} />
          <line x1="12" y1="1" x2="12" y2="3" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" />
          <line x1="12" y1="21" x2="12" y2="23" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" />
          <line x1="1" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" />
          <line x1="21" y1="12" x2="23" y2="12" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" />
        </svg>
      );
    case "moon":
      return (
        <svg {...props}>
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "flower":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth={sw} />
          <path d="M12 2C12 2 14 6 12 9" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" />
          <path d="M12 22C12 22 10 18 12 15" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" />
          <path d="M2 12C2 12 6 10 9 12" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" />
          <path d="M22 12C22 12 18 14 15 12" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" />
          <path d="M4.93 4.93C4.93 4.93 8.1 6.17 9.88 9.88" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" />
          <path d="M19.07 19.07C19.07 19.07 15.9 17.83 14.12 14.12" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" />
          <path d="M19.07 4.93C19.07 4.93 17.83 8.1 14.12 9.88" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" />
          <path d="M4.93 19.07C4.93 19.07 6.17 15.9 9.88 14.12" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" />
        </svg>
      );
    case "shield":
      return (
        <svg {...props}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "gem":
      return (
        <svg {...props}>
          <polygon points="12,2 22,9 12,22 2,9" stroke="currentColor" strokeWidth={sw} strokeLinejoin="round" />
          <line x1="2" y1="9" x2="22" y2="9" stroke="currentColor" strokeWidth={sw} />
          <line x1="12" y1="2" x2="8" y2="9" stroke="currentColor" strokeWidth={sw * 0.8} opacity="0.5" />
          <line x1="12" y1="2" x2="16" y2="9" stroke="currentColor" strokeWidth={sw * 0.8} opacity="0.5" />
          <line x1="8" y1="9" x2="12" y2="22" stroke="currentColor" strokeWidth={sw * 0.8} opacity="0.5" />
          <line x1="16" y1="9" x2="12" y2="22" stroke="currentColor" strokeWidth={sw * 0.8} opacity="0.5" />
        </svg>
      );
    case "wave":
      return (
        <svg {...props}>
          <path d="M2 12C4 8 6 6 8 8C10 10 10 14 12 12C14 10 14 6 16 8C18 10 20 8 22 12" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" fill="none" />
          <path d="M2 17C4 13 6 11 8 13C10 15 10 19 12 17C14 15 14 11 16 13C18 15 20 13 22 17" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" fill="none" opacity="0.4" />
        </svg>
      );
    case "bolt":
      return (
        <svg {...props}>
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "flame":
      return (
        <svg {...props}>
          <path d="M12 22c-4 0-7-3-7-7 0-3 2-5 4-8l3-4 3 4c2 3 4 5 4 8 0 4-3 7-7 7z"
            stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 22c-1.5 0-3-1.5-3-3.5 0-1.5 1-2.5 2-4l1-1.5 1 1.5c1 1.5 2 2.5 2 4 0 2-1.5 3.5-3 3.5z"
            stroke="currentColor" strokeWidth={sw * 0.8} strokeLinecap="round" opacity="0.5" />
        </svg>
      );
    case "crown":
      return (
        <svg {...props}>
          <path d="M2 17L4 7L8 12L12 4L16 12L20 7L22 17H2Z" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
          <line x1="2" y1="20" x2="22" y2="20" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" />
        </svg>
      );
    case "leaf":
      return (
        <svg {...props}>
          <path d="M17 8C17 8 21 2 12 2C3 2 3 12 3 12C3 12 3 22 12 22C14 22 15.5 21 16.5 19.5"
            stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6 18C8 14 12 10 17 8" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

// Check if a string is an avatar key (vs emoji character)
export function isAvatarKey(value: string | null): boolean {
  if (!value) return false;
  return AVATAR_OPTIONS.some(a => a.key === value && a.key !== "");
}
