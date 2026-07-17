interface AvatarProps {
  className?: string;
  size?: number;
}

export function MaleAvatar({ className = '', size = 80 }: AvatarProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="maleBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#maleBg)" />
      <circle cx="50" cy="38" r="16" fill="#fbbf24" />
      <ellipse cx="50" cy="78" rx="24" ry="20" fill="#fbbf24" />
      <circle cx="44" cy="36" r="2" fill="#1e293b" />
      <circle cx="56" cy="36" r="2" fill="#1e293b" />
      <path d="M 46 42 Q 50 46 54 42" stroke="#1e293b" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M 30 28 Q 34 18 50 16 Q 66 18 70 28" stroke="#1e293b" strokeWidth="4" fill="none" strokeLinecap="round" />
      <rect x="38" y="62" width="24" height="6" rx="3" fill="#2563eb" />
    </svg>
  );
}

export function FemaleAvatar({ className = '', size = 80 }: AvatarProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="femaleBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#be185d" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#femaleBg)" />
      <circle cx="50" cy="38" r="16" fill="#fbbf24" />
      <ellipse cx="50" cy="78" rx="24" ry="20" fill="#fbbf24" />
      <circle cx="44" cy="36" r="2" fill="#1e293b" />
      <circle cx="56" cy="36" r="2" fill="#1e293b" />
      <path d="M 46 42 Q 50 45 54 42" stroke="#1e293b" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M 32 30 Q 28 14 42 10 Q 50 8 58 10 Q 72 14 68 30" stroke="#1e293b" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <path d="M 30 30 Q 26 22 30 16" stroke="#1e293b" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M 70 30 Q 74 22 70 16" stroke="#1e293b" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="34" cy="20" r="3" fill="#f472b6" />
      <circle cx="66" cy="20" r="3" fill="#f472b6" />
      <rect x="38" y="62" width="24" height="6" rx="3" fill="#db2777" />
    </svg>
  );
}

export function DefaultAvatar({ gender, className = '', size = 80 }: { gender?: 'male' | 'female' | '' } & AvatarProps) {
  if (gender === 'female') return <FemaleAvatar className={className} size={size} />;
  if (gender === 'male') return <MaleAvatar className={className} size={size} />;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="defaultBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#defaultBg)" />
      <circle cx="50" cy="38" r="16" fill="#fbbf24" />
      <ellipse cx="50" cy="78" rx="24" ry="20" fill="#fbbf24" />
      <circle cx="44" cy="36" r="2" fill="#1e293b" />
      <circle cx="56" cy="36" r="2" fill="#1e293b" />
      <path d="M 46 42 Q 50 46 54 42" stroke="#1e293b" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M 34 28 Q 42 16 50 16 Q 58 16 66 28" stroke="#1e293b" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <rect x="38" y="62" width="24" height="6" rx="3" fill="#4f46e5" />
    </svg>
  );
}
