import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { stagger, fadeUp } from '../utils/animations';
import {
  ArrowRight, BarChart3, Sparkles, Shield, Zap,
  BookOpen, Check, Play, Star, Users, Trophy, GraduationCap, RotateCcw, X, Rocket, Flame, Award, ClipboardCheck, TrendingUp, Clock, Medal, Crown, ChevronRight, Landmark
} from 'lucide-react';
import { resolveUploadUrl } from '../services/api';
import { DefaultAvatar } from '../components/DefaultAvatars';
import { SUBJECT_META, getQuestions, shuffleArray, CLASS_META, type SubjectId, type ClassLevel } from '../data/questionBank';

const fadeUpFast = {
  hidden: { opacity: 0, y: 12 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.4, delay: i * 0.06, ease: 'easeOut' },
  }),
};

const ALL_SUBJECTS: SubjectId[] = ['mathematics', 'science', 'english', 'social-studies', 'ict', 'rme', 'creative-arts', 'career-tech'];

function generateDemoQuestions() {
  const selected = shuffleArray(ALL_SUBJECTS).slice(0, 5);
  return selected.map((subject) => {
    const pool = getQuestions('jhs1', 'beginner', 10, subject).filter(
      (q) => q.type === 'multiple-choice' && q.options && q.options.length >= 2,
    );
    if (pool.length === 0) return null;
    const q = pool[Math.floor(Math.random() * pool.length)];
    const options = q.options!;
    const correctIdx = options.findIndex((o) => o === String(q.correctAnswer));
    return { q: q.question, options, correct: correctIdx >= 0 ? correctIdx : 0, subject };
  }).filter(Boolean) as Array<{ q: string; options: string[]; correct: number; subject: SubjectId }>;
}

