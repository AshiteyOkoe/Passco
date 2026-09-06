import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../types';

export async function saveAttempt(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { quizId, answers, timeRemaining, currentIndex } = req.body;
    const userId = req.user!.id;

    const { data: existing } = await supabase
      .from('quiz_attempts')
      .select('id')
      .eq('user_id', userId)
      .eq('quiz_id', quizId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('quiz_attempts')
        .update({
          answers,
          time_remaining: timeRemaining,
          current_index: currentIndex,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('quiz_attempts')
        .insert({
          user_id: userId,
          quiz_id: quizId,
          answers,
          time_remaining: timeRemaining,
          current_index: currentIndex,
          status: 'in_progress',
        });

      if (error) throw error;
    }

    res.json({ message: 'Attempt saved' });
  } catch (error) {
    console.error('Save attempt error:', error);
    res.status(500).json({ message: 'Failed to save attempt' });
  }
}

export async function getAttempt(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { quizId } = req.params;
    const userId = req.user!.id;

    const { data: attempt, error } = await supabase
      .from('quiz_attempts')
      .select('*')
      .eq('user_id', userId)
      .eq('quiz_id', quizId)
      .eq('status', 'in_progress')
      .maybeSingle();

    if (error) throw error;

    if (!attempt) {
      res.json({ attempt: null });
      return;
    }

    res.json({
      attempt: {
        id: attempt.id,
        quizId: attempt.quiz_id,
        answers: attempt.answers,
        timeRemaining: attempt.time_remaining,
        currentIndex: attempt.current_index,
        startedAt: attempt.started_at,
        updatedAt: attempt.updated_at,
      },
    });
  } catch (error) {
    console.error('Get attempt error:', error);
    res.status(500).json({ message: 'Failed to fetch attempt' });
  }
}

export async function getInProgressAttempts(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;

    const { data: attempts, error } = await supabase
      .from('quiz_attempts')
      .select('id, quiz_id, answers, time_remaining, current_index, updated_at')
      .eq('user_id', userId)
      .eq('status', 'in_progress')
      .order('updated_at', { ascending: false });

    if (error) throw error;

    const enriched = await Promise.all(
      (attempts || []).map(async (attempt) => {
        const { data: quiz } = await supabase
          .from('quizzes')
          .select('title, difficulty')
          .eq('id', attempt.quiz_id)
          .single();

        return {
          id: attempt.id,
          quizId: attempt.quiz_id,
          title: quiz?.title || 'Quiz',
          difficulty: quiz?.difficulty || '',
          timeRemaining: attempt.time_remaining,
          currentIndex: attempt.current_index,
          answersCount: Array.isArray(attempt.answers)
            ? attempt.answers.filter((a) => a !== null && a !== undefined).length
            : 0,
          updatedAt: attempt.updated_at,
        };
      })
    );

    res.json({ attempts: enriched });
  } catch (error) {
    console.error('Get in-progress attempts error:', error);
    res.status(500).json({ message: 'Failed to fetch in-progress attempts' });
  }
}

export async function deleteAttempt(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { quizId } = req.params;
    const userId = req.user!.id;

    await supabase
      .from('quiz_attempts')
      .delete()
      .eq('user_id', userId)
      .eq('quiz_id', quizId);

    res.json({ message: 'Attempt deleted' });
  } catch (error) {
    console.error('Delete attempt error:', error);
    res.status(500).json({ message: 'Failed to delete attempt' });
  }
}

export async function logAttemptEvent(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { quizId, assessmentType, eventType, questionId, details } = req.body;
    const userId = req.user!.id;

    const { error } = await supabase
      .from('attempt_events')
      .insert({
        user_id: userId,
        quiz_id: quizId || null,
        assessment_type: assessmentType || '',
        event_type: eventType,
        question_id: questionId || '',
        details: details || {},
      });

    if (error) throw error;

    res.json({ message: 'Event logged' });
  } catch (error) {
    console.error('Log event error:', error);
    res.status(500).json({ message: 'Failed to log event' });
  }
}
