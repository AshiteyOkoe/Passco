import { Trophy, Star, Medal, TrendingUp, BookOpen, type LucideIcon } from 'lucide-react';

export interface RewardLabel {
  label: string;
  icon: LucideIcon;
  color: string;
}

export function getRewardLabel(avg: number): RewardLabel {
  if (avg >= 90) return { label: 'Champion', icon: Trophy, color: 'text-amber-400' };
  if (avg >= 80) return { label: 'Star Performer', icon: Star, color: 'text-emerald-400' };
  if (avg >= 70) return { label: 'Achiever', icon: Medal, color: 'text-blue-400' };
  if (avg >= 60) return { label: 'Rising Star', icon: TrendingUp, color: 'text-violet-400' };
  return { label: 'Learner', icon: BookOpen, color: 'text-slate-400' };
}