import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../types';
import { logAuditEvent } from '../services/auditService';
import { resolveAnswerToText } from '../utils/questionNormalize';

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

function normalizeTrueFalseAnswer(value: unknown): unknown {
  if (typeof value === 'boolean') return value;
  const s = String(value ?? '').trim().toLowerCase();
  if (s === 'true' || s === '1' || s === 't' || s === 'yes') return true;
  if (s === 'false' || s === '0' || s === 'f' || s === 'no') return false;
  return value;
}

function normalizeCorrectAnswer(type: string, options: unknown[] | undefined, correctAnswer: unknown): unknown {
  const raw = String(correctAnswer ?? '').trim();
  if (type === 'true-false') return normalizeTrueFalseAnswer(correctAnswer);
  if (Array.isArray(options) && options.length > 0) {
    const resolved = resolveAnswerToText(options as string[], raw);
    if (resolved.ok) return resolved.value;
  }
  return correctAnswer;
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

function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function getQuestionCounts(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const allRows = await fetchAllQuestionRows();

    const counts: Record<string, number> = {};
    const byClass: Record<string, Record<string, number>> = {};

    for (const q of allRows) {
      const subj = normalizeSubject(q.subject || '');
      const cls = normalizeClass(q.class_level) || 'unassigned';
      if (subj) counts[subj] = (counts[subj] || 0) + 1;
      byClass[cls] = byClass[cls] || {};
      byClass[cls][subj] = (byClass[cls][subj] || 0) + 1;
    }

    res.json({ counts, byClass });
  } catch (error) {
    console.error('Get question counts error:', error);
    res.status(500).json({ message: 'Failed to fetch question counts' });
  }
}

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
}

async function findDuplicateQuestion(questionText: string, correctAnswer: string): Promise<{ isDuplicate: boolean; existingQuestion?: string }> {
  const normalized = normalizeText(questionText);
  const { data: existing } = await supabase
    .from('questions')
    .select('question, correct_answer')
    .ilike('question', `%${normalized.substring(0, 50)}%`)
    .limit(10);

  if (!existing || existing.length === 0) return { isDuplicate: false };

  for (const eq of existing) {
    if (normalizeText(eq.question) === normalized) {
      return { isDuplicate: true, existingQuestion: eq.question };
    }
  }

  const words = normalized.split(' ').filter((w) => w.length > 3);
  for (const eq of existing) {
    const eqNorm = normalizeText(eq.question);
    const eqWords = eqNorm.split(' ').filter((w: string) => w.length > 3);
    if (words.length > 0 && eqWords.length > 0) {
      const overlap = words.filter((w: string) => eqWords.includes(w)).length;
      const similarity = overlap / Math.max(words.length, eqWords.length);
      if (similarity >= 0.85) {
        const ansNorm = normalizeText(String(correctAnswer));
        const eqAnsNorm = normalizeText(String(eq.correct_answer));
        if (ansNorm === eqAnsNorm) {
          return { isDuplicate: true, existingQuestion: eq.question };
        }
      }
    }
  }

  return { isDuplicate: false };
}

export async function createQuestion(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { documentId, question, type, options, correctAnswer, explanation, difficulty, topic, subject, classLevel } = req.body;

    if (!documentId) {
      res.status(400).json({ message: 'Document ID is required' });
      return;
    }

    const { data: document } = await supabase.from('documents').select('id, topics').eq('id', documentId).single();
    if (!document) {
      res.status(404).json({ message: 'Document not found' });
      return;
    }

    const { isDuplicate, existingQuestion } = await findDuplicateQuestion(question, correctAnswer);
    if (isDuplicate) {
      res.status(409).json({
        message: 'Duplicate question detected',
        duplicate: true,
        existingQuestion,
        question,
      });
      return;
    }

    const { data: newQuestion, error } = await supabase
      .from('questions')
      .insert({
        document_id: documentId,
        created_by: req.user!.id,
        question,
        type,
        options: type === 'multiple-choice' ? options : [],
        correct_answer: normalizeCorrectAnswer(type, type === 'multiple-choice' ? options : undefined, correctAnswer),
        explanation: explanation || '',
        difficulty: difficulty || 'intermediate',
        topic: topic || (document.topics && document.topics[0]) || 'General',
        subject: subject || '',
        class_level: classLevel || '',
        approved: req.user?.role === 'admin',
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      message: 'Question created successfully',
      question: newQuestion,
    });
  } catch (error) {
    console.error('Create question error:', error);
    res.status(500).json({ message: 'Failed to create question' });
  }
}

