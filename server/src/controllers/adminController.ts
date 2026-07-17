import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../types';

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
          avatar: student.avatar || '',
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
