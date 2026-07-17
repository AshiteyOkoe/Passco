import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../types';

export async function saveAssessmentResult(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { answers, ...rest } = req.body;

    const { data: result, error } = await supabase
      .from('assessment_results')
      .insert({
        user_id: userId,
        class_level: rest.classLevel,
        subject: rest.subject || '',
        difficulty: rest.difficulty,
        assessment_type: rest.assessmentType,
        total_questions: rest.totalQuestions,
        answered_questions: rest.answeredQuestions,
        correct_answers: rest.correctAnswers,
        percentage: rest.percentage,
        grade: rest.grade,
        passed: rest.passed,
        time_spent: rest.timeSpent,
        time_limit: rest.timeLimit || 600,
        abandoned: rest.abandoned || false,
        completed_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) throw error;

    if (answers && Array.isArray(answers) && answers.length > 0) {
      const answerRows = answers.map((a: { questionId: string; userAnswer: unknown; correctAnswer: unknown; isCorrect: boolean; subject?: string }) => ({
        assessment_result_id: result.id,
        question_id: a.questionId,
        user_answer: a.userAnswer,
        correct_answer: a.correctAnswer,
        is_correct: a.isCorrect,
        subject: a.subject || '',
      }));

      await supabase.from('assessment_answers').insert(answerRows);
    }

    res.status(201).json({ id: result.id, message: 'Assessment result saved' });
  } catch (error) {
    console.error('Save assessment result error:', error);
    res.status(500).json({ message: 'Failed to save assessment result' });
  }
}

export async function getMyAssessmentResults(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    const { data: results } = await supabase
      .from('assessment_results')
      .select('*')
      .eq('user_id', userId!)
      .order('created_at', { ascending: false })
      .limit(50);

    res.json({ results });
  } catch (error) {
    console.error('Get assessment results error:', error);
    res.status(500).json({ message: 'Failed to fetch assessment results' });
  }
}

export async function getAllAssessmentResults(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { classLevel, subject, difficulty, page = '1', limit = '20' } = req.query;

    let query = supabase
      .from('assessment_results')
      .select('*', { count: 'exact' });

    if (classLevel) query = query.eq('class_level', classLevel as string);
    if (subject) query = query.eq('subject', subject as string);
    if (difficulty) query = query.eq('difficulty', difficulty as string);

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    query = query.order('created_at', { ascending: false }).range(offset, offset + limitNum - 1);

    const { data: results, count, error } = await query;
    if (error) throw error;

    const enriched = await Promise.all(
      (results || []).map(async (r) => {
        const { data: user } = await supabase.from('users').select('name, email').eq('id', r.user_id).single();
        return {
          id: r.id,
          studentName: user?.name || 'Unknown',
          studentEmail: user?.email || '',
          classLevel: r.class_level,
          subject: r.subject,
          difficulty: r.difficulty,
          assessmentType: r.assessment_type,
          totalQuestions: r.total_questions,
          correctAnswers: r.correct_answers,
          percentage: r.percentage,
          grade: r.grade,
          passed: r.passed,
          timeSpent: r.time_spent,
          createdAt: r.created_at,
        };
      })
    );

    res.json({
      results: enriched,
      total: count || 0,
      page: pageNum,
      totalPages: Math.ceil((count || 0) / limitNum),
    });
  } catch (error) {
    console.error('Get all assessment results error:', error);
    res.status(500).json({ message: 'Failed to fetch assessment results' });
  }
}

export async function getAssessmentStats(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { count: totalAssessments } = await supabase
      .from('assessment_results')
      .select('id', { count: 'exact', head: true });

    const { count: passedCount } = await supabase
      .from('assessment_results')
      .select('id', { count: 'exact', head: true })
      .eq('passed', true);

    const { data: allScores } = await supabase.from('assessment_results').select('percentage');
    const avgPercentage = allScores && allScores.length > 0
      ? Math.round(allScores.reduce((sum, r) => sum + Number(r.percentage), 0) / allScores.length)
      : 0;

    const total = totalAssessments || 0;
    const passed = passedCount || 0;

    const { data: byClassRaw } = await supabase.from('assessment_results').select('class_level, percentage');
    const classMap: Record<string, { sum: number; count: number }> = {};
    for (const r of byClassRaw || []) {
      if (!classMap[r.class_level]) classMap[r.class_level] = { sum: 0, count: 0 };
      classMap[r.class_level].sum += Number(r.percentage);
      classMap[r.class_level].count++;
    }
    const byClass = Object.entries(classMap).map(([key, val]) => ({
      _id: key, count: val.count, avgScore: val.sum / val.count,
    }));

    const { data: bySubjectRaw } = await supabase.from('assessment_results').select('subject, percentage').neq('subject', '');
    const subjMap: Record<string, { sum: number; count: number }> = {};
    for (const r of bySubjectRaw || []) {
      if (!subjMap[r.subject]) subjMap[r.subject] = { sum: 0, count: 0 };
      subjMap[r.subject].sum += Number(r.percentage);
      subjMap[r.subject].count++;
    }
    const bySubject = Object.entries(subjMap)
      .map(([key, val]) => ({ _id: key, count: val.count, avgScore: val.sum / val.count }))
      .sort((a, b) => b.count - a.count);

    const { data: byDiffRaw } = await supabase.from('assessment_results').select('difficulty, percentage');
    const diffMap: Record<string, { sum: number; count: number }> = {};
    for (const r of byDiffRaw || []) {
      if (!diffMap[r.difficulty]) diffMap[r.difficulty] = { sum: 0, count: 0 };
      diffMap[r.difficulty].sum += Number(r.percentage);
      diffMap[r.difficulty].count++;
    }
    const byDifficulty = Object.entries(diffMap).map(([key, val]) => ({
      _id: key, count: val.count, avgScore: val.sum / val.count,
    }));

    const { data: recentRaw } = await supabase
      .from('assessment_results')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    const recentResults = await Promise.all(
      (recentRaw || []).map(async (r) => {
        const { data: user } = await supabase.from('users').select('name, email').eq('id', r.user_id).single();
        return {
          id: r.id,
          studentName: user?.name || 'Unknown',
          classLevel: r.class_level,
          subject: r.subject,
          difficulty: r.difficulty,
          assessmentType: r.assessment_type,
          percentage: r.percentage,
          grade: r.grade,
          passed: r.passed,
          createdAt: r.created_at,
        };
      })
    );

    res.json({
      totalAssessments: total,
      passedCount: passed,
      failedCount: total - passed,
      passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
      avgPercentage,
      byClass,
      bySubject,
      byDifficulty,
      recentResults,
    });
  } catch (error) {
    console.error('Assessment stats error:', error);
    res.status(500).json({ message: 'Failed to fetch assessment stats' });
  }
}
