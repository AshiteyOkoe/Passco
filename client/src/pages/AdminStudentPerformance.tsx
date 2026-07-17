import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { getAllAssessmentResults, getAssessmentStats, getStudents, resolveUploadUrl } from '../services/api';
import type { AssessmentResult } from '../types';
import {
  BarChart3, Users, TrendingUp, Trophy, Target, BookOpen, Download,
  Search, Filter, GraduationCap, Activity, CheckCircle2, XCircle,
  ChevronDown, ClipboardList,
} from 'lucide-react';
import { cn } from '../utils';
import { fadeUp, stagger, bounceIn, slideUp } from '../utils/animations';
import AnimatedSpinner from '../components/AnimatedSpinner';
import { DefaultAvatar } from '../components/DefaultAvatars';
import { CLASS_META, SUBJECT_META, DIFFICULTY_META } from '../data/questionBank';
import type { JHSCategory, SubjectId, DifficultyLevel, AssessmentType } from '../data/questionBank';

type FlatResult = AssessmentResult & { source: 'api' | 'local' };

interface LocalStorageResult {
  id?: string;
  studentName: string;
  classLevel: string;
  subject?: string;
  difficulty: string;
  assessmentType: string;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  percentage: number;
  grade: string;
  passed: boolean;
  timeUsed: number;
  timeLimit: number;
  answers: AssessmentResult['answers'];
  completedAt: string;
}

const GRADE_COLORS: Record<string, string> = {
  'A+': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  'A': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  'B+': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400',
  'B': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400',
  'C': 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  'D': 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400',
  'F': 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400',
};

function getGradeColor(grade: string): string {
  return GRADE_COLORS[grade] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400';
}

function getSubject(result: FlatResult): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = (result as any).subject;
  if (raw && typeof raw === 'string') {
    return raw;
  }
  if (result.answers && result.answers.length > 0) {
    const subjects = result.answers.map((a) => a.subject).filter(Boolean);
    if (subjects.length > 0) {
      const freq = subjects.reduce<Record<string, number>>((acc, s) => {
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      }, {});
      return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
    }
  }
  return '';
}

function buildSubjectLabel(raw: string): string {
  if (!raw) return '—';
  const key = raw.toLowerCase().replace(/\s+/g, '-') as SubjectId;
  return SUBJECT_META[key]?.label ?? raw.charAt(0).toUpperCase() + raw.slice(1);
}

