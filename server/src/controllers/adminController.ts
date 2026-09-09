import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../types';
import { logAuditEvent } from '../services/auditService';
import { resolveAvatarUrl } from '../utils/avatar';

export async function getDashboardStats(req: AuthRequest, res: Response): Promise<void> {
  try {
    const [studentsCount, docsCount, questionsCount, pendingCount, quizzesCount, resultsCount] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'student'),
      supabase.from('documents').select('id', { count: 'exact', head: true }),
      supabase.from('questions').select('id', { count: 'exact', head: true }),
      supabase.from('questions').select('id', { count: 'exact', head: true }).eq('approved', false),
      supabase.from('quizzes').select('id', { count: 'exact', head: true }),
      supabase.from('results').select('id', { count: 'exact', head: true }),
    ]);

    const { data: recentDocs } = await supabase
      .from('documents')
      .select('id, original_name, status, created_at, user_id')
      .order('created_at', { ascending: false })
      .limit(5);

    const docsWithUsers = await Promise.all(
      (recentDocs || []).map(async (doc) => {
        const { data: user } = await supabase.from('users').select('name').eq('id', doc.user_id).single();
        return {
          id: doc.id,
          name: doc.original_name,
          uploadedBy: user?.name || 'Unknown',
          status: doc.status,
          createdAt: doc.created_at,
        };
      })
    );

    const { data: recentResults } = await supabase
      .from('results')
      .select('id, score, completed_at, user_id, quiz_id')
      .order('completed_at', { ascending: false })
      .limit(5);

    const resultsWithNames = await Promise.all(
      (recentResults || []).map(async (r) => {
        const [{ data: user }, { data: quiz }] = await Promise.all([
          supabase.from('users').select('name').eq('id', r.user_id).single(),
          supabase.from('quizzes').select('title').eq('id', r.quiz_id).single(),
        ]);
        return {
          id: r.id,
          studentName: user?.name || 'Unknown',
          quizTitle: quiz?.title || 'Unknown',
          score: r.score,
          completedAt: r.completed_at,
        };
      })
    );

    res.json({
      stats: {
        totalStudents: studentsCount.count || 0,
        totalDocuments: docsCount.count || 0,
        totalQuestions: questionsCount.count || 0,
        pendingQuestions: pendingCount.count || 0,
        totalQuizzes: quizzesCount.count || 0,
        totalResults: resultsCount.count || 0,
      },
      recentDocuments: docsWithUsers,
      recentResults: resultsWithNames,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard stats' });
  }
}

export async function getStudents(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { data: students } = await supabase
      .from('users')
      .select('id, name, email, institution, grade_level, avatar, gender, created_at')
      .eq('role', 'student')
      .order('created_at', { ascending: false });

    const studentsWithStats = await Promise.all(
      (students || []).map(async (student) => {
        const [resultCount, avgResult, docCount] = await Promise.all([
          supabase.from('results').select('id', { count: 'exact', head: true }).eq('user_id', student.id),
          supabase.from('results').select('score').eq('user_id', student.id),
          supabase.from('documents').select('id', { count: 'exact', head: true }).eq('user_id', student.id),
        ]);

        const scores = (avgResult.data || []).map((r) => r.score);
        const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

        return {
          id: student.id,
          name: student.name,
          email: student.email,
          institution: student.institution,
          gradeLevel: student.grade_level,
          avatar: resolveAvatarUrl(student.avatar) || '',
          gender: student.gender || '',
          quizzesTaken: resultCount.count || 0,
          avgScore,
          documentsUploaded: docCount.count || 0,
          createdAt: student.created_at,
        };
      })
    );

    res.json({ students: studentsWithStats });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ message: 'Failed to fetch students' });
  }
}

