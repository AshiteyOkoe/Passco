import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Award, Star, Medal, Shield, Crown, Gem, Target,
  BookOpen, ClipboardCheck, GraduationCap, Brain, Zap, Flame,
  TrendingUp, CheckCircle2, Lock, Download, Printer, Upload,
  ArrowRight, Sparkles, ChevronDown, ChevronUp, Eye, X, FileUp, BadgeCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils';
import { fadeUp, slideUp, stagger, bounceIn } from '../utils/animations';
import { SUBJECT_META, CLASS_META, DIFFICULTY_META, type JHSCategory, type SubjectId } from '../data/questionBank';

interface LocalAssessment {
  classLevel: JHSCategory;
  subject: string;
  difficulty: string;
  assessmentType: string;
  totalQuestions: number;
  answeredQuestions: number;
  correctCount: number;
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
  grade: string;
  passed: boolean;
  timeSpent: number;
  timestamp: number;
  completedAt?: string;
  abandoned?: boolean;
}

type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
type BadgeCategory = 'class' | 'level' | 'subject' | 'quiz' | 'mock' | 'exam' | 'score' | 'streak' | 'mastery';

interface Badge {
  id: string;
  name: string;
  description: string;
  tier: BadgeTier;
  category: BadgeCategory;
  icon: React.ComponentType<{ className?: string }>;
  earned: boolean;
  progress: number;
  maxProgress: number;
  earnedDate?: string;
}

const TIER_CONFIG: Record<BadgeTier, { label: string; gradient: string; ring: string; shadow: string; bg: string; text: string }> = {
  bronze: {
    label: 'Bronze',
    gradient: 'from-amber-600 to-yellow-700',
    ring: 'ring-amber-300 dark:ring-amber-700',
    shadow: 'shadow-amber-200 dark:shadow-amber-900/30',
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    text: 'text-amber-700 dark:text-amber-400',
  },
  silver: {
    label: 'Silver',
    gradient: 'from-slate-400 to-gray-500',
    ring: 'ring-slate-300 dark:ring-slate-600',
    shadow: 'shadow-slate-200 dark:shadow-slate-800/30',
    bg: 'bg-slate-50 dark:bg-slate-500/10',
    text: 'text-slate-600 dark:text-slate-300',
  },
  gold: {
    label: 'Gold',
    gradient: 'from-yellow-400 to-amber-500',
    ring: 'ring-yellow-300 dark:ring-yellow-700',
    shadow: 'shadow-yellow-200 dark:shadow-yellow-900/30',
    bg: 'bg-yellow-50 dark:bg-yellow-500/10',
    text: 'text-yellow-700 dark:text-yellow-400',
  },
  platinum: {
    label: 'Platinum',
    gradient: 'from-cyan-400 to-blue-500',
    ring: 'ring-cyan-300 dark:ring-cyan-700',
    shadow: 'shadow-cyan-200 dark:shadow-cyan-900/30',
    bg: 'bg-cyan-50 dark:bg-cyan-500/10',
    text: 'text-cyan-700 dark:text-cyan-400',
  },
  diamond: {
    label: 'Diamond',
    gradient: 'from-violet-400 to-purple-600',
    ring: 'ring-violet-300 dark:ring-violet-700',
    shadow: 'shadow-violet-200 dark:shadow-violet-900/30',
    bg: 'bg-violet-50 dark:bg-violet-500/10',
    text: 'text-violet-700 dark:text-violet-400',
  },
};

const CATEGORY_CONFIG: Record<BadgeCategory, { label: string; color: string }> = {
  class: { label: 'Class Completion', color: 'text-blue-500' },
  level: { label: 'Level Mastery', color: 'text-emerald-500' },
  subject: { label: 'Subject Achievement', color: 'text-violet-500' },
  quiz: { label: 'Quiz Champion', color: 'text-amber-500' },
  mock: { label: 'Mock Excellence', color: 'text-orange-500' },
  exam: { label: 'Exam Mastery', color: 'text-rose-500' },
  score: { label: 'Score Milestone', color: 'text-indigo-500' },
  streak: { label: 'Consistency', color: 'text-emerald-500' },
  mastery: { label: 'Grand Mastery', color: 'text-yellow-500' },
};

function generateCode(userId: string): string {
  let hash = 0;
  const str = `PASSCO-${userId}-${new Date().getFullYear()}`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).toUpperCase().slice(0, 8).padStart(8, '0');
  return `PAS-${new Date().getFullYear()}-${hex.slice(0, 4)}-${hex.slice(4)}`;
}

