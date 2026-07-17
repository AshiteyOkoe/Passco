import { cn } from '../../utils';

interface IllustrationProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = { sm: 'max-w-[200px]', md: 'max-w-[320px]', lg: 'max-w-[480px]' };

export function HeroStudents({ className, size = 'md' }: IllustrationProps) {
  return (
    <svg
      className={cn('w-full h-auto', sizes[size], className)}
      viewBox="0 0 480 360"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Students studying with laptops and books"
    >
      {/* Background bookshelf */}
      <rect x="20" y="40" width="440" height="8" rx="4" className="fill-slate-200 dark:fill-slate-700" />
      <rect x="40" y="48" width="60" height="70" rx="3" className="fill-indigo-100 dark:fill-indigo-900/30" />
      <rect x="110" y="48" width="50" height="70" rx="3" className="fill-emerald-100 dark:fill-emerald-900/30" />
      <rect x="170" y="55" width="55" height="63" rx="3" className="fill-amber-100 dark:fill-amber-900/30" />
      <rect x="235" y="48" width="45" height="70" rx="3" className="fill-rose-100 dark:fill-rose-900/30" />
      <rect x="290" y="52" width="65" height="66" rx="3" className="fill-violet-100 dark:fill-violet-900/30" />
      <rect x="365" y="48" width="55" height="70" rx="3" className="fill-cyan-100 dark:fill-cyan-900/30" />

      {/* Desk */}
      <rect x="60" y="200" width="360" height="12" rx="4" className="fill-slate-400 dark:fill-slate-600" />
      <rect x="60" y="212" width="8" height="60" className="fill-slate-400 dark:fill-slate-600" />
      <rect x="412" y="212" width="8" height="60" className="fill-slate-400 dark:fill-slate-600" />

      {/* Student 1 - left */}
      <circle cx="150" cy="145" r="28" className="fill-indigo-200 dark:fill-indigo-800" />
      <rect x="130" y="173" width="40" height="28" rx="8" className="fill-indigo-500 dark:fill-indigo-600" />

      {/* Laptop 1 */}
      <rect x="115" y="170" width="70" height="50" rx="4" className="fill-slate-600 dark:fill-slate-400" />
      <rect x="118" y="173" width="64" height="36" rx="2" className="fill-indigo-50 dark:fill-slate-800" />
      {/* Screen content: code lines */}
      <rect x="122" y="178" width="40" height="3" rx="1.5" className="fill-indigo-300 dark:fill-indigo-500" />
      <rect x="122" y="184" width="55" height="3" rx="1.5" className="fill-amber-300 dark:fill-amber-500" />
      <rect x="122" y="190" width="48" height="3" rx="1.5" className="fill-emerald-300 dark:fill-emerald-500" />
      <rect x="122" y="196" width="30" height="3" rx="1.5" className="fill-indigo-300 dark:fill-indigo-500" />

      {/* Student 2 - right */}
      <circle cx="330" cy="140" r="24" className="fill-emerald-200 dark:fill-emerald-800" />
      <rect x="312" y="164" width="36" height="36" rx="8" className="fill-emerald-500 dark:fill-emerald-600" />

      {/* Tablet 2 */}
      <rect x="305" y="168" width="50" height="60" rx="4" className="fill-slate-600 dark:fill-slate-400" />
      <rect x="308" y="171" width="44" height="48" rx="2" className="fill-emerald-50 dark:fill-slate-800" />
      {/* Tablet screen: chart */}
      <rect x="312" y="175" width="36" height="20" rx="2" className="fill-emerald-200 dark:fill-emerald-800/50" />
      <rect x="312" y="200" width="20" height="3" rx="1.5" className="fill-emerald-400" />
      <rect x="312" y="206" width="36" height="3" rx="1.5" className="fill-indigo-400" />
      <rect x="312" y="212" width="28" height="3" rx="1.5" className="fill-amber-400" />

      {/* Floating quiz elements */}
      <rect x="85" y="80" width="32" height="22" rx="3" className="fill-white dark:fill-slate-800 stroke-indigo-300 dark:stroke-indigo-600" strokeWidth="1.5" />
      <circle cx="93" cy="91" r="3" className="fill-indigo-400" />
      <circle cx="101" cy="91" r="3" className="fill-indigo-400" />
      <circle cx="109" cy="91" r="3" className="fill-indigo-400" />

      <rect x="355" y="78" width="40" height="28" rx="3" className="fill-white dark:fill-slate-800 stroke-amber-300 dark:stroke-amber-600" strokeWidth="1.5" />
      <rect x="360" y="83" width="30" height="3" rx="1.5" className="fill-amber-400" />
      <rect x="360" y="89" width="22" height="3" rx="1.5" className="fill-amber-400" />
      <rect x="360" y="95" width="28" height="3" rx="1.5" className="fill-amber-400" />

      {/* Stars / sparkles */}
      <circle cx="420" cy="95" r="4" className="fill-indigo-400 dark:fill-indigo-500" />
      <circle cx="60" cy="85" r="3" className="fill-emerald-400 dark:fill-emerald-500" />
      <circle cx="240" cy="38" r="3" className="fill-amber-400 dark:fill-amber-500" />
    </svg>
  );
}

