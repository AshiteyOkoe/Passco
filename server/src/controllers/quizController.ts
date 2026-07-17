import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../types';

export async function createQuiz(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { title, description, documentId, questions, difficulty, timeLimit, assignedTo } = req.body;

    const { data: quiz, error } = await supabase
      .from('quizzes')
      .insert({
        title,
        description: description || '',
        document_id: documentId || null,
        created_by: req.user!.id,
        difficulty: difficulty || 'intermediate',
        time_limit: timeLimit || 600,
      })
      .select()
      .single();

    if (error) throw error;

    if (questions && questions.length > 0) {
      const qqRows = questions.map((qId: string) => ({ quiz_id: quiz.id, question_id: qId }));
      await supabase.from('quiz_questions').insert(qqRows);
    }

    if (assignedTo && assignedTo.length > 0) {
      const qaRows = assignedTo.map((uId: string) => ({ quiz_id: quiz.id, user_id: uId }));
      await supabase.from('quiz_assigned_users').insert(qaRows);
    }

    res.status(201).json({ message: 'Quiz created successfully', quiz });
  } catch (error) {
    console.error('Create quiz error:', error);
    res.status(500).json({ message: 'Failed to create quiz' });
  }
}

async function getQuizWithJoins(quizId: string, hideAnswers = false) {
  const { data: quiz } = await supabase.from('quizzes').select('*').eq('id', quizId).single();
  if (!quiz) return null;

  const { data: qqRows } = await supabase.from('quiz_questions').select('question_id').eq('quiz_id', quizId);
  const questionIds = (qqRows || []).map((r) => r.question_id);

  let questions: unknown[] = [];
  if (questionIds.length > 0) {
    const selectCols = hideAnswers
      ? 'id, question, type, options, explanation, difficulty, topic, subject, class_level'
      : '*';
    const { data } = await supabase.from('questions').select(selectCols).in('id', questionIds);
    questions = data || [];
  }

  const { data: qaRows } = await supabase.from('quiz_assigned_users').select('user_id').eq('quiz_id', quizId);
  const assignedTo = (qaRows || []).map((r) => r.user_id);

  const { data: creator } = await supabase.from('users').select('name, email').eq('id', quiz.created_by).single();

  return {
    ...quiz,
    questions,
    assignedTo,
    createdBy: creator ? { _id: quiz.created_by, name: creator.name, email: creator.email } : quiz.created_by,
  };
}

export async function getQuizzes(req: AuthRequest, res: Response): Promise<void> {
  try {
    let quizQuery;

    if (req.user?.role === 'admin') {
      quizQuery = supabase.from('quizzes').select('*').order('created_at', { ascending: false });
    } else {
      const { data: assigned } = await supabase
        .from('quiz_assigned_users')
        .select('quiz_id')
        .eq('user_id', req.user!.id);
      const assignedIds = (assigned || []).map((r) => r.quiz_id);

      quizQuery = supabase
        .from('quizzes')
        .select('*')
        .eq('is_active', true)
        .or(`created_by.eq.${req.user!.id},id.in.(${assignedIds.length > 0 ? assignedIds.join(',') : '00000000-0000-0000-0000-000000000000'})`)
        .order('created_at', { ascending: false });
    }

    const { data: quizzes } = await quizQuery;

    const enriched = await Promise.all(
      (quizzes || []).map(async (quiz) => {
        const { data: creator } = await supabase.from('users').select('name, email').eq('id', quiz.created_by).single();
        const { data: qqRows } = await supabase.from('quiz_questions').select('question_id').eq('quiz_id', quiz.id);
        const questionIds = (qqRows || []).map((r) => r.question_id);
        const { data: questions } = questionIds.length > 0
          ? await supabase.from('questions').select('*').in('id', questionIds)
          : { data: [] };

        return { ...quiz, questions: questions || [], createdBy: creator || { name: 'Unknown', email: '' } };
      })
    );

    res.json({ quizzes: enriched });
  } catch (error) {
    console.error('Get quizzes error:', error);
    res.status(500).json({ message: 'Failed to fetch quizzes' });
  }
}