export async function getFullAnalytics(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { data: results } = await supabase.from('results').select('score, completed_at');

    const totalQuizzes = results?.length || 0;
    const averageScore = totalQuizzes > 0
      ? Math.round(results!.reduce((sum, r) => sum + r.score, 0) / totalQuizzes)
      : 0;

    const scoreDistribution = [
      { range: '0-25', count: 0 },
      { range: '25-50', count: 0 },
      { range: '50-60', count: 0 },
      { range: '60-75', count: 0 },
      { range: '75-90', count: 0 },
      { range: '90-100', count: 0 },
    ];

    for (const r of results || []) {
      if (r.score < 25) scoreDistribution[0].count++;
      else if (r.score < 50) scoreDistribution[1].count++;
      else if (r.score < 60) scoreDistribution[2].count++;
      else if (r.score < 75) scoreDistribution[3].count++;
      else if (r.score < 90) scoreDistribution[4].count++;
      else scoreDistribution[5].count++;
    }

    const dayMap: Record<string, { count: number; totalScore: number }> = {};
    for (const r of results || []) {
      const day = r.completed_at?.slice(0, 10) || 'unknown';
      if (!dayMap[day]) dayMap[day] = { count: 0, totalScore: 0 };
      dayMap[day].count++;
      dayMap[day].totalScore += r.score;
    }

    const resultsByDay = Object.entries(dayMap)
      .map(([date, data]) => ({
        date,
        count: data.count,
        avgScore: Math.round(data.totalScore / data.count),
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 30);

    res.json({
      totalQuizzes,
      averageScore,
      scoreDistribution,
      resultsByDay,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: 'Failed to fetch analytics' });
  }
}

export async function getStudentDetail(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { data: student } = await supabase
      .from('users')
      .select('id, name, email, institution, grade_level, created_at')
      .eq('id', req.params.id)
      .single();

    if (!student) {
      res.status(404).json({ message: 'Student not found' });
      return;
    }

    const { data: documents } = await supabase
      .from('documents')
      .select('id, original_name, status, file_size, created_at')
      .eq('user_id', student.id)
      .order('created_at', { ascending: false });

    const { data: resultsRaw } = await supabase
      .from('results')
      .select('id, score, total_questions, correct_count, incorrect_count, skipped_count, time_taken, completed_at, quiz_id')
      .eq('user_id', student.id)
      .order('completed_at', { ascending: false });

    const resultsWithQuiz = await Promise.all(
      (resultsRaw || []).map(async (r) => {
        const { data: quiz } = await supabase.from('quizzes').select('title, questions').eq('id', r.quiz_id).single();
        return {
          id: r.id,
          quizTitle: quiz?.title || 'Unknown',
          score: r.score,
          totalQuestions: r.total_questions,
          correctCount: r.correct_count,
          incorrectCount: r.incorrect_count,
          skippedCount: r.skipped_count,
          timeTaken: r.time_taken,
          completedAt: r.completed_at,
        };
      })
    );

    const { count: questionsCount } = await supabase
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', student.id);

    const avgScore = resultsWithQuiz.length > 0
      ? Math.round(resultsWithQuiz.reduce((sum, r) => sum + r.score, 0) / resultsWithQuiz.length)
      : 0;

    res.json({
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        institution: student.institution,
        gradeLevel: student.grade_level,
        createdAt: student.created_at,
      },
      documents: (documents || []).map((doc) => ({
        id: doc.id,
        name: doc.original_name,
        status: doc.status,
        fileSize: doc.file_size,
        createdAt: doc.created_at,
      })),
      results: resultsWithQuiz,
      questionsCreated: questionsCount || 0,
      stats: {
        documentsUploaded: documents?.length || 0,
        quizzesTaken: resultsWithQuiz.length,
        questionsCreated: questionsCount || 0,
        avgScore,
      },
    });
  } catch (error) {
    console.error('Get student detail error:', error);
    res.status(500).json({ message: 'Failed to fetch student details' });
  }
}

export async function deleteStudent(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { data: student } = await supabase
      .from('users')
      .select('id')
      .eq('id', req.params.id)
      .single();

    if (!student) {
      res.status(404).json({ message: 'Student not found' });
      return;
    }

    await supabase.from('documents').delete().eq('user_id', student.id);
    await supabase.from('questions').delete().eq('created_by', student.id);
    await supabase.from('results').delete().eq('user_id', student.id);
    await supabase.from('users').delete().eq('id', student.id);

    await logAuditEvent({
      userId: req.user!.id,
      action: 'delete_student',
      entityType: 'user',
      entityId: student.id,
      details: { deletedBy: req.user!.email },
      ipAddress: req.ip as string,
    });

    res.json({ message: 'Student and all associated data deleted' });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({ message: 'Failed to delete student' });
  }
}

