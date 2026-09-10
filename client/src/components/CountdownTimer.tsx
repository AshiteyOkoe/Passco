import { useEffect, useState } from 'react';

interface CountdownTimerProps {
  until: string;
  className?: string;
}

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, '0');
  const hms = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return days > 0 ? `${days}d ${hms}` : hms;
}

export default function CountdownTimer({ until, className }: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(() => Math.max(0, new Date(until).getTime() - Date.now()));

  useEffect(() => {
    setRemaining(Math.max(0, new Date(until).getTime() - Date.now()));
    const interval = setInterval(() => {
      setRemaining(Math.max(0, new Date(until).getTime() - Date.now()));
    }, 1000);
    return () => clearInterval(interval);
  }, [until]);

  return (
    <span
      className={`font-mono tabular-nums ${className ?? ''}`}
      role="timer"
      aria-live="polite"
      aria-label="Time until BECE unlocks"
    >
      {formatRemaining(remaining)}
    </span>
  );
}