export async function getQuizById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const hideAnswers = req.user?.role === 'student';
    const quiz = await getQuizWithJoins(req.params.id as string, hideAnswers);

    if (!quiz) {
      res.status(404).json({ message: 'Quiz not found' });
      return;
    }

    if (req.user?.role === 'student') {
      const isAssigned = quiz.assignedTo?.some((id: string) => id === req.user!.id);
      const isCreator = quiz.created_by === req.user.id;
      if (!isAssigned && !isCreator) {
        res.status(403).json({ message: 'Not authorized' });
        return;
      }
    }

    res.json({ quiz });
  } catch (error) {
    console.error('Get quiz error:', error);
    res.status(500).json({ message: 'Failed to fetch quiz' });
  }
}

export async function submitQuiz(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { answers, timeTaken } = req.body;

    const { data: quiz } = await supabase.from('quizzes').select('*').eq('id', id).single();
    if (!quiz) {
      res.status(404).json({ message: 'Quiz not found' });
      return;
    }

    const { data: qqRows } = await supabase.from('quiz_questions').select('question_id').eq('quiz_id', id);
    const questionIds = (qqRows || []).map((r) => r.question_id);

    const { data: questions } = await supabase.from('questions').select('id, correct_answer, type').in('id', questionIds);

    let correctCount = 0;
    let incorrectCount = 0;
    let skippedCount = 0;
    const answerDetails: Array<{
      result_id?: string;
      question_id: string;
      user_answer: unknown;
      correct_answer: unknown;
      is_correct: boolean;
      time_spent: number;
    }> = [];

    for (const question of questions || []) {
      const userAnswer = answers.find((a: { questionId: string }) => a.questionId === question.id)?.answer ?? null;

      let isCorrect = false;
      if (userAnswer === null || userAnswer === undefined || userAnswer === '') {
        skippedCount++;
      } else {
        if (question.type === 'true-false') {
          isCorrect = userAnswer === question.correct_answer;
        } else {
          isCorrect = String(userAnswer).toLowerCase().trim() === String(question.correct_answer).toLowerCase().trim();
        }
        if (isCorrect) correctCount++;
        else incorrectCount++;
      }

      answerDetails.push({
        question_id: question.id,
        user_answer: userAnswer,
        correct_answer: question.correct_answer,
        is_correct: isCorrect,
        time_spent: 0,
      });
    }

    const totalQ = (questions || []).length;
    const score = Math.round((correctCount / totalQ) * 100);

    const { data: result, error: resultError } = await supabase
      .from('results')
      .insert({
        user_id: req.user!.id,
        quiz_id: id,
        score,
        total_questions: totalQ,
        correct_count: correctCount,
        incorrect_count: incorrectCount,
        skipped_count: skippedCount,
        time_taken: timeTaken || 0,
        completed_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (resultError) throw resultError;

    const answerRows = answerDetails.map((a) => ({ ...a, result_id: result.id }));
    await supabase.from('result_answers').insert(answerRows);

    res.status(201).json({
      message: 'Quiz submitted successfully',
      result: {
        id: result.id,
        score,
        correctCount,
        incorrectCount,
        skippedCount,
        totalQuestions: totalQ,
        timeTaken: timeTaken || 0,
      },
    });
  } catch (error) {
    console.error('Submit quiz error:', error);
    res.status(500).json({ message: 'Failed to submit quiz' });
  }
}

export async function getResults(req: AuthRequest, res: Response): Promise<void> {
  try {
    let query = supabase.from('results').select('*').order('completed_at', { ascending: false });

    if (req.user?.role === 'student') {
      query = query.eq('user_id', req.user.id);
    }
    if (req.query.quizId) {
      query = query.eq('quiz_id', req.query.quizId);
    }

    const { data: results } = await query;

    const enriched = await Promise.all(
      (results || []).map(async (r) => {
        const { data: quiz } = await supabase.from('quizzes').select('title, difficulty').eq('id', r.quiz_id).single();
        return { ...r, quizId: quiz || { title: 'Unknown', difficulty: 'intermediate' } };
      })
    );

    res.json({ results: enriched });
  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({ message: 'Failed to fetch results' });
  }
}

export async function getResultById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { data: result, error } = await supabase.from('results').select('*').eq('id', req.params.id).single();

    if (error || !result) {
      res.status(404).json({ message: 'Result not found' });
      return;
    }

    if (result.user_id !== req.user?.id && req.user?.role !== 'admin') {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }

    const { data: quiz } = await supabase.from('quizzes').select('title, difficulty').eq('id', result.quiz_id).single();
    const { data: qqRows } = await supabase.from('quiz_questions').select('question_id').eq('quiz_id', result.quiz_id);
    const questionIds = (qqRows || []).map((r) => r.question_id);
    const { data: questions } = questionIds.length > 0
      ? await supabase.from('questions').select('*').in('id', questionIds)
      : { data: [] };

    const { data: answerRows } = await supabase.from('result_answers').select('*').eq('result_id', result.id);

    res.json({
      result: {
        ...result,
        quizId: { ...quiz, questions: questions || [] },
        answers: answerRows || [],
      },
    });
  } catch (error) {
    console.error('Get result error:', error);
    res.status(500).json({ message: 'Failed to fetch result' });
  }
}