export async function generateQuestionsFromDocument(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { documentId, difficulty, count } = req.body;
    const { generateQuestions } = await import('../services/aiService');

    const { data: document } = await supabase.from('documents').select('*').eq('id', documentId).single();
    if (!document) {
      res.status(404).json({ message: 'Document not found' });
      return;
    }

    if (document.status !== 'ready') {
      res.status(400).json({ message: 'Document is not processed yet' });
      return;
    }

    const questionData = generateQuestions(
      document.extracted_text,
      document.topics || [],
      difficulty || 'intermediate',
      count || 10
    );

    const insertRows = questionData.map((qd) => ({
      document_id: document.id,
      created_by: req.user!.id,
      question: qd.question,
      type: qd.type,
      options: qd.type === 'multiple-choice' ? qd.options : [],
      correct_answer: qd.correctAnswer,
      explanation: qd.explanation,
      difficulty: qd.difficulty,
      topic: qd.topic,
      approved: req.user?.role === 'admin',
    }));

    const { data: createdQuestions, error: qError } = await supabase
      .from('questions')
      .insert(insertRows)
      .select('id');

    if (qError) throw qError;

    const questionIds = (createdQuestions || []).map((q) => q.id);

    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .insert({
        title: `${document.original_name} - ${difficulty || 'intermediate'} Quiz`,
        description: `Auto-generated quiz from ${document.original_name}`,
        document_id: document.id,
        created_by: req.user!.id,
        difficulty: difficulty || 'intermediate',
        time_limit: Math.max(questionIds.length * 30, 300),
      })
      .select('id')
      .single();

    if (quizError) throw quizError;

    const qqRows = questionIds.map((qId) => ({ quiz_id: quiz.id, question_id: qId }));
    await supabase.from('quiz_questions').insert(qqRows);

    await supabase.from('quiz_assigned_users').insert({ quiz_id: quiz.id, user_id: req.user!.id });

    res.status(201).json({
      message: 'Questions generated successfully',
      count: createdQuestions?.length || 0,
      questions: createdQuestions,
      quizId: quiz.id,
    });
  } catch (error) {
    console.error('Generate questions error:', error);
    res.status(500).json({ message: 'Failed to generate questions' });
  }
}

export async function getQuestions(req: AuthRequest, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(1000, Math.max(1, parseInt(String(req.query.limit || '20'), 10) || 20));
    const offset = (page - 1) * limit;

    let query = supabase.from('questions').select('*', { count: 'exact' }).order('created_at', { ascending: false });

    if (req.query.documentId) query = query.eq('document_id', req.query.documentId);
    if (req.query.topic) query = query.eq('topic', req.query.topic);
    if (req.query.difficulty) query = query.eq('difficulty', req.query.difficulty);
    if (req.query.type) query = query.eq('type', req.query.type);
    if (req.query.subject) query = query.ilike('subject', normalizeSubject(req.query.subject as string));
    if (req.query.classLevel) query = query.eq('class_level', normalizeClass(req.query.classLevel as string));

    if (req.user?.role === 'student') {
      query = query.eq('approved', true);
    } else if (req.query.status === 'pending') {
      query = query.eq('approved', false);
    } else if (req.query.status === 'approved') {
      query = query.eq('approved', true);
    }

    const search = typeof req.query.search === 'string' ? req.query.search.trim().replace(/[%_\\]/g, '') : '';
    if (search) {
      query = query.or(`question.ilike.%${search}%,topic.ilike.%${search}%`);
    }

    const { data: questions, count } = await query.range(offset, offset + limit - 1);
    const totalQ = count ?? 0;

    const enriched = await Promise.all(
      (questions || []).map(async (q) => {
        const { data: creator } = await supabase.from('users').select('name, email').eq('id', q.created_by).single();
        return {
          ...q,
          _id: q.id,
          documentId: q.document_id,
          correctAnswer: q.correct_answer,
          createdBy: creator || { name: 'Unknown', email: '' },
          subject: q.subject || '',
          classLevel: q.class_level || '',
        };
      })
    );

    res.json({
      questions: enriched,
      total: totalQ,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(totalQ / limit)),
    });
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({ message: 'Failed to fetch questions' });
  }
}