export function StudentQuiz({ className, size = 'md' }: IllustrationProps) {
  return (
    <svg
      className={cn('w-full h-auto', sizes[size], className)}
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Student answering a multiple choice quiz on a tablet"
    >
      {/* Background */}
      <rect x="40" y="20" width="320" height="260" rx="16" className="fill-indigo-50 dark:fill-indigo-950/30" />

      {/* Tablet frame */}
      <rect x="100" y="60" width="200" height="180" rx="12" className="fill-slate-700 dark:fill-slate-600" />
      <rect x="108" y="68" width="184" height="156" rx="8" className="fill-white dark:fill-slate-800" />

      {/* Quiz header on tablet */}
      <rect x="116" y="76" width="168" height="20" rx="4" className="fill-indigo-500" />
      <rect x="120" y="92" width="80" height="3" rx="1.5" className="fill-slate-300 dark:fill-slate-600" />

      {/* Question */}
      <rect x="116" y="104" width="168" height="4" rx="2" className="fill-slate-700 dark:fill-slate-300" />
      <rect x="116" y="112" width="140" height="4" rx="2" className="fill-slate-700 dark:fill-slate-300" />

      {/* Option A - selected */}
      <rect x="116" y="126" width="168" height="24" rx="4" className="fill-indigo-100 dark:fill-indigo-900/40 stroke-indigo-400" strokeWidth="1.5" />
      <circle cx="128" cy="138" r="4" className="fill-indigo-500" />
      <rect x="138" y="135" width="80" height="3" rx="1.5" className="fill-indigo-500" />

      {/* Option B */}
      <rect x="116" y="156" width="168" height="24" rx="4" className="fill-slate-100 dark:fill-slate-700" />
      <circle cx="128" cy="168" r="4" className="fill-slate-300 dark:fill-slate-500" />
      <rect x="138" y="165" width="60" height="3" rx="1.5" className="fill-slate-300 dark:fill-slate-500" />

      {/* Option C */}
      <rect x="116" y="186" width="168" height="24" rx="4" className="fill-slate-100 dark:fill-slate-700" />
      <circle cx="128" cy="198" r="4" className="fill-slate-300 dark:fill-slate-500" />
      <rect x="138" y="195" width="100" height="3" rx="1.5" className="fill-slate-300 dark:fill-slate-500" />

      {/* Student silhouette at bottom */}
      <circle cx="200" cy="265" r="14" className="fill-indigo-300 dark:fill-indigo-700" />
      <rect x="186" y="279" width="28" height="20" rx="6" className="fill-indigo-500 dark:fill-indigo-600" />

      {/* Checkmark */}
      <circle cx="40" cy="40" r="16" className="fill-emerald-500" />
      <path d="M33 40l5 5 9-9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AnalyticsChart({ className, size = 'md' }: IllustrationProps) {
  return (
    <svg
      className={cn('w-full h-auto', sizes[size], className)}
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Student reviewing analytics charts and progress"
    >
      {/* Background */}
      <rect x="20" y="10" width="360" height="280" rx="16" className="fill-emerald-50 dark:fill-emerald-950/30" />

      {/* Monitor frame */}
      <rect x="40" y="30" width="240" height="180" rx="8" className="fill-slate-700 dark:fill-slate-600" />
      <rect x="48" y="38" width="224" height="156" rx="4" className="fill-white dark:fill-slate-800" />

      {/* Chart title */}
      <rect x="56" y="46" width="60" height="4" rx="2" className="fill-slate-400 dark:fill-slate-500" />

      {/* Bar chart */}
      <rect x="60" y="80" width="28" height="80" rx="3" className="fill-indigo-400" />
      <rect x="94" y="60" width="28" height="100" rx="3" className="fill-emerald-400" />
      <rect x="128" y="96" width="28" height="64" rx="3" className="fill-amber-400" />
      <rect x="162" y="50" width="28" height="110" rx="3" className="fill-rose-400" />
      <rect x="196" y="88" width="28" height="72" rx="3" className="fill-violet-400" />

      {/* Upward trend arrow */}
      <path d="M55 175 L85 145 L115 155 L145 120 L175 130 L205 105 L230 80" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-emerald-500" />
      <path d="M220 80 L230 80 L226 70" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-emerald-500" />

      {/* X-axis line */}
      <line x1="48" y1="188" x2="272" y2="188" className="stroke-slate-200 dark:stroke-slate-600" strokeWidth="1" />

      {/* Small stats cards to the right */}
      <rect x="300" y="40" width="70" height="50" rx="6" className="fill-white dark:fill-slate-800 stroke-slate-200 dark:stroke-slate-700" strokeWidth="1" />
      <rect x="310" y="48" width="20" height="4" rx="2" className="fill-indigo-400" />
      <rect x="310" y="58" width="40" height="3" rx="1.5" className="fill-slate-700 dark:fill-slate-300" />
      <text x="310" y="80" fontSize="16" fontWeight="bold" className="fill-indigo-600 dark:fill-indigo-400">92%</text>

      <rect x="300" y="100" width="70" height="50" rx="6" className="fill-white dark:fill-slate-800 stroke-slate-200 dark:stroke-slate-700" strokeWidth="1" />
      <rect x="310" y="108" width="20" height="4" rx="2" className="fill-emerald-400" />
      <rect x="310" y="118" width="40" height="3" rx="1.5" className="fill-slate-700 dark:fill-slate-300" />
      <text x="310" y="140" fontSize="16" fontWeight="bold" className="fill-emerald-600 dark:fill-emerald-400">85%</text>

      <rect x="300" y="160" width="70" height="50" rx="6" className="fill-white dark:fill-slate-800 stroke-slate-200 dark:stroke-slate-700" strokeWidth="1" />
      <rect x="310" y="168" width="20" height="4" rx="2" className="fill-amber-400" />
      <rect x="310" y="178" width="40" height="3" rx="1.5" className="fill-slate-700 dark:fill-slate-300" />
      <text x="310" y="200" fontSize="16" fontWeight="bold" className="fill-amber-600 dark:fill-amber-400">73%</text>

      {/* Student at bottom */}
      <circle cx="200" cy="250" r="16" className="fill-emerald-300 dark:fill-emerald-700" />
      <rect x="186" y="266" width="28" height="24" rx="6" className="fill-emerald-500 dark:fill-emerald-600" />

      {/* Star */}
      <polygon points="360,20 364,32 376,32 366,40 370,52 360,44 350,52 354,40 344,32 356,32" className="fill-amber-400" />
    </svg>
  );
}

export function AdminPanel({ className, size = 'md' }: IllustrationProps) {
  return (
    <svg
      className={cn('w-full h-auto', sizes[size], className)}
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Teacher or admin reviewing files and questions on a dashboard"
    >
      {/* Background */}
      <rect x="20" y="10" width="360" height="280" rx="16" className="fill-slate-50 dark:fill-slate-900/50" />

      {/* Desktop screen */}
      <rect x="60" y="30" width="280" height="200" rx="8" className="fill-slate-700 dark:fill-slate-600" />
      <rect x="68" y="38" width="264" height="180" rx="4" className="fill-white dark:fill-slate-800" />

      {/* Sidebar */}
      <rect x="68" y="38" width="50" height="180" rx="0" className="fill-indigo-50 dark:fill-indigo-950/30" />
      <rect x="76" y="46" width="34" height="6" rx="3" className="fill-indigo-300 dark:fill-indigo-600" />
      <rect x="76" y="58" width="34" height="6" rx="3" className="fill-indigo-300 dark:fill-indigo-600" />
      <rect x="76" y="70" width="34" height="6" rx="3" className="fill-indigo-300 dark:fill-indigo-600" />
      <rect x="76" y="82" width="34" height="6" rx="3" className="fill-indigo-200 dark:fill-indigo-700" />

      {/* Main content: table */}
      <rect x="126" y="46" width="198" height="16" rx="4" className="fill-indigo-500" />
      <rect x="130" y="50" width="80" height="3" rx="1.5" className="fill-white/70" />

      {/* Table rows */}
      <rect x="126" y="70" width="198" height="8" rx="2" className="fill-slate-100 dark:fill-slate-700" />
      <rect x="130" y="72" width="40" height="4" rx="2" className="fill-slate-300 dark:fill-slate-500" />
      <rect x="180" y="72" width="60" height="4" rx="2" className="fill-slate-300 dark:fill-slate-500" />
      <rect x="250" y="72" width="30" height="4" rx="2" className="fill-emerald-400" />

      <rect x="126" y="84" width="198" height="8" rx="2" className="fill-slate-50 dark:fill-slate-700" />
      <rect x="130" y="86" width="40" height="4" rx="2" className="fill-slate-300 dark:fill-slate-500" />
      <rect x="180" y="86" width="60" height="4" rx="2" className="fill-slate-300 dark:fill-slate-500" />
      <rect x="250" y="86" width="30" height="4" rx="2" className="fill-amber-400" />

      <rect x="126" y="98" width="198" height="8" rx="2" className="fill-slate-100 dark:fill-slate-700" />
      <rect x="130" y="100" width="40" height="4" rx="2" className="fill-slate-300 dark:fill-slate-500" />
      <rect x="180" y="100" width="60" height="4" rx="2" className="fill-slate-300 dark:fill-slate-500" />
      <rect x="250" y="100" width="30" height="4" rx="2" className="fill-emerald-400" />

      <rect x="126" y="112" width="198" height="8" rx="2" className="fill-slate-50 dark:fill-slate-700" />
      <rect x="130" y="114" width="40" height="4" rx="2" className="fill-slate-300 dark:fill-slate-500" />
      <rect x="180" y="114" width="60" height="4" rx="2" className="fill-slate-300 dark:fill-slate-500" />
      <rect x="250" y="114" width="30" height="4" rx="2" className="fill-rose-400" />

      {/* Question cards on the right area */}
      <rect x="126" y="132" width="90" height="50" rx="4" className="fill-indigo-50 dark:fill-indigo-950/30 stroke-indigo-200 dark:stroke-indigo-800" strokeWidth="1" />
      <rect x="132" y="138" width="78" height="3" rx="1.5" className="fill-indigo-400" />
      <rect x="132" y="145" width="60" height="3" rx="1.5" className="fill-slate-400 dark:fill-slate-500" />
      <rect x="132" y="152" width="50" height="3" rx="1.5" className="fill-emerald-400" />
      <rect x="132" y="159" width="70" height="3" rx="1.5" className="fill-slate-400 dark:fill-slate-500" />

      <rect x="224" y="132" width="90" height="50" rx="4" className="fill-amber-50 dark:fill-amber-950/30 stroke-amber-200 dark:stroke-amber-800" strokeWidth="1" />
      <rect x="230" y="138" width="78" height="3" rx="1.5" className="fill-amber-400" />
      <rect x="230" y="145" width="60" height="3" rx="1.5" className="fill-slate-400 dark:fill-slate-500" />
      <rect x="230" y="152" width="50" height="3" rx="1.5" className="fill-rose-400" />
      <rect x="230" y="159" width="70" height="3" rx="1.5" className="fill-slate-400 dark:fill-slate-500" />

      {/* Teacher figure */}
      <circle cx="200" cy="258" r="14" className="fill-indigo-300 dark:fill-indigo-700" />
      <rect x="186" y="272" width="28" height="20" rx="6" className="fill-indigo-500 dark:fill-indigo-600" />

      {/* Glasses */}
      <circle cx="194" cy="256" r="5" fill="none" className="stroke-slate-600 dark:stroke-slate-300" strokeWidth="1.5" />
      <circle cx="206" cy="256" r="5" fill="none" className="stroke-slate-600 dark:stroke-slate-300" strokeWidth="1.5" />
      <line x1="199" y1="256" x2="201" y2="256" className="stroke-slate-600 dark:stroke-slate-300" strokeWidth="1.5" />
    </svg>
  );
}

export function SuccessCelebration({ className, size = 'md' }: IllustrationProps) {
  return (
    <svg
      className={cn('w-full h-auto', sizes[size], className)}
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Student celebrating success with a trophy and certificate"
    >
      {/* Background glow */}
      <circle cx="200" cy="150" r="130" className="fill-amber-50 dark:fill-amber-950/20" />
      <circle cx="200" cy="150" r="100" className="fill-amber-100/50 dark:fill-amber-900/10" />

      {/* Trophy */}
      <rect x="175" y="80" width="50" height="12" rx="3" className="fill-amber-400" />
      <rect x="182" y="92" width="36" height="40" rx="6" className="fill-amber-400" />
      <rect x="175" y="132" width="50" height="8" rx="2" className="fill-amber-500" />
      {/* Trophy handles */}
      <path d="M175 90 Q155 90 155 110 Q155 120 175 115" fill="none" className="stroke-amber-400" strokeWidth="4" strokeLinecap="round" />
      <path d="M225 90 Q245 90 245 110 Q245 120 225 115" fill="none" className="stroke-amber-400" strokeWidth="4" strokeLinecap="round" />
      {/* Trophy star */}
      <polygon points="200,98 203,108 214,108 205,114 208,124 200,118 192,124 195,114 186,108 197,108" className="fill-white" />

      {/* Trophy base/pedestal */}
      <rect x="180" y="140" width="40" height="6" rx="2" className="fill-amber-500" />
      <rect x="185" y="146" width="30" height="8" rx="2" className="fill-amber-600" />

      {/* Confetti */}
      <rect x="80" y="60" width="8" height="8" rx="2" className="fill-indigo-400 rotate-12" />
      <rect x="300" y="50" width="8" height="8" rx="2" className="fill-emerald-400 -rotate-12" />
      <rect x="100" y="180" width="8" height="8" rx="2" className="fill-rose-400 rotate-45" />
      <rect x="290" y="190" width="8" height="8" rx="2" className="fill-amber-400 -rotate-12" />
      <rect x="120" y="40" width="6" height="6" rx="1" className="fill-violet-400" />
      <rect x="310" y="130" width="6" height="6" rx="1" className="fill-cyan-400 rotate-45" />
      <rect x="70" y="130" width="6" height="6" rx="1" className="fill-emerald-400" />
      <rect x="320" y="80" width="6" height="6" rx="1" className="fill-rose-400" />

      {/* Stars */}
      <polygon points="310,30 312,38 320,38 314,44 316,52 310,47 304,52 306,44 300,38 308,38" className="fill-indigo-400" />
      <polygon points="80,100 82,106 88,106 83,110 85,116 80,112 75,116 77,110 72,106 78,106" className="fill-emerald-400" />

      {/* Certificate / document */}
      <rect x="120" y="120" width="60" height="80" rx="4" className="fill-white dark:fill-slate-700 stroke-amber-300 dark:stroke-amber-600" strokeWidth="1.5" />
      <rect x="126" y="126" width="48" height="4" rx="2" className="fill-indigo-400" />
      <rect x="126" y="134" width="40" height="2" rx="1" className="fill-slate-300 dark:fill-slate-500" />
      <rect x="126" y="140" width="48" height="2" rx="1" className="fill-slate-300 dark:fill-slate-500" />
      <rect x="126" y="146" width="35" height="2" rx="1" className="fill-slate-300 dark:fill-slate-500" />
      <circle cx="150" cy="160" r="10" className="fill-amber-100 dark:fill-amber-800/50" />
      <polygon points="150,155 151.5,158 155,158 152,160 153,163 150,161 147,163 148,160 145,158 148.5,158" className="fill-amber-500" />

      {/* Ribbon */}
      <path d="M170 120 L180 130 L190 120" className="fill-rose-400" />

      {/* Student celebrating */}
      <circle cx="230" cy="210" r="18" className="fill-indigo-300 dark:fill-indigo-700" />
      <rect x="216" y="228" width="28" height="24" rx="6" className="fill-indigo-500 dark:fill-indigo-600" />
      {/* Raised arms */}
      <line x1="216" y1="230" x2="206" y2="210" className="stroke-indigo-500 dark:stroke-indigo-600" strokeWidth="4" strokeLinecap="round" />
      <line x1="244" y1="230" x2="254" y2="210" className="stroke-indigo-500 dark:stroke-indigo-600" strokeWidth="4" strokeLinecap="round" />

      {/* Happy face */}
      <circle cx="235" cy="215" r="2" className="fill-slate-800 dark:fill-white" />
      <path d="M220 218 Q230 226 240 218" fill="none" className="stroke-slate-800 dark:stroke-white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function EmptyState({ className, size = 'md' }: IllustrationProps) {
  return (
    <svg
      className={cn('w-full h-auto', sizes[size], className)}
      viewBox="0 0 400 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Empty state illustration showing an open book and study materials"
    >
      {/* Open book */}
      <path d="M100 100 L200 130 L300 100 L300 240 L200 270 L100 240 Z" className="fill-indigo-50 dark:fill-indigo-950/30 stroke-indigo-200 dark:stroke-indigo-800" strokeWidth="2" />
      <path d="M200 130 L200 270" className="stroke-indigo-200 dark:stroke-indigo-800" strokeWidth="2" />
      {/* Book spine */}
      <line x1="200" y1="130" x2="200" y2="270" className="stroke-indigo-300 dark:stroke-indigo-600" strokeWidth="2" />
      {/* Left page lines */}
      <line x1="120" y1="140" x2="185" y2="155" className="stroke-indigo-200 dark:stroke-indigo-700" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="120" y1="155" x2="185" y2="170" className="stroke-indigo-200 dark:stroke-indigo-700" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="120" y1="170" x2="185" y2="185" className="stroke-indigo-200 dark:stroke-indigo-700" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="120" y1="185" x2="185" y2="200" className="stroke-indigo-200 dark:stroke-indigo-700" strokeWidth="1.5" strokeLinecap="round" />
      {/* Right page lines */}
      <line x1="215" y1="155" x2="280" y2="140" className="stroke-indigo-200 dark:stroke-indigo-700" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="215" y1="170" x2="280" y2="155" className="stroke-indigo-200 dark:stroke-indigo-700" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="215" y1="185" x2="280" y2="170" className="stroke-indigo-200 dark:stroke-indigo-700" strokeWidth="1.5" strokeLinecap="round" />

      {/* Floating icons around the book */}
      <circle cx="80" cy="80" r="18" className="fill-emerald-100 dark:fill-emerald-900/30 stroke-emerald-300 dark:stroke-emerald-700" strokeWidth="1.5" />
      <path d="M75 80 L85 80 M80 75 L80 85" className="stroke-emerald-500" strokeWidth="2" strokeLinecap="round" />

      <circle cx="320" cy="80" r="18" className="fill-amber-100 dark:fill-amber-900/30 stroke-amber-300 dark:stroke-amber-700" strokeWidth="1.5" />
      <circle cx="320" cy="80" r="5" className="fill-amber-500" />

      <rect x="60" y="200" width="12" height="40" rx="3" className="fill-rose-200 dark:fill-rose-900/30" />
      <rect x="78" y="210" width="12" height="30" rx="3" className="fill-violet-200 dark:fill-violet-900/30" />
      <rect x="310" y="210" width="12" height="30" rx="3" className="fill-emerald-200 dark:fill-emerald-900/30" />
      <rect x="328" y="200" width="12" height="40" rx="3" className="fill-amber-200 dark:fill-amber-900/30" />

      {/* Stars */}
      <polygon points="200,50 202,58 210,58 204,63 206,71 200,66 194,71 196,63 190,58 198,58" className="fill-indigo-300 dark:fill-indigo-600" />
      <polygon points="50,160 51,164 55,164 52,167 53,171 50,168 47,171 48,167 45,164 49,164" className="fill-amber-300 dark:fill-amber-600" />
      <polygon points="350,150 351,154 355,154 352,157 353,161 350,158 347,161 348,157 345,154 349,154" className="fill-emerald-300 dark:fill-emerald-600" />
    </svg>
  );
}