export async function getStudentResults(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { data: student } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', req.params.id)
      .single();

    if (!student) {
      res.status(404).json({ message: 'Student not found' });
      return;
    }

    const { data: resultsRaw } = await supabase
      .from('results')
      .select('id, score, total_questions, correct_count, incorrect_count, skipped_count, time_taken, completed_at, quiz_id')
      .eq('user_id', student.id)
      .order('completed_at', { ascending: false });

    const resultsWithQuiz = await Promise.all(
      (resultsRaw || []).map(async (r) => {
        const { data: quiz } = await supabase
          .from('quizzes')
          .select('id, title, difficulty')
          .eq('id', r.quiz_id)
          .single();

        const { count: totalQ } = await supabase
          .from('quiz_questions')
          .select('question_id', { count: 'exact', head: true })
          .eq('quiz_id', r.quiz_id);

        return {
          id: r.id,
          quiz: {
            id: quiz?.id || r.quiz_id,
            title: quiz?.title || 'Unknown',
            difficulty: quiz?.difficulty || 'intermediate',
            totalQuestions: totalQ || r.total_questions,
          },
          score: r.score,
          totalQuestions: r.total_questions,
          correctCount: r.correct_count,
          incorrectCount: r.incorrect_count,
          skippedCount: r.skipped_count,
          timeTaken: r.time_taken,
          completedAt: r.completed_at,
        };
      })
    );

    res.json({
      student: { id: student.id, name: student.name, email: student.email },
      results: resultsWithQuiz,
    });
  } catch (error) {
    console.error('Get student results error:', error);
    res.status(500).json({ message: 'Failed to fetch student results' });
  }
}

const SUBJECT_KEYS = ['mathematics', 'science', 'english', 'social-studies', 'ict', 'rme', 'creative-arts', 'career-tech'];

const SUBJECT_LABEL_TO_KEY: Record<string, string> = {
  mathematics: 'mathematics', maths: 'mathematics', math: 'mathematics',
  science: 'science',
  'english language': 'english', english: 'english',
  'social studies': 'social-studies',
  ict: 'ict', 'information technology': 'ict',
  'religious and moral education': 'rme', 'religious & moral education': 'rme', rme: 'rme',
  'creative arts and design': 'creative-arts', 'creative arts': 'creative-arts',
  'career technology': 'career-tech',
};

function normalizeSubject(value: string): string {
  const trimmed = (value || '').trim();
  const lower = trimmed.toLowerCase();
  if (SUBJECT_KEYS.includes(lower)) return lower;
  return SUBJECT_LABEL_TO_KEY[lower] || trimmed;
}

function normalizeClass(value: string): string {
  return (value || '').toLowerCase().replace(/\s+/g, '');
}

export async function getSubjectQuestionCounts(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const questions = await fetchAllQuestionRows();

    const counts: Record<string, number> = {};
    const byClass: Record<string, Record<string, number>> = {};

    for (const q of questions) {
      const subj = normalizeSubject(q.subject || '');
      const cls = normalizeClass(q.class_level) || 'unassigned';
      if (!subj) continue;
      counts[subj] = (counts[subj] || 0) + 1;
      byClass[cls] = byClass[cls] || {};
      byClass[cls][subj] = (byClass[cls][subj] || 0) + 1;
    }

    res.json({ counts, byClass });
  } catch (error) {
    console.error('Get subject question counts error:', error);
    res.status(500).json({ message: 'Failed to fetch subject question counts' });
  }
}

export async function getAllQuizzes(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { data: quizzes } = await supabase
      .from('quizzes')
      .select('*')
      .order('created_at', { ascending: false });

    const quizzesWithStats = await Promise.all(
      (quizzes || []).map(async (quiz) => {
        const [{ data: creator }, { count: resultCount }] = await Promise.all([
          supabase.from('users').select('name, email').eq('id', quiz.created_by).single(),
          supabase.from('results').select('id', { count: 'exact', head: true }).eq('quiz_id', quiz.id),
        ]);

        const { data: qqRows } = await supabase.from('quiz_questions').select('question_id').eq('quiz_id', quiz.id);

        return {
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          difficulty: quiz.difficulty,
          timeLimit: quiz.time_limit,
          isActive: quiz.is_active,
          createdBy: {
            id: quiz.created_by,
            name: creator?.name || 'Unknown',
            email: creator?.email || '',
          },
          questionsCount: qqRows?.length || 0,
          resultCount: resultCount || 0,
          createdAt: quiz.created_at,
        };
      })
    );

    res.json({ quizzes: quizzesWithStats });
  } catch (error) {
    console.error('Get all quizzes error:', error);
    res.status(500).json({ message: 'Failed to fetch quizzes' });
  }
}

