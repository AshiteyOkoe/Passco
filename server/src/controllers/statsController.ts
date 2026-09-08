import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export async function getPlatformStats(_req: Request, res: Response): Promise<void> {
  try {
    const [
      { count: totalStudents },
      { count: totalAssessments },
      { data: assessments },
    ] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'student'),
      supabase.from('assessment_results').select('id', { count: 'exact', head: true }).eq('abandoned', false),
      supabase.from('assessment_results').select('total_questions, percentage').eq('abandoned', false),
    ]);

    const questionsAnswered = (assessments || []).reduce(
      (sum, r) => sum + (Number(r.total_questions) || 0),
      0
    );

    const scores = (assessments || [])
      .map((r) => Number(r.percentage))
      .filter((n) => !Number.isNaN(n));
    const averageScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

    res.json({
      activeStudents: totalStudents || 0,
      assessmentsTaken: totalAssessments || 0,
      questionsAnswered,
      averageScore,
    });
  } catch (error) {
    console.error('Get platform stats error:', error);
    res.status(500).json({ message: 'Failed to fetch platform stats' });
  }
}