const encouragements = [
  "You're on a roll! Keep the momentum going.",
  "Every quiz makes you stronger. Let's go!",
  "Your dedication is inspiring. Time to level up!",
  "Champions never stop. Take your next assessment!",
  "Knowledge is your superpower. Keep building it!",
];

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [demoQuestions, setDemoQuestions] = useState(() => generateDemoQuestions());
  const [demoAnswers, setDemoAnswers] = useState<(number | null)[]>(() => new Array(5).fill(null));
  const [demoSubmitted, setDemoSubmitted] = useState(false);

  const handleAction = (path: string) => {
    if (user) navigate('/dashboard');
    else navigate('/login');
  };

  const demoScore: number = demoAnswers.reduce<number>(
    (acc, ans, i) => (ans === demoQuestions[i].correct ? acc + 1 : acc),
    0,
  );

  const resetDemo = () => {
    const fresh = generateDemoQuestions();
    setDemoQuestions(fresh);
    setDemoAnswers(new Array(fresh.length).fill(null));
    setDemoSubmitted(false);
  };

  const encouragement = encouragements[Math.floor(Math.random() * encouragements.length)];

  const heroData = useMemo(() => {
    try {
      const raw = localStorage.getItem('assessment-history');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }, []);

  const heroRecent = useMemo(() => {
    return heroData
      .filter((r: any) => !r.abandoned)
      .sort((a: any, b: any) => b.timestamp - a.timestamp)
      .slice(0, 3);
  }, [heroData]);

  const heroStats = useMemo(() => {
    const completed = heroData.filter((r: any) => !r.abandoned);
    const totalCompleted = completed.length;
    const avgScore = totalCompleted > 0 ? Math.round(completed.reduce((s: number, r: any) => s + r.percentage, 0) / totalCompleted) : 0;

    let rank = 'D';
    if (avgScore >= 90) rank = 'A+';
    else if (avgScore >= 80) rank = 'A';
    else if (avgScore >= 70) rank = 'B';
    else if (avgScore >= 60) rank = 'C';

    const recent5 = completed.slice(0, 5);
    const older5 = completed.slice(5, 10);
    const recentAvg = recent5.length > 0 ? Math.round(recent5.reduce((s: number, r: any) => s + r.percentage, 0) / recent5.length) : 0;
    const olderAvg = older5.length > 0 ? Math.round(older5.reduce((s: number, r: any) => s + r.percentage, 0) / older5.length) : 0;
    const trend = olderAvg > 0 ? recentAvg - olderAvg : 0;

    return { totalCompleted, avgScore, rank, trend };
  }, [heroData]);

  const heroScoreTrend = useMemo(() => {
    const sorted = [...heroData]
      .filter((r: any) => !r.abandoned)
      .sort((a: any, b: any) => a.timestamp - b.timestamp)
      .slice(-8);
    return sorted.map((r: any) => ({ score: r.percentage }));
  }, [heroData]);

  const leaderboardEntries = useMemo(() => {
    const raw = localStorage.getItem('assessment-history');
    if (!raw) return [];
    try {
      const all: any[] = JSON.parse(raw);
      const byName = new Map<string, any[]>();
      all.filter((r: any) => !r.abandoned).forEach((r: any) => {
        const name = r.studentName || 'Student';
        if (!byName.has(name)) byName.set(name, []);
        byName.get(name)!.push(r);
      });
      const entries = Array.from(byName.entries()).map(([name, results]) => {
        const avg = Math.round(results.reduce((s: number, r: any) => s + r.percentage, 0) / results.length);
        const passed = results.filter((r: any) => r.passed).length;
        const badges = Math.floor(passed / 3);
        const latest = results[0] || {};
        return {
          name,
          scores: results.map((r: any) => r.percentage),
          badges,
          avg,
          total: results.length,
          gender: latest.gender || '',
          institution: latest.institution || '',
          classLevel: latest.classLevel || '',
          avatar: latest.avatar || '',
        };
      }).sort((a: any, b: any) => b.avg - a.avg);
      return entries;
    } catch { return []; }
  }, []);

  const getRewardLabel = (avg: number) => {
    if (avg >= 90) return { label: 'Champion', icon: Crown, color: 'text-amber-400' };
    if (avg >= 80) return { label: 'Star Performer', icon: Star, color: 'text-emerald-400' };
    if (avg >= 70) return { label: 'Achiever', icon: Medal, color: 'text-blue-400' };
    if (avg >= 60) return { label: 'Rising Star', icon: TrendingUp, color: 'text-violet-400' };
    return { label: 'Learner', icon: BookOpen, color: 'text-slate-400' };
  };

  const resolveAvatarGender = (): 'male' | 'female' | '' => {
    if (user?.avatar === 'avatar:male') return 'male';
    if (user?.avatar === 'avatar:female') return 'female';
    return (user?.gender as 'male' | 'female') || '';
  };
  const hasCustomAvatar = user?.avatar && user.avatar.startsWith('/uploads/');

  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="relative isolate flex min-h-[80vh] items-center sm:min-h-[70vh] lg:min-h-[80vh]">
        {/* Video Background */}
        <div className="absolute inset-0 -z-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950" />
          <video
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="absolute inset-0 h-full w-full object-cover opacity-60"
          >
            <source src="/videos/designarena_video_w3fzfn5r.mp4" type="video/mp4" />
          </video>
          {/* Dark overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/40 via-slate-950/30 to-indigo-900/40 dark:from-slate-950/50 dark:via-slate-950/40 dark:to-indigo-950/50" />
          {/* Subtle gradient accents */}
          <div className="absolute right-0 top-0 h-[600px] w-[600px] translate-x-1/3 -translate-y-1/4 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="absolute left-0 bottom-0 h-[400px] w-[400px] -translate-x-1/4 translate-y-1/4 rounded-full bg-emerald-500/10 blur-3xl" />
        </div>

        <div className="mx-auto max-w-7xl px-4 pb-16 pt-16 sm:px-6 sm:pb-24 sm:pt-24 lg:px-8 lg:pb-32 lg:pt-32">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <motion.div variants={stagger} initial="hidden" animate="visible">
              {/* Signed-in User Welcome */}
              {user ? (
                <motion.div variants={fadeUp} className="mb-8">
                  <div className="inline-flex items-center gap-4 rounded-2xl border border-white/20 bg-white/10 px-6 py-4 shadow-xl backdrop-blur-md">
                    <div className="relative">
                      {hasCustomAvatar ? (
                        <img src={resolveUploadUrl(user.avatar!)} alt={user.name} className="h-16 w-16 rounded-full object-cover ring-3 ring-white/30" />
                      ) : (
                        <DefaultAvatar gender={resolveAvatarGender()} size={64} className="rounded-full ring-3 ring-white/30" />
                      )}
                      <motion.span
                        animate={{ rotate: [-8, 8, -8] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] text-white ring-2 ring-white/50"
                      >
                        <Flame className="h-3 w-3" />
                      </motion.span>
                    </div>
                    <div>
                      <p className="text-sm text-white/70">Welcome back,</p>
                      <p className="text-xl font-bold text-white">{user.name}</p>
                      <p className="mt-0.5 text-xs text-indigo-200">{encouragement}</p>
                    </div>
                  </div>

                  {user.dateOfBirth && (() => {
                    const today = new Date();
                    const dob = new Date(user.dateOfBirth);
                    if (dob.getUTCMonth() === today.getMonth() && dob.getUTCDate() === today.getDate()) {
                      return (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="mt-4 inline-flex items-center gap-3 rounded-2xl border border-amber-300/30 bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-orange-500/20 px-6 py-4 shadow-xl backdrop-blur-md"
                        >
                          <span className="text-3xl">🎂</span>
                          <div>
                            <p className="text-base font-bold text-white">Happy Birthday, {user.name.split(' ')[0]}!</p>
                            <p className="text-xs text-amber-200">From all of us at Passco, we wish you a wonderful day!</p>
                          </div>
                        </motion.div>
                      );
                    }
                    return null;
                  })()}
                </motion.div>
              ) : (
                <motion.div variants={fadeUp} className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
                  <motion.span
                    animate={{ rotate: [-10, 10, -10] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                  </motion.span>
                  AI-Powered Learning Platform
                </motion.div>
              )}

              <motion.h1
                variants={fadeUp}
                className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl"
              >
                {user ? (
                  <>
                    Ready to Ace Your{' '}
                    <span className="bg-gradient-to-r from-indigo-300 to-emerald-300 bg-clip-text text-transparent">
                      Next Exam?
                    </span>
                  </>
                ) : (
                  <>
                    Turn Your Study Materials Into{' '}
                    <span className="bg-gradient-to-r from-indigo-300 to-emerald-300 bg-clip-text text-transparent">
                      Smart Quizzes
                    </span>
                  </>
                )}
              </motion.h1>
              <motion.p variants={fadeUp} className="mt-4 max-w-lg text-lg text-white/70">
                {user
                  ? "Jump right back in — take an assessment, review your progress, or try a new subject. See how you rank among fellow students!"
                  : 'Prepare for your exams with JHS & SHS assessments across multiple subjects. Track your progress, earn badges, and improve your scores.'}
              </motion.p>
              <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-3">
                {user ? (
                  <>
                    <Link
                      to="/assessment/setup"
                      className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-600 hover:to-indigo-700"
                    >
                      <motion.span
                        animate={{ rotate: [-5, 5, -5] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <Rocket className="h-4 w-4" />
                      </motion.span>
                      Take an Assessment
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                    <Link
                      to="/dashboard"
                      className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/20"
                    >
                      <BarChart3 className="h-4 w-4" />
                      View My Progress
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      to="/register"
                      className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-600 hover:to-indigo-700"
                    >
                      Get Started Free
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                    <button
                      onClick={() => document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' })}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/20"
                    >
                      <motion.span
                        animate={{ rotate: [-8, 8, -8] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <Play className="h-4 w-4" />
                      </motion.span>
                      Try Demo Quiz
                    </button>
                  </>
                )}
              </motion.div>
              {!user && (
                <motion.div variants={fadeUp} className="mt-8 flex items-center gap-6 text-sm text-white/50">
                  <div className="flex items-center gap-2">
                    <motion.span
                      animate={{ rotate: [-10, 10, -10] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0 }}
                    >
                      <Check className="h-4 w-4 text-emerald-400" />
                    </motion.span>
                    No credit card
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.span
                      animate={{ rotate: [-10, 10, -10] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
                    >
                      <Check className="h-4 w-4 text-emerald-400" />
                    </motion.span>
                    Free to start
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.span
                      animate={{ rotate: [-10, 10, -10] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
                    >
                      <Check className="h-4 w-4 text-emerald-400" />
                    </motion.span>
                    Cancel anytime
                  </div>
                </motion.div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-indigo-500/10 to-emerald-500/10 blur-2xl" />

              {user ? (
                /* Stats Card for logged-in users */
                <div className="relative rounded-2xl border border-white/20 bg-white/10 p-5 shadow-xl backdrop-blur-md">
                  <div className="mb-4 flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-300" />
                    <p className="text-xs font-semibold text-white/80">Your Stats</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-white/10 p-3 text-center">
                      <p className="text-2xl font-bold text-white">{heroStats.totalCompleted}</p>
                      <p className="text-[10px] text-white/50">Quizzes Taken</p>
                    </div>
                    <div className="rounded-xl bg-white/10 p-3 text-center">
                      <p className="text-2xl font-bold text-emerald-300">{heroStats.avgScore}%</p>
                      <p className="text-[10px] text-white/50">Avg Score</p>
                    </div>
                    <div className="rounded-xl bg-white/10 p-3 text-center">
                      <p className="text-2xl font-bold text-amber-300">{heroStats.rank}</p>
                      <p className="text-[10px] text-white/50">Grade Rank</p>
                    </div>
                    <div className="rounded-xl bg-white/10 p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <p className="text-2xl font-bold text-indigo-300">{leaderboardEntries.findIndex((e: any) => e.name === user?.name) + 1 || '-'}</p>
                      </div>
                      <p className="text-[10px] text-white/50">Leaderboard Rank</p>
                    </div>
                  </div>
                  {heroScoreTrend.length > 1 && (
                    <div className="mt-3 rounded-xl bg-white/5 p-3">
                      <p className="mb-2 text-[10px] font-semibold text-white/50">Score Trend</p>
                      <div className="flex items-end gap-1">
                        {heroScoreTrend.map((pt: any, idx: number) => (
                          <div key={idx} className="flex-1 rounded-sm" style={{
                            height: `${Math.max((pt.score / 100) * 32, 3)}px`,
                            backgroundColor: pt.score >= 75 ? '#34d399' : pt.score >= 50 ? '#fbbf24' : '#f87171',
                            opacity: 0.6 + (idx / heroScoreTrend.length) * 0.4,
                          }} />
                        ))}
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => navigate('/results-dashboard')}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 py-2.5 text-xs font-semibold text-white/80 transition hover:bg-white/20 hover:text-white"
                  >
                    View Full Results
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                /* Stats Card for non-logged-in users */
                <div className="relative rounded-2xl border border-white/20 bg-white/10 p-5 shadow-xl backdrop-blur-md">
                  <div className="mb-4 flex items-center gap-2">
                    <Rocket className="h-4 w-4 text-indigo-300" />
                    <p className="text-xs font-semibold text-white/80">Why Passco?</p>
                  </div>
                  <div className="space-y-3">
                    {[
                      { icon: ClipboardCheck, label: 'JHS & SHS Assessments', desc: 'Quizzes, mocks & exams across 15+ subjects' },
                      { icon: BarChart3, label: 'Track Your Progress', desc: 'Analytics, trends & performance insights' },
                      { icon: Award, label: 'Earn Badges & Rewards', desc: 'Unlock achievements as you improve' },
                      { icon: Zap, label: 'AI-Powered Questions', desc: 'Generate custom practice questions' },
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-start gap-3 rounded-xl bg-white/5 p-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
                          <item.icon className="h-4 w-4 text-indigo-300" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white">{item.label}</p>
                          <p className="text-[10px] text-white/50">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => navigate('/register')}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-emerald-500 py-2.5 text-xs font-bold text-white shadow-lg transition hover:from-indigo-600 hover:to-emerald-600"
                  >
                    Get Started Free
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Top 10 Student Leaderboard */}
      <section id="leaderboard" className="border-t border-slate-200 bg-white py-20 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <motion.div
            className="mx-auto mb-12 max-w-2xl text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-1.5 text-xs font-semibold text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
              <Trophy className="h-3.5 w-3.5" />
              Leaderboard
            </span>
            <h2 className="mt-4 text-3xl font-bold text-slate-900 sm:text-4xl dark:text-white">
              Top Performing Students
            </h2>
            <p className="mt-3 text-slate-500 dark:text-slate-400">
              See who's leading the pack. Click on any student to view their achievements, performance, and results.
            </p>
          </motion.div>

          {leaderboardEntries.length > 0 ? (
            <div className="space-y-3">
              {leaderboardEntries.slice(0, 10).map((entry: any, i: number) => {
                const rank = i + 1;
                const reward = getRewardLabel(entry.avg);
                const RewardIcon = reward.icon;
                const isCurrentUser = user && entry.name === user.name;

                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                    whileHover={{ scale: 1.01, y: -2 }}
                    className={`group rounded-2xl border bg-white p-4 shadow-sm transition-all hover:shadow-md dark:bg-slate-950 sm:p-5 ${
                      rank <= 3
                        ? 'border-amber-200 dark:border-amber-800/50'
                        : 'border-slate-200 dark:border-slate-800'
                    } ${isCurrentUser ? 'ring-2 ring-indigo-500/30 dark:ring-indigo-400/30' : ''}`}
                  >
                    {/* Top Row: Rank + Profile + Name + Score */}
                    <div className="flex items-center gap-3 sm:gap-4">
                      {/* Rank Badge */}
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold sm:h-10 sm:w-10 sm:text-sm ${
                        rank === 1 ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-md shadow-amber-500/20' :
                        rank === 2 ? 'bg-gradient-to-br from-slate-300 to-slate-500 text-white shadow-md shadow-slate-500/20' :
                        rank === 3 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-md shadow-orange-500/20' :
                        'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                      </div>

                      {/* Profile Image */}
                      <div className="relative shrink-0">
                        {entry.avatar && entry.avatar.startsWith('/uploads/') ? (
                          <img
                            src={resolveUploadUrl(entry.avatar)}
                            alt={entry.name}
                            className="h-11 w-11 rounded-full object-cover ring-2 ring-white dark:ring-slate-800 sm:h-12 sm:w-12"
                          />
                        ) : (
                          <DefaultAvatar
                            gender={entry.gender as 'male' | 'female' || undefined}
                            size={48}
                            className="h-11 w-11 rounded-full ring-2 ring-white dark:ring-slate-800 sm:h-12 sm:w-12"
                          />
                        )}
                        <div className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-slate-950 ${
                          entry.gender === 'female' ? 'bg-pink-400' : 'bg-blue-400'
                        }`} />
                      </div>

                      {/* Name + Profile Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-bold truncate sm:text-base ${
                            isCurrentUser ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-900 dark:text-white'
                          }`}>
                            {entry.name}
                          </p>
                          {isCurrentUser && (
                            <span className="shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                              You
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          {entry.classLevel && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                              <GraduationCap className="h-2.5 w-2.5" />
                              {CLASS_META[entry.classLevel as ClassLevel]?.label || entry.classLevel}
                            </span>
                          )}
                          {entry.institution && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
                              <Landmark className="h-2.5 w-2.5 shrink-0" />
                              <span className="truncate max-w-[120px] sm:max-w-[200px]">{entry.institution}</span>
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <RewardIcon className={`h-3 w-3 ${reward.color}`} />
                            <span className="text-xs text-slate-500 dark:text-slate-400">{reward.label}</span>
                          </div>
                          <span className="text-slate-300 dark:text-slate-700">·</span>
                          <span className="text-xs text-slate-400 dark:text-slate-500">{entry.total} quiz{entry.total !== 1 ? 'zes' : ''}</span>
                          <span className="text-slate-300 dark:text-slate-700">·</span>
                          <div className="flex items-center gap-1">
                            <Award className="h-3 w-3 text-amber-400" />
                            <span className="text-xs text-slate-400 dark:text-slate-500">{entry.badges} badge{entry.badges !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                      </div>

                      {/* Score */}
                      <div className="text-right shrink-0">
                        <p className={`text-xl font-bold sm:text-2xl ${
                          entry.avg >= 75 ? 'text-emerald-600 dark:text-emerald-400' :
                          entry.avg >= 50 ? 'text-amber-600 dark:text-amber-400' :
                          'text-rose-600 dark:text-rose-400'
                        }`}>
                          {entry.avg}%
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">avg score</p>
                      </div>
                    </div>

                    {/* Performance Bar */}
                    <div className="mt-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-900 sm:mt-4 sm:p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Recent Performance</p>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          {entry.scores.filter((s: number) => s >= 70).length}/{entry.scores.length} passed
                        </span>
                      </div>
                      <div className="flex items-end gap-1">
                        {entry.scores.slice(-10).map((s: number, j: number) => (
                          <div key={j} className="flex-1 flex flex-col items-center gap-0.5">
                            <div
                              className="w-full rounded-sm transition-all"
                              style={{
                                height: `${Math.max((s / 100) * 40, 4)}px`,
                                backgroundColor: s >= 75 ? '#34d399' : s >= 50 ? '#fbbf24' : '#f87171',
                                opacity: 0.7 + (j / 10) * 0.3,
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Click Actions — visible on hover, always visible on mobile */}
                    <div className="mt-3 flex items-center gap-2 sm:mt-4 sm:opacity-0 sm:transition sm:group-hover:opacity-100">
                      <button
                        onClick={() => user ? navigate('/achievements') : navigate('/login')}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20"
                      >
                        <Award className="h-3.5 w-3.5" />
                        Achievements
                      </button>
                      <button
                        onClick={() => user ? navigate('/analytics/performance') : navigate('/login')}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20"
                      >
                        <BarChart3 className="h-3.5 w-3.5" />
                        Performance
                      </button>
                      <button
                        onClick={() => user ? navigate('/results-dashboard') : navigate('/login')}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
                      >
                        <TrendingUp className="h-3.5 w-3.5" />
                        Results
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-12 text-center dark:border-slate-800 dark:bg-slate-950"
            >
              <Trophy className="mx-auto mb-4 h-12 w-12 text-slate-300 dark:text-slate-700" />
              <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">No rankings yet</p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Be the first to take an assessment and claim the top spot!</p>
              <button
                onClick={() => user ? navigate('/assessment/setup') : navigate('/login')}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                <Play className="h-4 w-4" />
                Take an Assessment
              </button>
            </motion.div>
          )}

          {/* CTA */}
          {!user && leaderboardEntries.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-8 rounded-2xl bg-gradient-to-r from-indigo-500 to-emerald-500 p-6 text-center shadow-lg sm:p-8"
            >
              <p className="text-lg font-bold text-white sm:text-xl">
                Join {leaderboardEntries.length} student{leaderboardEntries.length !== 1 ? 's' : ''} already competing!
              </p>
              <p className="mt-1 text-sm text-white/80">Sign up free to claim your spot on the leaderboard</p>
              <button
                onClick={() => navigate('/register')}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-indigo-600 shadow-lg transition hover:bg-slate-50"
              >
                Get Started Free
                <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </div>
      </section>

      {/* Demo Quiz Preview - Only for non-logged-in users */}
      {!user && (
      <section id="demo" className="border-t border-slate-200 bg-slate-50/50 py-20 dark:border-slate-800 dark:bg-slate-950/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            className="mx-auto mb-12 max-w-2xl text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-semibold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <Play className="h-3.5 w-3.5" />
              Try It Free
            </span>
            <h2 className="mt-4 text-3xl font-bold text-slate-900 sm:text-4xl dark:text-white">
              Sample Quiz Preview
            </h2>
            <p className="mt-3 text-slate-500 dark:text-slate-400">
              No account needed. Try a sample quiz to see how it works.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-white" />
                  <span className="font-semibold text-white">Sample Quiz</span>
                </div>
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white">{demoQuestions.length} Questions</span>
              </div>
            </div>
            <div className="p-6">
              {!demoSubmitted ? (
                <>
                  <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                    Answer all questions then hit Submit to see your score.
                  </p>
                  <div className="space-y-4">
                    {demoQuestions.map((item, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                        className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"
                      >
                        <p className="mb-3 text-sm font-semibold text-slate-800 dark:text-white">
                          {i + 1}. {item.q}
                        </p>
                        <span className="mb-2 inline-block rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                          {SUBJECT_META[item.subject]?.icon} {SUBJECT_META[item.subject]?.label}
                        </span>
                        <div className="space-y-2">
                          {item.options.map((opt, j) => (
                            <label
                              key={j}
                              onClick={() => {
                                const next = [...demoAnswers];
                                next[i] = j;
                                setDemoAnswers(next);
                              }}
                              className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition ${
                                demoAnswers[i] === j
                                  ? 'border-indigo-400 bg-indigo-50 dark:border-indigo-500 dark:bg-indigo-500/15'
                                  : 'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-700 dark:hover:border-indigo-600 dark:hover:bg-indigo-500/10'
                              }`}
                            >
                              <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition ${
                                demoAnswers[i] === j
                                  ? 'border-indigo-500 bg-indigo-500'
                                  : 'border-slate-300 dark:border-slate-600'
                              }`}>
                                {demoAnswers[i] === j && (
                                  <div className="h-1.5 w-1.5 rounded-full bg-white" />
                                )}
                              </div>
                              {opt}
                            </label>
                          ))}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <div className="mt-6 text-center">
                    <button
                      onClick={() => {
                        if (demoAnswers.every((a) => a !== null)) setDemoSubmitted(true);
                      }}
                      disabled={demoAnswers.some((a) => a === null)}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-600 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" />
                      Submit Answers
                    </button>
                    {demoAnswers.some((a) => a === null) && (
                      <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">Please answer all questions before submitting.</p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-6 text-center">
                    <div className={`mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full text-3xl font-bold text-white ${
                      demoScore === demoQuestions.length
                        ? 'bg-gradient-to-br from-emerald-400 to-emerald-600'
                        : demoScore >= demoQuestions.length / 2
                          ? 'bg-gradient-to-br from-amber-400 to-amber-600'
                          : 'bg-gradient-to-br from-rose-400 to-rose-600'
                    }`}>
                      {demoScore}/{demoQuestions.length}
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {demoScore === demoQuestions.length
                        ? 'Perfect Score!'
                        : demoScore >= demoQuestions.length / 2
                          ? 'Good Job!'
                          : 'Keep Practicing!'}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {demoScore === demoQuestions.length
                        ? 'You nailed every question. Ready for the real thing?'
                        : `You got ${demoScore} out of ${demoQuestions.length} correct.`}
                    </p>
                  </div>
                  <div className="space-y-3">
                    {demoQuestions.map((item, i) => {
                      const isCorrect = demoAnswers[i] === item.correct;
                      return (
                        <div
                          key={i}
                          className={`rounded-xl border p-4 ${
                            isCorrect
                              ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-500/10'
                              : 'border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-500/10'
                          }`}
                        >
                          <div className="mb-2 flex items-start gap-2">
                            {isCorrect ? (
                              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                            ) : (
                              <X className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                            )}
                            <p className="text-sm font-semibold text-slate-800 dark:text-white">
                              {i + 1}. {item.q}
                            </p>
                          </div>
                          {!isCorrect && (
                            <div className="ml-6 space-y-1">
                              <p className="text-xs text-rose-600 dark:text-rose-400">
                                Your answer: {item.options[demoAnswers[i] as number]}
                              </p>
                              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                Correct answer: {item.options[item.correct]}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    <button
                      onClick={resetDemo}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Try Again
                    </button>
                    <button
                      onClick={() => navigate(user ? '/dashboard' : '/register')}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-600 hover:to-indigo-700"
                    >
                      {user ? 'Go to Dashboard' : 'Create Account for Full Access'}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </section>
      )}

      {/* How It Works Summary */}
      <section className="border-t border-slate-200 bg-white py-20 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            className="mx-auto mb-16 max-w-2xl text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
          >
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl dark:text-white">
              How It Works
            </h2>
            <p className="mt-3 text-slate-500 dark:text-slate-400">
              Three simple steps to prepare for your exams and track your progress.
            </p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              { step: '01', icon: GraduationCap, title: 'Pick Your Class & Subject', desc: 'Choose your JHS class level (1–3), select a subject, and pick a difficulty — Quiz, Mock, or full Examination.' },
              { step: '02', icon: ClipboardCheck, title: 'Take the Assessment', desc: 'Answer timed multiple-choice questions curated by educators. Each test covers real syllabus content.' },
              { step: '03', icon: Award, title: 'Get Results & Badges', desc: 'See your score instantly with grade breakdowns. Earn badges as you improve and climb the leaderboard.' },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="relative text-center"
              >
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-2xl font-bold text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400">
                  <motion.span
                    animate={{ rotate: [-8, 8, -8] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
                    className="inline-block"
                  >
                    {item.step}
                  </motion.span>
                </div>
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-500/10">
                  <motion.div
                    animate={{ rotate: [-5, 5, -5] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 + 0.2 }}
                  >
                    <item.icon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </motion.div>
                </div>
                <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-white">{item.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-t border-slate-200 bg-gradient-to-br from-indigo-500 to-indigo-700 py-16 dark:from-indigo-600 dark:to-indigo-900">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 text-center sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Users, value: '5,000+', label: 'Active Students' },
              { icon: ClipboardCheck, value: '10,000+', label: 'Assessments Taken' },
              { icon: Award, value: '50,000+', label: 'Questions Answered' },
              { icon: Trophy, value: '92%', label: 'Average Score' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <motion.div
                  animate={{ rotate: [-5, 5, -5] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
                  className="inline-block"
                >
                  <stat.icon className="mx-auto mb-3 h-8 w-8 text-indigo-200" />
                </motion.div>
                <p className="text-3xl font-bold text-white">{stat.value}</p>
                <p className="text-sm text-indigo-200">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-200 bg-white py-20 dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold text-slate-900 sm:text-4xl dark:text-white">
              {user ? "Don't Stop Now — Keep Growing!" : 'Ready to Start Learning Smarter?'}
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-slate-500 dark:text-slate-400">
              {user
                ? `${user.name}, you're doing great. Take your next assessment and keep pushing your limits!`
                : 'Join thousands of students who are already using Passco to prepare for their exams.'}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                to={user ? '/assessment/setup' : '/register'}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-600 hover:to-indigo-700"
              >
                {user ? (
                  <>
                    <Rocket className="h-4 w-4" />
                    Take an Assessment
                  </>
                ) : (
                  'Get Started Free'
                )}
                <ArrowRight className="h-4 w-4" />
              </Link>
              {!user && (
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-8 py-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Contact Sales
                </Link>
              )}
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