export async function getAllDocuments(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { data: documents } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false });

    const docsWithStats = await Promise.all(
      (documents || []).map(async (doc) => {
        const [{ data: user }, { count: questionCount }] = await Promise.all([
          supabase.from('users').select('name, email').eq('id', doc.user_id).single(),
          supabase.from('questions').select('id', { count: 'exact', head: true }).eq('document_id', doc.id),
        ]);

        return {
          id: doc.id,
          name: doc.original_name,
          mimeType: doc.mime_type,
          fileSize: doc.file_size,
          status: doc.status,
          topics: doc.topics,
          uploadedBy: {
            id: doc.user_id,
            name: user?.name || 'Unknown',
            email: user?.email || '',
          },
          questionCount: questionCount || 0,
          createdAt: doc.created_at,
        };
      })
    );

    res.json({ documents: docsWithStats });
  } catch (error) {
    console.error('Get all documents error:', error);
    res.status(500).json({ message: 'Failed to fetch documents' });
  }
}

/* ------------------------------------------------------------------ *
 * Admin Command Center — single aggregated payload for the landing    *
 * ------------------------------------------------------------------ */

const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

function percentChange(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function monthKey(d: string): string {
  return (d || '').slice(0, 7);
}

async function fetchAllQuestionRows(): Promise<Array<{ subject: string; class_level: string }>> {
  const allRows: Array<{ subject: string; class_level: string }> = [];
  let from = 0;
  let chunk: Array<{ subject: string; class_level: string }> = [];
  do {
    const { data } = await supabase.from('questions').select('subject, class_level').range(from, from + 999);
    chunk = (data as Array<{ subject: string; class_level: string }>) || [];
    allRows.push(...chunk);
    from += chunk.length;
  } while (chunk.length === 1000);
  return allRows;
}

const SUBJECT_DISPLAY: Record<string, string> = {
  mathematics: 'Mathematics',
  english: 'English',
  science: 'Science',
  'social-studies': 'Social Studies',
  ict: 'ICT',
  rme: 'RME',
  'creative-arts': 'Creative Arts',
  'career-tech': 'Career Tech',
};

function buildDayBuckets(range: number): Record<string, { attempts: number; students: Set<string> }> {
  const buckets: Record<string, { attempts: number; students: Set<string> }> = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = range - 1; i >= 0; i--) {
    const date = new Date(today.getTime() - i * DAY_MS).toISOString().slice(0, 10);
    buckets[date] = { attempts: 0, students: new Set() };
  }
  return buckets;
}