export default function StudentAchievements() {
  const { user } = useAuth();
  const [showCertificate, setShowCertificate] = useState(false);
  const [badgeFilter, setBadgeFilter] = useState<'all' | 'earned' | 'locked'>('all');
  const [adminSignature, setAdminSignature] = useState<string>(() => {
    try {
      const raw = localStorage.getItem('passco-admin-signature');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.imageData) return parsed.imageData;
      }
    } catch {}
    return localStorage.getItem('passco-admin-signature-image') || '';
  });
  const [showSignatureUpload, setShowSignatureUpload] = useState(false);

  const localAssessments = useMemo(() => {
    try {
      const raw = localStorage.getItem('assessment-history');
      return raw ? (JSON.parse(raw) as LocalAssessment[]) : [];
    } catch { return []; }
  }, []);

  const completed = useMemo(() => localAssessments.filter(a => !a.abandoned && a.passed), [localAssessments]);
  const allResults = useMemo(() => localAssessments.filter(a => !a.abandoned), [localAssessments]);

  const stats = useMemo(() => {
    const completedClasses = new Set(completed.map(r => r.classLevel));
    const completedSubjects = new Set(completed.map(r => r.subject));
    const difficulties = new Set(completed.map(r => r.difficulty));
    const assessmentTypes = new Set(completed.map(r => r.assessmentType));
    const avgScore = completed.length > 0 ? Math.round(completed.reduce((s, r) => s + r.percentage, 0) / completed.length) : 0;
    const perfectScores = completed.filter(r => r.percentage === 100).length;
    const totalQuizzes = completed.filter(r => r.assessmentType === 'quiz').length;
    const totalMocks = completed.filter(r => r.assessmentType === 'mock').length;
    const totalExams = completed.filter(r => r.assessmentType === 'examination').length;

    const sorted = [...completed].sort((a, b) => a.timestamp - b.timestamp);
    let maxStreak = 0;
    let currentStreak = 0;
    for (let i = 0; i < sorted.length; i++) {
      if (i === 0 || sorted[i].timestamp - sorted[i - 1].timestamp <= 7 * 24 * 60 * 60 * 1000) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }

    return {
      completedClasses: completedClasses.size,
      completedSubjects: completedSubjects.size,
      difficulties: difficulties.size,
      assessmentTypes: assessmentTypes.size,
      avgScore,
      perfectScores,
      totalQuizzes,
      totalMocks,
      totalExams,
      totalCompleted: completed.length,
      maxStreak,
      allClasses: 3,
      allSubjects: Object.keys(SUBJECT_META).length,
      allDifficulties: 3,
    };
  }, [completed]);

  const badges = useMemo<Badge[]>(() => {
    const b: Badge[] = [];

    // Class badges
    const classLevels: JHSCategory[] = ['jhs1', 'jhs2', 'jhs3'];
    classLevels.forEach(cls => {
      const hasPassed = completed.some(r => r.classLevel === cls);
      const classCount = completed.filter(r => r.classLevel === cls).length;
      b.push({
        id: `class-${cls}`,
        name: `${CLASS_META[cls].label} Graduate`,
        description: `Complete ${CLASS_META[cls].label} assessments`,
        tier: hasPassed ? 'gold' : 'bronze',
        category: 'class',
        icon: GraduationCap,
        earned: hasPassed,
        progress: Math.min(classCount, 5),
        maxProgress: 5,
        earnedDate: hasPassed ? new Date(completed.find(r => r.classLevel === cls)!.timestamp).toISOString() : undefined,
      });
    });

    // Level badges
    const levels: Array<{ key: string; label: string; req: number }> = [
      { key: 'beginner', label: 'Beginner Explorer', req: 3 },
      { key: 'intermediate', label: 'Intermediate Thinker', req: 3 },
      { key: 'expert', label: 'Expert Analyst', req: 3 },
    ];
    levels.forEach(lv => {
      const count = completed.filter(r => r.difficulty === lv.key).length;
      const earned = count >= lv.req;
      b.push({
        id: `level-${lv.key}`,
        name: lv.label,
        description: `Complete ${lv.req} ${lv.key} assessments`,
        tier: earned ? 'gold' : count > 0 ? 'silver' : 'bronze',
        category: 'level',
        icon: Target,
        earned,
        progress: Math.min(count, lv.req),
        maxProgress: lv.req,
      });
    });

    // Subject badges
    const subjectIds = Object.keys(SUBJECT_META) as SubjectId[];
    subjectIds.forEach(sub => {
      const count = completed.filter(r => r.subject === sub).length;
      const avgPct = count > 0 ? completed.filter(r => r.subject === sub).reduce((s, r) => s + r.percentage, 0) / count : 0;
      const earned = count >= 2;
      const gold = avgPct >= 80 && count >= 3;
      b.push({
        id: `subject-${sub}`,
        name: `${SUBJECT_META[sub].icon} ${SUBJECT_META[sub].label} Champion`,
        description: `Complete 2+ ${SUBJECT_META[sub].label} assessments`,
        tier: gold ? 'gold' : earned ? 'silver' : count > 0 ? 'bronze' : 'bronze',
        category: 'subject',
        icon: BookOpen,
        earned,
        progress: Math.min(count, 2),
        maxProgress: 2,
      });
    });

    // Quiz badge
    const quizDone = stats.totalQuizzes;
    b.push({
      id: 'quiz-5',
      name: 'Quiz Enthusiast',
      description: 'Complete 5 quizzes',
      tier: quizDone >= 5 ? 'gold' : quizDone >= 2 ? 'silver' : 'bronze',
      category: 'quiz',
      icon: Zap,
      earned: quizDone >= 5,
      progress: Math.min(quizDone, 5),
      maxProgress: 5,
    });

    // Mock badge
    const mockDone = stats.totalMocks;
    b.push({
      id: 'mock-3',
      name: 'Mock Master',
      description: 'Complete 3 mock tests',
      tier: mockDone >= 3 ? 'gold' : mockDone >= 1 ? 'silver' : 'bronze',
      category: 'mock',
      icon: ClipboardCheck,
      earned: mockDone >= 3,
      progress: Math.min(mockDone, 3),
      maxProgress: 3,
    });

    // Exam badge
    const examDone = stats.totalExams;
    b.push({
      id: 'exam-2',
      name: 'Exam Warrior',
      description: 'Complete 2 full examinations',
      tier: examDone >= 2 ? 'gold' : examDone >= 1 ? 'silver' : 'bronze',
      category: 'exam',
      icon: Brain,
      earned: examDone >= 2,
      progress: Math.min(examDone, 2),
      maxProgress: 2,
    });

    // Score badges
    const highAvg = stats.avgScore >= 80;
    b.push({
      id: 'score-80',
      name: 'High Achiever',
      description: 'Maintain 80%+ average',
      tier: stats.avgScore >= 90 ? 'platinum' : highAvg ? 'gold' : 'bronze',
      category: 'score',
      icon: TrendingUp,
      earned: highAvg,
      progress: Math.min(stats.avgScore, 80),
      maxProgress: 80,
    });

    b.push({
      id: 'perfect',
      name: 'Perfectionist',
      description: 'Score 100% on any assessment',
      tier: 'diamond',
      category: 'score',
      icon: Gem,
      earned: stats.perfectScores > 0,
      progress: stats.perfectScores > 0 ? 1 : 0,
      maxProgress: 1,
    });

    // Streak badges
    b.push({
      id: 'streak-3',
      name: 'Consistent Learner',
      description: 'Complete 3+ assessments in a week streak',
      tier: stats.maxStreak >= 3 ? 'silver' : 'bronze',
      category: 'streak',
      icon: Flame,
      earned: stats.maxStreak >= 3,
      progress: Math.min(stats.maxStreak, 3),
      maxProgress: 3,
    });

    // Grand mastery
    const allClassesDone = stats.completedClasses >= stats.allClasses;
    const allSubjectsDone = stats.completedSubjects >= stats.allSubjects;
    const allLevelsDone = stats.difficulties >= stats.allDifficulties;
    const masteryEarned = allClassesDone && allSubjectsDone && allLevelsDone && stats.avgScore >= 80;
    b.push({
      id: 'mastery-grand',
      name: 'Grand Master',
      description: 'Complete all classes, subjects, and difficulty levels with 80%+ average',
      tier: 'diamond',
      category: 'mastery',
      icon: Crown,
      earned: masteryEarned,
      progress: (stats.completedClasses + stats.completedSubjects + stats.difficulties + (stats.avgScore >= 80 ? 1 : 0)),
      maxProgress: (stats.allClasses + stats.allSubjects + stats.allDifficulties + 1),
    });

    return b;
  }, [completed, stats]);

  const earnedBadges = useMemo(() => badges.filter(b => b.earned), [badges]);
  const totalBadges = badges.length;

  const filteredBadges = useMemo(() => {
    if (badgeFilter === 'earned') return badges.filter(b => b.earned);
    if (badgeFilter === 'locked') return badges.filter(b => !b.earned);
    return badges;
  }, [badges, badgeFilter]);

  const badgeGroups = useMemo(() => {
    const groups = new Map<string, Badge[]>();
    filteredBadges.forEach(b => {
      const cat = CATEGORY_CONFIG[b.category].label;
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(b);
    });
    return Array.from(groups.entries());
  }, [filteredBadges]);

  const isEligibleForCertificate = useMemo(() => {
    return stats.avgScore >= 90 && stats.totalCompleted >= 10;
  }, [stats]);

  const certCode = useMemo(() => user ? generateCode(user.id) : '', [user]);

  const handleSignatureUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setAdminSignature(dataUrl);
      localStorage.setItem('passco-admin-signature-image', dataUrl);
      localStorage.setItem('passco-admin-signature-date', new Date().toISOString());
    };
    reader.readAsDataURL(file);
  }, []);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleDownloadCert = useCallback(() => {
    const el = document.getElementById('certificate-content');
    if (!el) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Passco Certificate</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Georgia,serif;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f8f9fa}</style>
      </head><body>${el.outerHTML}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 dark:bg-slate-950">
      <div className="mx-auto max-w-5xl space-y-8">

        {/* Header */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 shadow-lg shadow-amber-500/25">
              <Trophy className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white">Achievements & Awards</h1>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                Your earned badges and certificates of excellence
              </p>
            </div>
          </div>
        </motion.div>

        {/* Overview Stats */}
        <motion.div
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          <OverviewCard icon={Medal} value={earnedBadges.length} total={totalBadges} label="Badges Earned" gradient="from-yellow-400 to-amber-500" />
          <OverviewCard icon={Star} value={stats.avgScore} suffix="%" label="Avg Score" gradient="from-blue-500 to-indigo-600" />
          <OverviewCard icon={Flame} value={stats.totalCompleted} label="Assessments" gradient="from-emerald-500 to-teal-600" />
          <OverviewCard icon={Crown} value={isEligibleForCertificate ? 1 : 0} label="Certificates" gradient="from-violet-500 to-purple-600" />
        </motion.div>

        {/* Badge Progress Bar */}
        <motion.div
          className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
          variants={slideUp}
          initial="hidden"
          animate="visible"
        >
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
              <Award className="h-4 w-4 text-amber-500" /> Overall Progress
            </h2>
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              {earnedBadges.length}/{totalBadges}
            </span>
          </div>
          <div className="h-4 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500"
              initial={{ width: '0%' }}
              animate={{ width: `${totalBadges > 0 ? (earnedBadges.length / totalBadges) * 100 : 0}%` }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {earnedBadges.length === totalBadges
              ? 'Congratulations! You have earned all badges!'
              : `${totalBadges - earnedBadges.length} badge${totalBadges - earnedBadges.length !== 1 ? 's' : ''} remaining to complete your collection`
            }
          </p>
        </motion.div>

        {/* Badge Filter Toggle */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <div className="flex items-center gap-2">
            {(['all', 'earned', 'locked'] as const).map(f => {
              const count = f === 'all' ? totalBadges : f === 'earned' ? earnedBadges.length : totalBadges - earnedBadges.length;
              return (
                <button
                  key={f}
                  onClick={() => setBadgeFilter(f)}
                  className={cn(
                    'rounded-xl px-4 py-2 text-xs font-semibold transition',
                    badgeFilter === f
                      ? 'bg-slate-900 text-white shadow-lg dark:bg-white dark:text-slate-900'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                  )}
                >
                  {f === 'all' ? 'All Badges' : f === 'earned' ? 'Earned' : 'Locked'}
                  <span className="ml-1.5 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] dark:bg-slate-900/30">{count}</span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Badge Categories — all displayed openly */}
        {badgeGroups.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900"
          >
            <Medal className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {badgeFilter === 'earned' ? 'No badges earned yet. Start taking assessments!' : 'No locked badges — you earned them all!'}
            </p>
          </motion.div>
        )}
        {badgeGroups.map(([category, catBadges]) => {
          const catKey = Object.entries(CATEGORY_CONFIG).find(([, v]) => v.label === category)?.[0] || 'class';
          const config = CATEGORY_CONFIG[catKey as BadgeCategory];
          const earnedCount = catBadges.filter(b => b.earned).length;
          const catGradient = config.color === 'text-blue-500' ? 'from-blue-400 to-blue-600'
            : config.color === 'text-emerald-500' ? 'from-emerald-400 to-emerald-600'
            : config.color === 'text-violet-500' ? 'from-violet-400 to-violet-600'
            : config.color === 'text-amber-500' ? 'from-amber-400 to-amber-600'
            : config.color === 'text-orange-500' ? 'from-orange-400 to-orange-600'
            : config.color === 'text-rose-500' ? 'from-rose-400 to-rose-600'
            : config.color === 'text-indigo-500' ? 'from-indigo-400 to-indigo-600'
            : config.color === 'text-yellow-500' ? 'from-yellow-400 to-yellow-600'
            : 'from-slate-400 to-slate-600';

          return (
            <motion.div
              key={category}
              variants={slideUp}
              initial="hidden"
              animate="visible"
              className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
            >
              {/* Category Header */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md', catGradient)}>
                    {catKey === 'class' && <GraduationCap className="h-5 w-5" />}
                    {catKey === 'level' && <Target className="h-5 w-5" />}
                    {catKey === 'subject' && <BookOpen className="h-5 w-5" />}
                    {catKey === 'quiz' && <Zap className="h-5 w-5" />}
                    {catKey === 'mock' && <ClipboardCheck className="h-5 w-5" />}
                    {catKey === 'exam' && <Brain className="h-5 w-5" />}
                    {catKey === 'score' && <TrendingUp className="h-5 w-5" />}
                    {catKey === 'streak' && <Flame className="h-5 w-5" />}
                    {catKey === 'mastery' && <Crown className="h-5 w-5" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white">{category}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {earnedCount}/{catBadges.length} earned
                    </p>
                  </div>
                </div>
                <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={cn('h-full rounded-full bg-gradient-to-r', catGradient)}
                    style={{ width: `${catBadges.length > 0 ? (earnedCount / catBadges.length) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Badge Grid — always visible */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {catBadges.map((badge, i) => (
                  <BadgeCard key={badge.id} badge={badge} index={i} />
                ))}
              </div>
            </motion.div>
          );
        })}

        {/* Certificate Section */}
        <motion.div variants={slideUp} initial="hidden" animate="visible">
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1e3a5f] to-[#0f2340] shadow-lg shadow-blue-900/25">
                <Crown className="h-6 w-6 text-yellow-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">A+ Certificate Award</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {isEligibleForCertificate
                    ? 'Congratulations! You are eligible for the A+ Excellence Certificate.'
                    : `Score 90%+ average with 10+ completed assessments to qualify.`
                  }
                </p>
              </div>
            </div>

            {isEligibleForCertificate ? (
              <>
                {/* Requirements Met */}
                <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <ReqCard icon={TrendingUp} label="Avg Score" value={`${stats.avgScore}%`} met={stats.avgScore >= 90} />
                  <ReqCard icon={ClipboardCheck} label="Assessments" value={`${stats.totalCompleted}`} met={stats.totalCompleted >= 10} />
                  <ReqCard icon={Medal} label="Badges" value={`${earnedBadges.length}`} met={earnedBadges.length >= 5} />
                </div>

                {/* Certificate Actions */}
                <div className="mb-6 flex flex-wrap gap-3">
                  <button
                    onClick={() => setShowCertificate(true)}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#1e3a5f] to-[#0f2340] px-5 py-2.5 text-sm font-semibold text-yellow-400 shadow-lg shadow-blue-900/25 transition hover:shadow-xl"
                  >
                    <Eye className="h-4 w-4" /> Preview Certificate
                  </button>
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    <Printer className="h-4 w-4" /> Print
                  </button>
                  <button
                    onClick={handleDownloadCert}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    <Download className="h-4 w-4" /> Download
                  </button>
                </div>

                {/* Admin Signature Upload */}
                {user?.role === 'admin' && (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Upload className="h-4 w-4 text-slate-500" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {adminSignature ? 'Signature uploaded' : 'Upload Director\'s signature'}
                        </span>
                      </div>
                      <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700">
                        <FileUp className="h-3 w-3" />
                        {adminSignature ? 'Replace' : 'Upload'}
                        <input type="file" accept="image/*" className="hidden" onChange={handleSignatureUpload} />
                      </label>
                    </div>
                    {adminSignature && (
                      <div className="mt-3">
                        <img src={adminSignature} alt="Director Signature" className="h-12 w-auto object-contain opacity-80" />
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-xl bg-slate-50 p-6 text-center dark:bg-slate-800/50">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                  <Lock className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                </div>
                <h3 className="mb-2 text-sm font-bold text-slate-800 dark:text-white">Keep Working!</h3>
                <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
                  Complete more assessments and maintain a high average to unlock your A+ Certificate.
                </p>
                <Link
                  to="/assessment/setup"
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                  Take Assessment <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Certificate Modal */}
      <AnimatePresence>
        {showCertificate && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCertificate(false)}
          >
            <motion.div
              className="no-print relative w-full max-w-3xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowCertificate(false)}
                className="absolute -right-3 -top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-500 shadow-lg transition hover:text-slate-900"
              >
                <X className="h-4 w-4" />
              </button>

              <div id="certificate-content" className="certificate-printable overflow-hidden rounded-xl shadow-2xl" style={{ aspectRatio: '1.414/1', background: 'linear-gradient(145deg, #f8f4eb 0%, #fdfaf3 30%, #f5f0e8 70%, #faf7f0 100%)' }}>
                <div className="relative flex h-full flex-col items-center justify-center p-8 sm:p-12" style={{ fontFamily: 'Georgia, serif' }}>
                  {/* Decorative corners */}
                  <div className="absolute left-3 top-3 h-16 w-16 border-t-2 border-l-2 border-yellow-600/40 sm:left-4 sm:top-4 sm:h-20 sm:w-20" />
                  <div className="absolute right-3 top-3 h-16 w-16 border-t-2 border-r-2 border-yellow-600/40 sm:right-4 sm:top-4 sm:h-20 sm:w-20" />
                  <div className="absolute bottom-3 left-3 h-16 w-16 border-b-2 border-l-2 border-yellow-600/40 sm:bottom-4 sm:left-4 sm:h-20 sm:w-20" />
                  <div className="absolute bottom-3 right-3 h-16 w-16 border-b-2 border-r-2 border-yellow-600/40 sm:bottom-4 sm:right-4 sm:h-20 sm:w-20" />

                  {/* Inner border */}
                  <div className="absolute inset-6 border border-yellow-600/15 sm:inset-8" />

                  {/* Watermark pattern */}
                  <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #1e3a5f 0, #1e3a5f 1px, transparent 1px, transparent 15px)' }} />

                  {/* Top Stars */}
                  <div className="mb-1 flex items-center gap-2">
                    <Star className="h-3 w-3 fill-yellow-500 text-yellow-500 sm:h-4 sm:w-4" />
                    <Star className="h-4 w-4 fill-yellow-500 text-yellow-500 sm:h-5 sm:w-5" />
                    <Star className="h-3 w-3 fill-yellow-500 text-yellow-500 sm:h-4 sm:w-4" />
                  </div>

                  {/* Logo */}
                  <img src="/images/logos/passcologo.svg" alt="Passco" className="mb-3 h-16 w-auto object-contain mix-blend-multiply drop-shadow-sm sm:h-20 md:h-24" />
                  <p className="text-[10px] font-semibold tracking-[0.3em] text-[#1e3a5f] sm:text-xs">PASSCO EDUCATIONAL PLATFORM</p>

                  <div className="my-3 h-px w-48 bg-gradient-to-r from-transparent via-yellow-600/40 to-transparent sm:my-4 sm:w-64" />

                  {/* Title with verified badge */}
                  <div className="mb-1 flex items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-wide text-[#1e3a5f] sm:text-3xl" style={{ fontFamily: 'Georgia, serif' }}>
                      Certificate of Excellence
                    </h1>
                    <BadgeCheck className="h-7 w-7 text-emerald-500 drop-shadow sm:h-8 sm:w-8" />
                  </div>
                  <p className="mb-4 text-xs tracking-widest text-yellow-700 sm:mb-6 sm:text-sm">A+ ACHIEVEMENT AWARD</p>

                  <p className="mb-1 text-[10px] italic text-slate-500 sm:text-xs">This is proudly presented to</p>
                  <h2 className="mb-4 text-xl font-bold text-[#1e3a5f] underline decoration-yellow-600/30 decoration-2 underline-offset-8 sm:text-2xl" style={{ fontFamily: 'Georgia, serif' }}>
                    {user?.name || 'Student Name'}
                  </h2>

                  <div className="mb-4 max-w-md text-center sm:mb-6">
                    <p className="text-[10px] leading-relaxed italic text-slate-600 sm:text-xs">
                      In recognition of outstanding academic performance and dedication to learning.
                      Having achieved an exceptional average score of <strong className="not-italic text-[#1e3a5f]">{stats.avgScore}%</strong> across{' '}
                      <strong className="not-italic text-[#1e3a5f]">{stats.totalCompleted}</strong> assessments,
                      mastering <strong className="not-italic text-[#1e3a5f]">{stats.completedSubjects}</strong> subjects,
                      and earning <strong className="not-italic text-[#1e3a5f]">{earnedBadges.length}</strong> achievement badges.
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="mb-4 grid grid-cols-3 gap-4 sm:mb-6">
                    <CertStat label="Avg Score" value={`${stats.avgScore}%`} />
                    <CertStat label="Assessments" value={`${stats.totalCompleted}`} />
                    <CertStat label="Subjects" value={`${stats.completedSubjects}`} />
                  </div>

                  {/* Verified badge strip */}
                  <div className="mb-4 flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 sm:mb-6 dark:border-emerald-800 dark:bg-emerald-500/10">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600 sm:h-3.5 sm:w-3.5" />
                    <span className="text-[9px] font-semibold tracking-wider text-emerald-700 sm:text-[10px]">OFFICIALLY VERIFIED CERTIFICATE</span>
                    <Gem className="h-2.5 w-2.5 text-emerald-600 sm:h-3 sm:w-3" />
                  </div>

                  <div className="mb-4 h-px w-48 bg-gradient-to-r from-transparent via-yellow-600/30 to-transparent sm:mb-6 sm:w-64" />

                  {/* Signature, Seal, Date */}
                  <div className="mb-4 flex w-full max-w-md items-end justify-between sm:mb-6">
                    {/* Signature */}
                    <div className="flex flex-col items-center">
                      {adminSignature ? (
                        <img src={adminSignature} alt="Signature" className="mb-1 h-12 w-auto object-contain drop-shadow-sm sm:h-16" />
                      ) : (
                        <div className="mb-1 h-12 w-32 border-b-2 border-[#1e3a5f]/30 sm:h-16 sm:w-40" />
                      )}
                      <p className="text-[9px] font-bold text-[#1e3a5f] sm:text-[10px]">Jonathan Ashitey Okoe</p>
                      <p className="text-[7px] tracking-wider text-slate-500 sm:text-[8px]">DIRECTOR, PASSCO</p>
                    </div>

                    {/* Official Seal */}
                    <div className="relative flex h-16 w-16 items-center justify-center sm:h-20 sm:w-20">
                      <div className="absolute inset-0 rounded-full border-2 border-yellow-600/40 bg-gradient-to-br from-yellow-50 via-amber-50 to-yellow-100 shadow-lg" />
                      <div className="absolute inset-1 rounded-full border border-yellow-600/20 sm:inset-1.5" />
                      <div className="relative flex flex-col items-center">
                        <Shield className="h-4 w-4 text-yellow-700 sm:h-5 sm:w-5" />
                        <p className="text-[5px] font-bold tracking-wider text-yellow-800 sm:text-[6px]">PASSCO</p>
                        <p className="text-[4px] tracking-wider text-yellow-700 sm:text-[5px]">OFFICIAL</p>
                      </div>
                    </div>

                    {/* Date */}
                    <div className="flex flex-col items-center">
                      <div className="mb-1 h-12 w-32 border-b-2 border-[#1e3a5f]/30 sm:h-16 sm:w-40" />
                      <p className="text-[9px] font-bold text-[#1e3a5f] sm:text-[10px]">
                        {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                      <p className="text-[7px] tracking-wider text-slate-500 sm:text-[8px]">DATE OF ISSUE</p>
                    </div>
                  </div>

                  {/* Certificate Code */}
                  <div className="flex items-center gap-3 text-[7px] text-slate-400 sm:gap-4 sm:text-[8px]">
                    <span>Certificate Code: <strong className="font-mono text-[#1e3a5f]">{certCode}</strong></span>
                    <span>·</span>
                    <span>Verify at passco.app/verify</span>
                  </div>

                  {/* Bottom Stars */}
                  <div className="mt-3 flex items-center gap-2">
                    <Award className="h-4 w-4 text-yellow-600/60 sm:h-5 sm:w-5" />
                    <p className="text-[8px] tracking-[0.2em] text-slate-400 sm:text-[9px]">CERTIFIED AND AUTHORIZED BY PASSCO</p>
                    <Award className="h-4 w-4 text-yellow-600/60 sm:h-5 sm:w-5" />
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function OverviewCard({ icon: Icon, value, total, suffix, label, gradient }: {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  total?: number;
  suffix?: string;
  label: string;
  gradient: string;
}) {
  return (
    <motion.div
      variants={bounceIn}
      whileHover={{ y: -4, boxShadow: '0 8px 25px rgba(0,0,0,0.08)' }}
      className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className={cn('mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md', gradient)}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-white">
        {value}{suffix || ''}
        {total !== undefined && <span className="text-sm font-normal text-slate-400">/{total}</span>}
      </p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </motion.div>
  );
}

function BadgeCard({ badge, index }: { badge: Badge; index: number }) {
  const tier = TIER_CONFIG[badge.tier];
  const progressPct = badge.maxProgress > 0 ? (badge.progress / badge.maxProgress) * 100 : 0;
  const Icon = badge.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
      whileHover={{ y: -3, boxShadow: '0 8px 25px rgba(0,0,0,0.08)' }}
      className={cn(
        'group relative overflow-hidden rounded-xl border p-4 transition-all',
        badge.earned
          ? cn('border-2', tier.ring, tier.shadow, 'shadow-lg bg-white dark:bg-slate-900')
          : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
      )}
    >
      {/* Earned badge */}
      {badge.earned && (
        <div className={cn('absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br text-white shadow', tier.gradient)}>
          <CheckCircle2 className="h-3 w-3" />
        </div>
      )}

      {/* Locked icon */}
      {!badge.earned && (
        <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
          <Lock className="h-3 w-3 text-slate-400" />
        </div>
      )}

      <div className="mb-3 flex items-center gap-3">
        <div className={cn(
          'flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md',
          badge.earned ? tier.gradient : 'from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600'
        )}>
          {badge.earned ? <Icon className="h-6 w-6" /> : <Icon className="h-6 w-6 opacity-50" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn('text-sm font-bold', badge.earned ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400')}>
            {badge.name}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{badge.description}</p>
        </div>
      </div>

      {/* Tier Label */}
      <div className="mb-2 flex items-center justify-between">
        <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold', tier.bg, tier.text)}>
          {badge.tier === 'diamond' && <Gem className="h-2.5 w-2.5" />}
          {badge.tier === 'platinum' && <Star className="h-2.5 w-2.5" />}
          {badge.tier === 'gold' && <Medal className="h-2.5 w-2.5" />}
          {tier.label}
        </span>
        {badge.earnedDate && (
          <span className="text-[10px] text-slate-400">
            {new Date(badge.earnedDate).toLocaleDateString()}
          </span>
        )}
        {!badge.earned && badge.progress > 0 && (
          <span className="text-[10px] font-medium text-slate-400">
            {badge.progress}/{badge.maxProgress}
          </span>
        )}
      </div>

      {/* Progress Bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <motion.div
          className={cn('h-full rounded-full', badge.earned ? cn('bg-gradient-to-r', tier.gradient) : 'bg-gradient-to-r from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-500')}
          initial={{ width: '0%' }}
          animate={{ width: `${Math.max(progressPct, badge.progress > 0 ? 8 : 0)}%` }}
          transition={{ duration: 0.8, delay: index * 0.04, ease: 'easeOut' }}
        />
      </div>
      {!badge.earned && (
        <p className="mt-1.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">
          {badge.maxProgress - badge.progress > 0 ? `${badge.maxProgress - badge.progress} more to unlock` : 'Complete requirements to earn'}
        </p>
      )}
    </motion.div>
  );
}

function ReqCard({ icon: Icon, label, value, met }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  met: boolean;
}) {
  return (
    <div className={cn(
      'flex items-center gap-3 rounded-xl border p-4 transition',
      met
        ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-500/10'
        : 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50'
    )}>
      <div className={cn(
        'flex h-10 w-10 items-center justify-center rounded-xl',
        met ? 'bg-emerald-100 dark:bg-emerald-500/20' : 'bg-slate-100 dark:bg-slate-800'
      )}>
        <Icon className={cn('h-5 w-5', met ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400')} />
      </div>
      <div>
        <p className={cn('text-lg font-bold', met ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500')}>{value}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      </div>
      {met && <CheckCircle2 className="ml-auto h-5 w-5 text-emerald-500" />}
    </div>
  );
}

function CertStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-lg font-bold text-[#1e3a5f] sm:text-xl">{value}</p>
      <p className="text-[8px] tracking-wider text-slate-500 sm:text-[9px]">{label.toUpperCase()}</p>
    </div>
  );
}