export async function assignQuiz(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { userIds } = req.body;

    const { data: existing } = await supabase
      .from('quiz_assigned_users')
      .select('user_id')
      .eq('quiz_id', req.params.id);

    const existingIds = new Set((existing || []).map((r) => r.user_id));
    const newUserIds = userIds.filter((id: string) => !existingIds.has(id));

    if (newUserIds.length > 0) {
      const rows = newUserIds.map((uId: string) => ({ quiz_id: req.params.id, user_id: uId }));
      await supabase.from('quiz_assigned_users').insert(rows);
    }

    const { data: quiz } = await supabase.from('quizzes').select('*').eq('id', req.params.id).single();
    if (!quiz) {
      res.status(404).json({ message: 'Quiz not found' });
      return;
    }

    res.json({ message: 'Quiz assigned successfully', quiz });
  } catch (error) {
    console.error('Assign quiz error:', error);
    res.status(500).json({ message: 'Failed to assign quiz' });
  }
}

export async function getQuizByDocumentId(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { data: quiz } = await supabase.from('quizzes').select('*').eq('document_id', req.params.documentId).single();

    if (!quiz) {
      res.status(404).json({ message: 'No quiz found for this document' });
      return;
    }

    const hideAnswers = req.user?.role === 'student';
    const fullQuiz = await getQuizWithJoins(quiz.id, hideAnswers);
    res.json({ quiz: fullQuiz });
  } catch (error) {
    console.error('Get quiz by document error:', error);
    res.status(500).json({ message: 'Failed to fetch quiz' });
  }
}

export async function getStudentAnalytics(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { data: results } = await supabase
      .from('results')
      .select('*')
      .eq('user_id', req.user!.id)
      .order('completed_at', { ascending: false });

    if (!results || results.length === 0) {
      res.json({
        totalQuizzes: 0,
        averageScore: 0,
        totalCorrect: 0,
        totalQuestions: 0,
        recentResults: [],
        scoreHistory: [],
        weakTopics: [],
      });
      return;
    }

    const totalQuizzes = results.length;
    const averageScore = Math.round(results.reduce((sum, r) => sum + r.score, 0) / totalQuizzes);
    const totalCorrect = results.reduce((sum, r) => sum + r.correct_count, 0);
    const totalQuestionsCount = results.reduce((sum, r) => sum + r.total_questions, 0);

    const weakAreas: Record<string, { correct: number; total: number }> = {};
    for (const result of results) {
      const { data: answerRows } = await supabase.from('result_answers').select('is_correct').eq('result_id', result.id);
      for (const answer of answerRows || []) {
        const topic = 'Question';
        if (!weakAreas[topic]) weakAreas[topic] = { correct: 0, total: 0 };
        weakAreas[topic].total++;
        if (answer.is_correct) weakAreas[topic].correct++;
      }
    }

    const weakTopics = Object.entries(weakAreas)
      .filter(([, data]) => data.total >= 2)
      .map(([topic, data]) => ({
        topic,
        score: Math.round((data.correct / data.total) * 100),
        total: data.total,
      }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 5);

    res.json({
      totalQuizzes,
      averageScore,
      totalCorrect,
      totalQuestions: totalQuestionsCount,
      recentResults: results.slice(0, 10).map((r) => ({
        id: r.id,
        score: r.score,
        totalQuestions: r.total_questions,
        correctCount: r.correct_count,
        completedAt: r.completed_at,
      })),
      scoreHistory: [...results].reverse().map((r) => ({
        date: r.completed_at,
        score: r.score,
      })),
      weakTopics,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: 'Failed to fetch analytics' });
  }
}