export async function getCommandCenter(req: AuthRequest, res: Response): Promise<void> {
  try {
    const range = Math.min(Math.max(parseInt(String(req.query.range || '30'), 10) || 30, 1), 365);

    const [
      { count: totalStudents },
      { count: totalResults },
      { count: totalQuestions },
      { count: totalDocuments },
      { count: pendingQuestions },
      { count: activeSubscriptions },
    ] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'student'),
      supabase.from('results').select('id', { count: 'exact', head: true }),
      supabase.from('questions').select('id', { count: 'exact', head: true }),
      supabase.from('documents').select('id', { count: 'exact', head: true }),
      supabase.from('questions').select('id', { count: 'exact', head: true }).eq('approved', false),
      supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    ]);

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const prevMonthStart = new Date(monthStart.getTime() - DAY_MS * 31);
    prevMonthStart.setDate(1);

    const [
      { data: newStudents },
      { data: resultsForActivity },
      { data: resultsCount30 },
      { data: resultsCountPrev },
      { data: questionsRecent },
      { data: docsRecent },
      { data: payments },
      { data: subscriptions },
      { data: documents },
      { data: assessmentRaw },
      { data: questionBankRaw },
      { data: inProgressAttempts },
    ] = await Promise.all([
      supabase.from('users').select('id').eq('role', 'student').gte('created_at', daysAgoIso(30)),
      supabase.from('results').select('user_id, completed_at').gte('completed_at', daysAgoIso(range)),
      supabase.from('results').select('id').gte('completed_at', monthStart.toISOString()),
      supabase.from('results').select('id').lt('completed_at', monthStart.toISOString()).gte('completed_at', prevMonthStart.toISOString()),
      supabase.from('questions').select('id').gte('created_at', daysAgoIso(7)),
      supabase.from('documents').select('id').gte('created_at', daysAgoIso(30)),
      supabase.from('payments').select('amount, status, created_at'),
      supabase.from('subscriptions').select('status, created_at'),
      supabase.from('documents').select('id, user_id, original_name, status, created_at'),
      supabase.from('assessment_results').select('user_id, subject, percentage, passed, time_spent, created_at'),
      (async () => ({ data: await fetchAllQuestionRows() }))(),
      supabase.from('quiz_attempts').select('id'),
    ]);

    const totalStudentsN = totalStudents || 0;
    const totalResultsN = totalResults || 0;
    const totalQuestionsN = totalQuestions || 0;

    // KPI delta labels (trend indicators)
    const kpis = {
      students: { value: totalStudentsN, delta: percentChange(newStudents?.length || 0, totalStudentsN - (newStudents?.length || 0)) },
      results: {
        value: totalResultsN,
        delta: percentChange(resultsCount30?.length || 0, resultsCountPrev?.length || 0),
      },
      questions: { value: totalQuestionsN, delta: percentChange(questionsRecent?.length || 0, totalQuestionsN - (questionsRecent?.length || 0)) },
      documents: { value: totalDocuments || 0, delta: percentChange(docsRecent?.length || 0, (totalDocuments || 0) - (docsRecent?.length || 0)) },
      pendingQuestions: pendingQuestions || 0,
      activeSubscriptions: activeSubscriptions || 0,
      revenueThisMonth: Math.round((payments || []).filter((p) => p.status === 'success' && monthKey(p.created_at) === monthKey(new Date().toISOString())).reduce((sum, p) => sum + (p.amount || 0), 0)),
    };

    // Student activity series (attempts + distinct active students per day)
    const buckets = buildDayBuckets(range);
    for (const r of resultsForActivity || []) {
      const date = (r.completed_at || '').slice(0, 10);
      if (buckets[date]) {
        buckets[date].attempts++;
        if (r.user_id) buckets[date].students.add(r.user_id);
      }
    }
    const activity = Object.entries(buckets).map(([date, v]) => ({
      date,
      attempts: v.attempts,
      activeStudents: v.students.size,
    }));

    // Assessment / examination performance
    const totalAssessmentsRaw = assessmentRaw || [];
    const passedCount = totalAssessmentsRaw.filter((r) => r.passed).length;
    const scores = totalAssessmentsRaw.map((r) => Number(r.percentage)).filter((n) => !Number.isNaN(n));
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const timeSpents = totalAssessmentsRaw.map((r) => Number(r.time_spent)).filter((n) => n > 0 && !Number.isNaN(n));
    const avgTimeMin = timeSpents.length > 0 ? Math.round((timeSpents.reduce((a, b) => a + b, 0) / timeSpents.length) / 60) : 0;
    const startedTotal = totalResultsN + (inProgressAttempts?.length || 0);
    const completionRate = startedTotal > 0 ? Math.round((totalResultsN / startedTotal) * 100) : 0;
    const assessment = {
      total: totalAssessmentsRaw.length,
      avgScore,
      passRate: totalAssessmentsRaw.length > 0 ? Math.round((passedCount / totalAssessmentsRaw.length) * 100) : 0,
      completionRate,
      avgTimeMin,
      series: (() => {
        const mBuckets = buildDayBuckets(Math.min(range, 90));
        for (const r of totalAssessmentsRaw) {
          const date = (r.created_at || '').slice(0, 10);
          if (mBuckets[date]) {
            mBuckets[date].attempts++;
            mBuckets[date].students.add(r.user_id);
          }
        }
        return Object.entries(mBuckets).map(([date, v]) => ({ date, count: v.attempts }));
      })(),
    };

    // Subject performance (from assessment results)
    const subjMap: Record<string, { attempts: number; students: Set<string>; scoreSum: number; passed: number }> = {};
    for (const r of totalAssessmentsRaw) {
      const key = normalizeSubject(r.subject || '');
      if (!key) continue;
      if (!subjMap[key]) subjMap[key] = { attempts: 0, students: new Set(), scoreSum: 0, passed: 0 };
      subjMap[key].attempts++;
      if (r.user_id) subjMap[key].students.add(r.user_id);
      subjMap[key].scoreSum += Number(r.percentage) || 0;
      if (r.passed) subjMap[key].passed++;
    }
    const subjects = Object.entries(subjMap)
      .map(([key, v]) => ({
        subject: SUBJECT_DISPLAY[key] || key,
        students: v.students.size,
        attempts: v.attempts,
        avgScore: v.attempts > 0 ? Math.round(v.scoreSum / v.attempts) : 0,
        passRate: v.attempts > 0 ? Math.round((v.passed / v.attempts) * 100) : 0,
      }))
      .sort((a, b) => b.attempts - a.attempts);

    // Question bank breakdown
    const qbCounts: Record<string, number> = {};
    for (const q of questionBankRaw || []) {
      const subj = normalizeSubject(q.subject || '');
      if (!subj) continue;
      qbCounts[subj] = (qbCounts[subj] || 0) + 1;
    }
    const questionBank = [
      ...Object.entries(qbCounts).map(([key, count]) => ({ subject: SUBJECT_DISPLAY[key] || key, count })),
      {
        subject: 'Other / Unassigned',
        count: Math.max(0, totalQuestionsN - Object.values(qbCounts).reduce((a, b) => a + b, 0)),
      },
    ].filter((s) => s.count > 0).sort((a, b) => b.count - a.count);

    // Content pipeline
    const statusCounts = { processing: 0, ready: 0, failed: 0, uploading: 0, queued: 0 };
    for (const d of documents || []) {
      const st = d.status || 'ready';
      if (statusCounts[st as keyof typeof statusCounts] !== undefined) statusCounts[st as keyof typeof statusCounts]++;
      else statusCounts.ready++;
    }
    const recentProblemDocs = (documents || []).filter((d) => d.status === 'processing' || d.status === 'failed' || d.status === 'queued').slice(0, 6);
    const pipelineItems = await Promise.all(
      recentProblemDocs.map(async (doc) => {
        const { data: user } = await supabase.from('users').select('name').eq('id', doc.user_id).single();
        const { count: qCount } = await supabase.from('questions').select('id', { count: 'exact', head: true }).eq('document_id', doc.id);
        return {
          id: doc.id,
          name: doc.original_name,
          uploadedBy: user?.name || 'Unknown',
          status: doc.status,
          questionsGenerated: qCount || 0,
          createdAt: doc.created_at,
        };
      })
    );
    const pipeline = {
      total: documents?.length || 0,
      processing: statusCounts.processing,
      failed: statusCounts.failed,
      ready: statusCounts.ready,
      queued: statusCounts.queued,
      items: pipelineItems,
    };

    // Subscriptions / revenue overview
    const now = new Date().toISOString();
    const subCounts = {
      active: activeSubscriptions || 0,
      expired: (subscriptions || []).filter((s) => s.status === 'expired').length,
      cancelled: (subscriptions || []).filter((s) => s.status === 'cancelled').length,
      newThisMonth: (subscriptions || []).filter((s) => s.status === 'active' && monthKey(s.created_at) === monthKey(now)).length,
    };
    const monthMap: Record<string, number> = {};
    for (const p of payments || []) {
      if (p.status !== 'success') continue;
      const mk = monthKey(p.created_at);
      monthMap[mk] = (monthMap[mk] || 0) + (p.amount || 0);
    }
    const revenueSeries = Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, total]) => ({ month: month.slice(5), total: Math.round(total) }));
    const subscriptionOverview = {
      ...subCounts,
      revenueThisMonth: kpis.revenueThisMonth,
      revenueSeries,
    };

    // Pending actions
    const pendingActions = [
      {
        id: 'pending-questions',
        label: 'Questions awaiting review',
        count: pendingQuestions || 0,
        to: '/admin/questions?status=pending',
        severity: 'warning' as const,
      },
      {
        id: 'failed-files',
        label: 'Failed file processing jobs',
        count: statusCounts.failed,
        to: '/admin/files',
        severity: 'danger' as const,
      },
      {
        id: 'processing-files',
        label: 'Files currently processing',
        count: statusCounts.processing + statusCounts.queued,
        to: '/admin/files',
        severity: 'info' as const,
      },
    ].filter((p) => p.count > 0);

    // Recent activity feed (results + documents + in-progress attempts + assessment results)
    const [{ data: recentResults }, { data: recentDocs }, { data: recentAssess }, { data: recentAttempts }] = await Promise.all([
      supabase.from('results').select('id, score, completed_at, user_id, quiz_id').order('completed_at', { ascending: false }).limit(8),
      supabase.from('documents').select('id, original_name, status, created_at, user_id').order('created_at', { ascending: false }).limit(5),
      supabase.from('assessment_results').select('id, user_id, subject, percentage, created_at').order('created_at', { ascending: false }).limit(5),
      supabase.from('quiz_attempts').select('id, quiz_id, user_id, started_at').order('started_at', { ascending: false }).limit(5),
    ]);

    const userIds = new Set<string>();
    for (const arr of [recentResults, recentDocs, recentAssess, recentAttempts]) {
      for (const item of arr || []) if (item.user_id) userIds.add(item.user_id);
    }
    const quizIds = new Set<string>();
    for (const item of recentResults || []) if (item.quiz_id) quizIds.add(item.quiz_id);
    for (const item of recentAttempts || []) if (item.quiz_id) quizIds.add(item.quiz_id);

    const [usersRows, quizzesRows] = await Promise.all([
      supabase.from('users').select('id, name').in('id', Array.from(userIds)),
      supabase.from('quizzes').select('id, title').in('id', Array.from(quizIds)),
    ]);
    const userMap = new Map((usersRows.data || []).map((u) => [u.id, u.name]));
    const quizMap = new Map((quizzesRows.data || []).map((q) => [q.id, q.title]));

    const feed: Array<{ id: string; kind: string; actor: string; text: string; meta: string; time: string }> = [];
    for (const r of recentResults || []) {
      feed.push({
        id: `r-${r.id}`, kind: 'result', actor: userMap.get(r.user_id) || 'Unknown',
        text: `Completed ${quizMap.get(r.quiz_id) || 'a quiz'}`, meta: `${r.score}%`, time: r.completed_at,
      });
    }
    for (const d of recentDocs || []) {
      feed.push({
        id: `d-${d.id}`, kind: 'document', actor: userMap.get(d.user_id) || 'Unknown',
        text: `Uploaded ${d.original_name}`, meta: String(d.status), time: d.created_at,
      });
    }
    for (const a of recentAssess || []) {
      feed.push({
        id: `a-${a.id}`, kind: 'assessment', actor: userMap.get(a.user_id) || 'Unknown',
        text: `Completed ${a.subject || 'assessment'}`, meta: `${a.percentage}%`, time: a.created_at,
      });
    }
    for (const t of recentAttempts || []) {
      feed.push({
        id: `t-${t.id}`, kind: 'attempt', actor: userMap.get(t.user_id) || 'Unknown',
        text: `Started ${quizMap.get(t.quiz_id) || 'a quiz'}`, meta: 'In progress', time: t.started_at,
      });
    }
    feed.sort((a, b) => (b.time || '').localeCompare(a.time || '')).slice(0, 10);

    res.json({
      kpis,
      activity,
      assessment,
      subjects,
      questionBank,
      pipeline,
      subscriptionOverview,
      pendingActions,
      recentActivity: feed.slice(0, 10),
    });
  } catch (error) {
    console.error('Command center error:', error);
    res.status(500).json({ message: 'Failed to fetch command center data' });
  }
}

export async function clearQuestionBank(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { count } = await supabase
      .from('questions')
      .select('id', { count: 'exact', head: true });

    const { error } = await supabase
      .from('questions')
      .delete()
      .gte('id', '00000000-0000-0000-0000-000000000000');

    if (error) throw error;

    await logAuditEvent({
      userId: req.user?.id,
      action: 'clear_question_bank',
      entityType: 'questions',
      entityId: '',
      details: { deleted: count || 0 },
      ipAddress: req.ip,
    });

    res.json({ deleted: count || 0 });
  } catch (error) {
    console.error('Clear question bank error:', error);
    res.status(500).json({ message: 'Failed to clear question bank' });
  }
}