export async function updateQuestion(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data: existing } = await supabase.from('questions').select('id, created_by, type, options').eq('id', id).single();
    if (!existing) {
      res.status(404).json({ message: 'Question not found' });
      return;
    }

    if (req.user?.role !== 'admin' && existing.created_by !== req.user!.id) {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }

    const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.question !== undefined) dbUpdates.question = updates.question;
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.options !== undefined) dbUpdates.options = updates.options;
    if (updates.correctAnswer !== undefined) {
      const nextType = updates.type !== undefined ? updates.type : existing.type;
      const nextOptions = updates.options !== undefined ? updates.options : existing.options;
      dbUpdates.correct_answer = normalizeCorrectAnswer(nextType, nextOptions, updates.correctAnswer);
    }
    if (updates.explanation !== undefined) dbUpdates.explanation = updates.explanation;
    if (updates.difficulty !== undefined) dbUpdates.difficulty = updates.difficulty;
    if (updates.topic !== undefined) dbUpdates.topic = updates.topic;
    if (updates.subject !== undefined) dbUpdates.subject = updates.subject;
    if (updates.classLevel !== undefined) dbUpdates.class_level = updates.classLevel;
    if (updates.approved !== undefined) dbUpdates.approved = updates.approved;

    const { data: question, error } = await supabase
      .from('questions')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ message: 'Question updated', question });
  } catch (error) {
    console.error('Update question error:', error);
    res.status(500).json({ message: 'Failed to update question' });
  }
}

export async function deleteQuestion(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { data: question } = await supabase.from('questions').select('id, created_by').eq('id', req.params.id).single();

    if (!question) {
      res.status(404).json({ message: 'Question not found' });
      return;
    }

    if (question.created_by !== req.user?.id && req.user?.role !== 'admin') {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }

    await supabase.from('questions').delete().eq('id', req.params.id);
    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({ message: 'Failed to delete question' });
  }
}

export async function getApprovedQuestions(req: AuthRequest, res: Response): Promise<void> {
  try {
    const requestedCount = parseInt(String(req.query.count || ''), 10);

    let query = supabase.from('questions').select('*').eq('approved', true).order('created_at', { ascending: false });

    if (req.query.subject) query = query.ilike('subject', normalizeSubject(req.query.subject as string));
    if (req.query.classLevel) query = query.eq('class_level', normalizeClass(req.query.classLevel as string));
    if (req.query.difficulty) query = query.eq('difficulty', req.query.difficulty);
    if (req.query.type) query = query.eq('type', req.query.type);

    const mapRows = (questions: Array<Record<string, unknown>>) =>
      (questions || []).map((q) => ({
        id: q.id,
        question: q.question,
        type: q.type,
        options: q.options,
        correctAnswer: q.correct_answer,
        explanation: q.explanation,
        difficulty: q.difficulty,
        subject: q.subject,
        classLevel: q.class_level,
        topic: q.topic,
      }));

    if (requestedCount > 0) {
      const ids: string[] = [];
      let from = 0;
      let pageIds: string[] = [];
      do {
        let idQuery = supabase.from('questions').select('id').eq('approved', true).order('created_at', { ascending: false });
        if (req.query.subject) idQuery = idQuery.ilike('subject', normalizeSubject(req.query.subject as string));
        if (req.query.classLevel) idQuery = idQuery.eq('class_level', normalizeClass(req.query.classLevel as string));
        if (req.query.difficulty) idQuery = idQuery.eq('difficulty', req.query.difficulty);
        if (req.query.type) idQuery = idQuery.eq('type', req.query.type);
        const { data } = await idQuery.range(from, from + 999);
        pageIds = ((data as Array<{ id: string }>) || []).map((r) => r.id);
        ids.push(...pageIds);
        from += pageIds.length;
      } while (pageIds.length === 1000);

      const n = Math.min(requestedCount, ids.length);
      shuffleArray(ids);
      const chosen = ids.slice(0, n);
      if (chosen.length === 0) {
        res.json({ questions: [] });
        return;
      }
      const { data } = await supabase.from('questions').select('*').in('id', chosen);
      res.json({ questions: mapRows(data || []) });
      return;
    }

    const { data: questions } = await query;

    res.json({ questions: mapRows(questions || []) });
  } catch (error) {
    console.error('Get approved questions error:', error);
    res.status(500).json({ message: 'Failed to fetch approved questions' });
  }
}

export async function approveQuestion(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { data: question, error } = await supabase
      .from('questions')
      .update({ approved: true, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error || !question) {
      res.status(404).json({ message: 'Question not found' });
      return;
    }

    await logAuditEvent({
      userId: req.user!.id,
      action: 'approve_question',
      entityType: 'question',
      entityId: req.params.id,
      details: { subject: question.subject, classLevel: question.class_level },
      ipAddress: req.ip as string,
    });

    res.json({ message: 'Question approved', question });
  } catch (error) {
    console.error('Approve question error:', error);
    res.status(500).json({ message: 'Failed to approve question' });
  }
}
