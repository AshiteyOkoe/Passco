import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../types';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

const PLAN_LIMITS: Record<string, number> = { free: 20, basic: 500, premium: -1 };

async function getUserPlan(userId: string): Promise<string> {
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('plan')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return sub?.plan || 'free';
}

async function getUsage(userId: string, month: string): Promise<number> {
  const { data } = await supabase
    .from('ai_usage')
    .select('questions_generated')
    .eq('user_id', userId)
    .eq('month', month)
    .maybeSingle();
  return data?.questions_generated || 0;
}

async function incrementUsage(userId: string, month: string, count: number): Promise<void> {
  const { data: existing } = await supabase
    .from('ai_usage')
    .select('id, questions_generated')
    .eq('user_id', userId)
    .eq('month', month)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('ai_usage')
      .update({ questions_generated: existing.questions_generated + count, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
  } else {
    await supabase.from('ai_usage').insert({ user_id: userId, month, questions_generated: count });
  }
}

export async function getAIGenerationStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const plan = await getUserPlan(req.user!.id);
    const month = getCurrentMonth();
    const used = await getUsage(req.user!.id, month);
    const limit = PLAN_LIMITS[plan] ?? 20;

    res.json({ plan, used, limit, month });
  } catch (error) {
    console.error('Get AI status error:', error);
    res.status(500).json({ message: 'Failed to fetch AI generation status' });
  }
}

export async function generateQuestionsFromAI(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { text, subject, difficulty, count: requestedCount } = req.body;
    if (!text || !subject) {
      res.status(400).json({ message: 'Text and subject are required' }); return;
    }

    const plan = await getUserPlan(req.user!.id);
    const month = getCurrentMonth();
    const used = await getUsage(req.user!.id, month);
    const limit = PLAN_LIMITS[plan] ?? 20;

    if (limit !== -1 && used + (requestedCount || 10) > limit) {
      const remaining = Math.max(0, limit - used);
      res.status(403).json({
        message: `AI generation limit reached. You have ${remaining} questions remaining this month.`,
        limit, used, remaining,
      });
      return;
    }

    if (!OPENAI_API_KEY) {
      res.status(503).json({ message: 'AI service not configured. Set OPENAI_API_KEY.' }); return;
    }

    const count = Math.min(requestedCount || 10, 50);
    const truncatedText = text.slice(0, 8000);

    const prompt = `You are an expert ${subject} teacher creating exam questions for students.
Based on the following educational content, generate ${count} high-quality multiple-choice questions.

Content:
${truncatedText}

For each question, provide exactly 4 answer options (A, B, C, D), identify the correct answer, provide an explanation, and assign a difficulty level.

Return a JSON array with this exact format for each question:
{
  "question": "the question text",
  "optionA": "first option",
  "optionB": "second option",
  "optionC": "third option",
  "optionD": "fourth option",
  "correctAnswer": "A",
  "explanation": "brief explanation of the correct answer",
  "difficulty": "beginner|intermediate|expert",
  "subject": "${subject}"
}

Return ONLY the JSON array, no additional text. Generate exactly ${count} questions.`;

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error('OpenAI API error:', errText);
      res.status(502).json({ message: 'AI generation failed. Please try again.' }); return;
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '';

    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      res.status(502).json({ message: 'Invalid AI response format' }); return;
    }

    let questions: Array<{
      question: string; optionA: string; optionB: string; optionC: string; optionD: string;
      correctAnswer: string; explanation: string; difficulty: string; subject: string;
    }>;

    try {
      questions = JSON.parse(jsonMatch[0]);
    } catch {
      res.status(502).json({ message: 'Failed to parse AI response' }); return;
    }

    const generatedCount = questions.length;
    await incrementUsage(req.user!.id, month, generatedCount);

    const remaining = limit === -1 ? -1 : Math.max(0, limit - used - generatedCount);

    res.json({
      questions: questions.map((q) => ({
        question: q.question,
        options: [q.optionA, q.optionB, q.optionC, q.optionD],
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        difficulty: q.difficulty || difficulty || 'intermediate',
        subject: q.subject || subject,
        type: 'multiple-choice' as const,
      })),
      usage: { used: used + generatedCount, limit, remaining, month },
    });
  } catch (error) {
    console.error('AI generation error:', error);
    res.status(500).json({ message: 'AI generation failed' });
  }
}

export async function saveAIGeneratedQuestions(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { questions, documentId } = req.body;
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      res.status(400).json({ message: 'No questions provided' }); return;
    }

    let docId = documentId;
    if (!docId) {
      const { data: doc, error: docErr } = await supabase
        .from('documents')
        .insert({
          user_id: req.user!.id,
          original_name: `AI Generated - ${new Date().toLocaleDateString()}`,
          storage_path: `ai-gen-${Date.now()}`,
          mime_type: 'application/ai-generated',
          file_size: 0,
          extracted_text: `AI generated ${questions.length} questions`,
          topics: [...new Set(questions.map((q: { subject?: string }) => q.subject || 'General'))] as string[],
          status: 'ready',
        })
        .select('id')
        .single();
      if (docErr) throw docErr;
      docId = doc.id;
    }

    const insertRows = questions.map((q: {
      question: string; options?: string[]; correctAnswer: string | boolean;
      explanation?: string; difficulty?: string; subject?: string; type?: string;
    }) => ({
      document_id: docId,
      created_by: req.user!.id,
      question: q.question,
      type: q.type || 'multiple-choice',
      options: q.options || [],
      correct_answer: q.correctAnswer,
      explanation: q.explanation || '',
      difficulty: q.difficulty || 'intermediate',
      topic: q.subject || 'General',
      subject: q.subject || '',
      class_level: '',
      approved: req.user?.role === 'admin',
    }));

    const { error } = await supabase.from('questions').insert(insertRows);
    if (error) throw error;

    res.status(201).json({ message: `${questions.length} questions saved`, count: questions.length, documentId: docId });
  } catch (error) {
    console.error('Save AI questions error:', error);
    res.status(500).json({ message: 'Failed to save questions' });
  }
}

export async function getAIUsageStats(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const { data: usage } = await supabase.from('ai_usage').select('*').order('month', { ascending: false }).limit(100);

    const byUser: Record<string, { total: number; months: number }> = {};
    for (const u of usage || []) {
      if (!byUser[u.user_id]) byUser[u.user_id] = { total: 0, months: 0 };
      byUser[u.user_id].total += u.questions_generated;
      byUser[u.user_id].months++;
    }

    const totalGenerated = (usage || []).reduce((sum, u) => sum + u.questions_generated, 0);
    const activeUsers = Object.keys(byUser).length;

    res.json({ totalGenerated, activeUsers, monthlyBreakdown: usage || [] });
  } catch (error) {
    console.error('Get AI usage stats error:', error);
    res.status(500).json({ message: 'Failed to fetch AI usage stats' });
  }
}