function buildClassLabel(raw: string): string {
  if (!raw) return '—';
  const key = raw.toLowerCase().replace(/\s+/g, '') as JHSCategory;
  if (CLASS_META[key]) return CLASS_META[key].label;
  if (CLASS_META[raw as JHSCategory]) return CLASS_META[raw as JHSCategory].label;
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function buildDifficultyLabel(raw: string): string {
  if (!raw) return '—';
  const key = raw.toLowerCase() as DifficultyLevel;
  return DIFFICULTY_META[key]?.label ?? raw.charAt(0).toUpperCase() + raw.slice(1);
}

function buildAssessmentLabel(raw: string): string {
  if (!raw) return '—';
  const formatted = raw.charAt(0).toUpperCase() + raw.slice(1);
  return formatted;
}

function HorizontalBarChart({ data, title, icon: Icon }: {
  data: Array<{ label: string; value: number; count: number }>;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  return (
    <motion.div
      className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
      variants={slideUp}
      initial="hidden"
      animate="visible"
    >
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
        <Icon className="h-4 w-4 text-indigo-500" /> {title}
      </h3>
      {data.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-400">No data available</p>
      ) : (
        <div className="space-y-3">
          {data.map((d, i) => (
            <motion.div
              key={d.label}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06, duration: 0.35 }}
            >
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400">{d.label}</span>
                <span className="font-medium text-slate-800 dark:text-white">
                  {d.value.toFixed(1)}% <span className="text-slate-400">({d.count})</span>
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <motion.div
                  className={cn(
                    'h-full rounded-full',
                    d.value >= 75 ? 'bg-emerald-500' : d.value >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                  )}
                  initial={{ width: '0%' }}
                  animate={{ width: `${(d.value / maxVal) * 100}%` }}
                  transition={{ duration: 0.8, delay: i * 0.08, ease: 'easeOut' }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function FilterDropdown({ value, onChange, options, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-9 text-sm text-slate-700 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:focus:border-indigo-400"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </div>
  );
}

function MetricCard({ icon: Icon, value, label, color, bg }: {
  icon: React.ComponentType<{ className?: string }>;
  value: string | number;
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <motion.div
      variants={bounceIn}
      whileHover={{ y: -4, boxShadow: '0 8px 25px rgba(0,0,0,0.08)' }}
      className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
    >
      <motion.div
        className={cn('mb-3 flex h-10 w-10 items-center justify-center rounded-xl', bg)}
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
      >
        <Icon className={cn('h-5 w-5', color)} />
      </motion.div>
      <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </motion.div>
  );
}

export default function AdminStudentPerformance() {
  const [results, setResults] = useState<FlatResult[]>([]);
  const [students, setStudents] = useState<Record<string, { avatar: string; gender: string }>>({});
  const [loading, setLoading] = useState(true);
  const [classFilter, setClassFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      let apiResults: FlatResult[] = [];

      try {
        const data = await getAllAssessmentResults();
        const items: AssessmentResult[] = data.results ?? data.data ?? data ?? [];
        apiResults = items.map((r) => ({ ...r, source: 'api' as const }));
      } catch {
        // API may not have data yet
      }

      let localResults: FlatResult[] = [];
      try {
        const raw = localStorage.getItem('assessment-history');
        if (raw) {
          const parsed: LocalStorageResult[] = JSON.parse(raw);
          localResults = parsed.map((r, idx) => ({
            id: r.id ?? `local-${idx}`,
            studentName: r.studentName,
            classLevel: r.classLevel,
            difficulty: r.difficulty,
            assessmentType: r.assessmentType,
            totalQuestions: r.totalQuestions,
            correctAnswers: r.correctAnswers,
            wrongAnswers: r.wrongAnswers,
            percentage: r.percentage,
            grade: r.grade,
            passed: r.passed,
            timeUsed: r.timeUsed,
            timeLimit: r.timeLimit,
            answers: r.answers ?? [],
            completedAt: r.completedAt,
            source: 'local' as const,
            subject: r.subject ?? '',
          } as FlatResult));
        }
      } catch {
        // ignore parse errors
      }

      let studentMap: Record<string, { avatar: string; gender: string }> = {};
      try {
        const { students: studentList } = await getStudents();
        for (const s of studentList) {
          studentMap[s.name.toLowerCase().trim()] = { avatar: s.avatar || '', gender: s.gender || '' };
        }
      } catch {
        // ignore
      }

      if (!cancelled) {
        const merged = [...apiResults];
        const apiIds = new Set(apiResults.map((r) => r.id));
        for (const lr of localResults) {
          if (!apiIds.has(lr.id)) merged.push(lr);
        }
        setResults(merged);
        setStudents(studentMap);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const subjectFilterKey = subjectFilter.toLowerCase().replace(/\s+/g, '-') as SubjectId;
  const classFilterKey = classFilter.toLowerCase().replace(/\s+/g, '') as JHSCategory;
  const difficultyFilterKey = difficultyFilter.toLowerCase() as DifficultyLevel;

  const filtered = useMemo(() => {
    return results.filter((r) => {
      if (classFilter && r.classLevel?.toLowerCase().replace(/\s+/g, '') !== classFilterKey) return false;
      if (subjectFilter) {
        const subj = getSubject(r).toLowerCase().replace(/\s+/g, '-');
        if (subj !== subjectFilterKey) return false;
      }
      if (difficultyFilter && r.difficulty?.toLowerCase() !== difficultyFilterKey) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!r.studentName?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [results, classFilterKey, subjectFilterKey, difficultyFilterKey, search, classFilter, subjectFilter, difficultyFilter, search]);

  const stats = useMemo(() => {
    const total = filtered.length;
    if (total === 0) return { total: 0, avgScore: 0, passRate: 0, uniqueStudents: 0 };
    const avgScore = filtered.reduce((sum, r) => sum + (r.percentage ?? 0), 0) / total;
    const passCount = filtered.filter((r) => r.passed).length;
    const uniqueNames = new Set(filtered.map((r) => r.studentName?.toLowerCase().trim()));
    return { total, avgScore, passRate: (passCount / total) * 100, uniqueStudents: uniqueNames.size };
  }, [filtered]);

  const chartDataByClass = useMemo(() => {
    const map: Record<string, { sum: number; count: number }> = {};
    for (const r of filtered) {
      const label = buildClassLabel(r.classLevel);
      if (!map[label]) map[label] = { sum: 0, count: 0 };
      map[label].sum += r.percentage ?? 0;
      map[label].count += 1;
    }
    return Object.entries(map)
      .map(([label, { sum, count }]) => ({ label, value: sum / count, count }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  const chartDataBySubject = useMemo(() => {
    const map: Record<string, { sum: number; count: number }> = {};
    for (const r of filtered) {
      const label = buildSubjectLabel(getSubject(r));
      if (!map[label]) map[label] = { sum: 0, count: 0 };
      map[label].sum += r.percentage ?? 0;
      map[label].count += 1;
    }
    return Object.entries(map)
      .map(([label, { sum, count }]) => ({ label, value: sum / count, count }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  const chartDataByDifficulty = useMemo(() => {
    const map: Record<string, { sum: number; count: number }> = {};
    for (const r of filtered) {
      const label = buildDifficultyLabel(r.difficulty);
      if (!map[label]) map[label] = { sum: 0, count: 0 };
      map[label].sum += r.percentage ?? 0;
      map[label].count += 1;
    }
    return Object.entries(map)
      .map(([label, { sum, count }]) => ({ label, value: sum / count, count }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  const handleExport = () => {
    const header = 'Student Name,Class,Subject,Difficulty,Assessment Type,Score (%),Grade,Passed,Date';
    const rows = filtered.map((r) => {
      const subj = buildSubjectLabel(getSubject(r));
      const cls = buildClassLabel(r.classLevel);
      const diff = buildDifficultyLabel(r.difficulty);
      const aType = buildAssessmentLabel(r.assessmentType);
      const date = r.completedAt ? new Date(r.completedAt).toLocaleDateString() : '';
      return `"${r.studentName ?? ''}","${cls}","${subj}","${diff}","${aType}",${r.percentage ?? 0},"${r.grade ?? ''}","${r.passed ? 'Yes' : 'No'}","${date}"`;
    });
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student-performance-report.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <AnimatedSpinner label="Loading student performance..." />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <motion.div
        className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
      >
        <div className="flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-indigo-500" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Student Performance</h1>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleExport}
          disabled={filtered.length === 0}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-600 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="h-4 w-4" /> Export CSV
        </motion.button>
      </motion.div>

      <motion.div
        className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        <MetricCard
          icon={ClipboardList}
          value={stats.total}
          label="Total Assessments Taken"
          color="text-indigo-500"
          bg="bg-indigo-50 dark:bg-indigo-500/10"
        />
        <MetricCard
          icon={TrendingUp}
          value={`${stats.avgScore.toFixed(1)}%`}
          label="Average Score"
          color="text-emerald-500"
          bg="bg-emerald-50 dark:bg-emerald-500/10"
        />
        <MetricCard
          icon={Target}
          value={`${stats.passRate.toFixed(1)}%`}
          label="Pass Rate"
          color="text-violet-500"
          bg="bg-violet-50 dark:bg-violet-500/10"
        />
        <MetricCard
          icon={Users}
          value={stats.uniqueStudents}
          label="Total Students"
          color="text-amber-500"
          bg="bg-amber-50 dark:bg-amber-500/10"
        />
      </motion.div>

      <motion.div
        className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        custom={1}
      >
        <FilterDropdown
          value={classFilter}
          onChange={setClassFilter}
          options={Object.entries(CLASS_META).map(([k, v]) => ({ value: k, label: v.label }))}
          placeholder="All Classes"
        />
        <FilterDropdown
          value={subjectFilter}
          onChange={setSubjectFilter}
          options={Object.entries(SUBJECT_META).map(([k, v]) => ({ value: k, label: v.label }))}
          placeholder="All Subjects"
        />
        <FilterDropdown
          value={difficultyFilter}
          onChange={setDifficultyFilter}
          options={Object.entries(DIFFICULTY_META).map(([k, v]) => ({ value: k, label: v.label }))}
          placeholder="All Difficulties"
        />
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-700 transition placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:placeholder:text-slate-500 dark:focus:border-indigo-400"
          />
        </div>
      </motion.div>

      {filtered.length === 0 ? (
        <motion.div
          className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/50 py-16 dark:border-slate-700 dark:bg-slate-900/50"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <ClipboardList className="mb-4 h-12 w-12 text-slate-300 dark:text-slate-600" />
          <h3 className="mb-1 text-lg font-semibold text-slate-700 dark:text-slate-300">No results found</h3>
          <p className="max-w-sm text-center text-sm text-slate-500 dark:text-slate-400">
            There are no assessment results matching your filters. Try adjusting the filters or wait for students to complete assessments.
          </p>
        </motion.div>
      ) : (
        <>
          <motion.div
            className="mb-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            custom={2}
          >
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800">
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Student Name</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Class</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Subject</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Difficulty</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Type</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Score</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Grade</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Result</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const subj = getSubject(r);
                  return (
                    <motion.tr
                      key={r.id ?? `${r.studentName}-${r.completedAt}-${i}`}
                      className="border-b border-slate-50 transition hover:bg-slate-50/50 dark:border-slate-800/50 dark:hover:bg-slate-800/30"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.02, 0.5), duration: 0.25 }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {(() => {
                            const profile = students[r.studentName?.toLowerCase().trim() ?? ''];
                            if (profile?.avatar) {
                              return <img src={resolveUploadUrl(profile.avatar)} alt={r.studentName} className="h-7 w-7 shrink-0 rounded-full object-cover" />;
                            }
                            return <DefaultAvatar gender={profile?.gender as 'male' | 'female' | undefined} className="h-7 w-7 shrink-0" size={28} />;
                          })()}
                          <span className="font-medium text-slate-800 dark:text-white">{r.studentName ?? '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{buildClassLabel(r.classLevel)}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{buildSubjectLabel(subj)}</td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'inline-block rounded-md px-2 py-0.5 text-xs font-medium',
                          r.difficulty?.toLowerCase() === 'beginner' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                            : r.difficulty?.toLowerCase() === 'intermediate' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400'
                        )}>
                          {buildDifficultyLabel(r.difficulty)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{buildAssessmentLabel(r.assessmentType)}</td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'font-bold',
                          (r.percentage ?? 0) >= 75 ? 'text-emerald-600 dark:text-emerald-400'
                            : (r.percentage ?? 0) >= 50 ? 'text-amber-600 dark:text-amber-400'
                              : 'text-rose-600 dark:text-rose-400'
                        )}>
                          {(r.percentage ?? 0).toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-block rounded-md px-2 py-0.5 text-xs font-bold', getGradeColor(r.grade))}>
                          {r.grade ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {r.passed ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                            <CheckCircle2 className="h-3 w-3" /> Passed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-400">
                            <XCircle className="h-3 w-3" /> Failed
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                        {r.completedAt ? new Date(r.completedAt).toLocaleDateString() : '—'}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </motion.div>

          <div className="mb-2 flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
            <Filter className="h-3 w-3" />
            Showing {filtered.length} of {results.length} results
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <HorizontalBarChart data={chartDataByClass} title="Performance by Class" icon={GraduationCap} />
            <HorizontalBarChart data={chartDataBySubject} title="Performance by Subject" icon={BookOpen} />
            <HorizontalBarChart data={chartDataByDifficulty} title="Performance by Difficulty" icon={BarChart3} />
          </div>
        </>
      )}
    </div>
  );
}
