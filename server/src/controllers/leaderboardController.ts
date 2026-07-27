import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export async function getLeaderboard(_req: Request, res: Response): Promise<void> {
  try {
    const { data: students, error } = await supabase
      .from('users')
      .select('id, name, institution, grade_level, avatar, created_at')
      .eq('role', 'student');

    if (error) throw error;

    const entries = await Promise.all(
      (students || []).map(async (student) => {
        const { data: results } = await supabase
          .from('assessment_results')
          .select('percentage, passed, created_at')
          .eq('user_id', student.id)
          .eq('abandoned', false)
          .order('created_at', { ascending: false });

        if (!results || results.length === 0) return null;

        const total = results.length;
        const avg = Math.round(results.reduce((s, r) => s + r.percentage, 0) / total);
        const passedCount = results.filter((r) => r.passed).length;
        const badges = Math.floor(passedCount / 3);
        const scores = results.map((r) => r.percentage);

        return {
          id: student.id,
          name: student.name || 'Student',
          institution: student.institution || '',
          classLevel: student.grade_level || '',
          avatar: student.avatar || '',
          gender: '',
          avg,
          total,
          badges,
          scores,
          joinedAt: student.created_at,
        };
      })
    );

    // Try to enrich with gender if the column exists
    try {
      const { data: allUsers } = await supabase
        .from('users')
        .select('id, gender')
        .eq('role', 'student');
      if (allUsers) {
        const genderMap = new Map(allUsers.map((u) => [u.id, u.gender || '']));
        for (const entry of entries) {
          if (entry) entry.gender = genderMap.get(entry.id) || '';
        }
      }
    } catch { /* gender column may not exist */ }

    const leaderboard = entries
      .filter(Boolean)
      .sort((a, b) => b!.avg - a!.avg)
      .slice(0, 50);

    res.json({ leaderboard });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ message: 'Failed to fetch leaderboard' });
  }
}
