import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../types';
import { getEffectivePlan, PLAN_LIMITS } from '../services/subscriptionService';
import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import { resolveAnswerToText } from '../utils/questionNormalize';

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
const GEMINI_URL = (model: string, key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;

function getGeminiKey(): string {
  const fromEnv = process.env.GEMINI_API_KEY;
  if (fromEnv && /^(AIza|AQ\.)/.test(fromEnv)) return fromEnv;
  try {
    const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env');
    const content = fs.readFileSync(envPath, 'utf-8');
    const match = content.match(/^GEMINI_API_KEY=(.+)$/m);
    const key = match?.[1]?.trim() || fromEnv || '';
    return /^(AIza|AQ\.)/.test(key) ? key : '';
  } catch { return /^(AIza|AQ\.)/.test(fromEnv || '') ? fromEnv || '' : ''; }
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/* ============================================================
   Spec-driven generation constants + helpers
   ============================================================ */

const DIFFICULTIES = ['beginner', 'intermediate', 'expert'] as const;
type Difficulty = (typeof DIFFICULTIES)[number];

const CLASS_LEVELS = ['jhs1', 'jhs2', 'jhs3'] as const;
const ASSESSMENT_TYPES = ['quiz', 'mock', 'examination'] as const;

const MAX_QUESTIONS_PER_REQUEST = 200;
const BATCH_SIZE = 50;
const MAX_ATTEMPTS = 2;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfter(response: Awaited<ReturnType<typeof fetch>>, bodyText: string): number {
  const header = Number(response.headers.get('retry-after'));
  if (Number.isFinite(header) && header > 0) return Math.min(header, 30);
  const match = bodyText.match(/retry in ([\d.]+)\s*s/i);
  if (match && Number.isFinite(Number(match[1])) && Number(match[1]) > 0) {
    return Math.min(Number(match[1]), 30);
  }
  return 10;
}

const SUBJECT_LABELS: Record<string, string> = {
  mathematics: 'Mathematics',
  science: 'Science',
  english: 'English Language',
  'social-studies': 'Social Studies',
  ict: 'ICT',
  rme: 'Religious and Moral Education',
  'creative-arts': 'Creative Arts and Design',
  'career-tech': 'Career Technology',
};

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

function normalizeSubject(value?: string): string {
  if (!value) return '';
  const lower = value.trim().toLowerCase();
  if (SUBJECT_LABELS[lower]) return lower;
  return SUBJECT_LABEL_TO_KEY[lower] || value.trim();
}

function normalizeClassLevel(value?: string): string {
  if (!value) return '';
  const lvl = value.trim().toLowerCase().replace(/\./g, '');
  if (lvl.includes('3') || lvl.includes('third') || lvl.includes('three')) return 'jhs3';
  if (lvl.includes('2') || lvl.includes('second') || lvl.includes('two')) return 'jhs2';
  if (lvl.includes('1') || lvl.includes('first') || lvl.includes('one')) return 'jhs1';
  return value.trim();
}

interface GeneratedQuestion {
  type: 'multiple-choice' | 'true-false';
  question: string;
  options: string[];
  correctAnswer: string | boolean | null;
  explanation: string;
  difficulty: string;
  topic: string;
  fingerprint: string;
  subject: string;
}

function normalizeForFingerprint(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function fingerprint(text: string): string {
  return createHash('sha256').update(normalizeForFingerprint(text)).digest('hex');
}

async function getPreviousQuestions(): Promise<{ texts: string[]; fingerprints: Set<string> }> {
  const { data } = await supabase
    .from('questions')
    .select('question')
    .order('created_at', { ascending: false })
    .limit(500);

  const texts: string[] = [];
  const fingerprints = new Set<string>();
  for (const row of (data || []) as Array<{ question?: string }>) {
    if (!row?.question) continue;
    const q = String(row.question).trim();
    if (!q) continue;
    texts.push(q);
    fingerprints.add(fingerprint(q));
  }
  return { texts, fingerprints };
}

function buildSystemPrompt(): string {
  return `You are an expert question generator for the Ghanaian Junior High School (JHS) curriculum.

GENERATION REQUIREMENTS
- Generate original questions appropriate for the Ghanaian JHS educational context.
- Questions must be academically accurate, clear, age-appropriate, relevant to the selected subject, appropriate for the assigned class and difficulty, free from ambiguity, suitable for assessment, and written in clear English.
- Do NOT copy questions from existing examination papers and do NOT reproduce known examination questions. Generate original questions based on the relevant curriculum concepts.

QUESTION STRUCTURE
For multiple-choice questions, provide:
- The question
- Four options (A, B, C, D)
- Exactly one correct answer
- A short explanation
Incorrect options must be plausible but objectively incorrect. Do not create trick questions unless explicitly requested.

For true/false questions, provide:
- A statement that is objectively either True or False
- The correct answer (true or false)
- A short explanation
Requirements: never use partially true statements, avoid ambiguous wording, avoid double negatives unless academically necessary, do not make the answer obvious from wording patterns (e.g. always saying "true"), and randomly distribute true and false answers.

METADATA
Every question must include: subject, class, difficulty, topic, question type, question text, options, correct answer, explanation, and fingerprint.

ORIGINALITY
Every question must be meaningfully different from every question listed in the EXCLUDED list. Changing names, numbers, or a few words does NOT make a question sufficiently unique.

QUALITY CONTROL
Before returning each question, verify: (1) the academic answer, (2) every option, (3) the explanation, (4) class suitability, (5) difficulty, (6) absence of ambiguity, (7) absence of duplication, (8) absence of excessive similarity to the EXCLUDED questions. Reject and regenerate any question that fails validation.

IMPORTANT
The correct answer must be returned as a separate field and must NEVER be hinted at inside the question text or the options of a multiple-choice question. Return ONLY a JSON array. No surrounding text, no comments, no markdown.`;
}

function buildUserPrompt(args: {
  subject: string;
  classLevel: string;
  assessmentType: string;
  topic?: string;
  difficulty: string;
  count: number;
  text: string;
  exclusions: string[];
}): string {
  const subjectLabel = SUBJECT_LABELS[args.subject] || args.subject;
  const classLabel = (CLASS_LEVELS as readonly string[]).includes(args.classLevel)
    ? args.classLevel.toUpperCase().replace('JHS', 'JHS ')
    : 'JHS 1';
  const assessmentLabel = ASSESSMENT_TYPES.includes(args.assessmentType as (typeof ASSESSMENT_TYPES)[number])
    ? args.assessmentType
    : 'quiz';
  const assessmentNote =
    assessmentLabel === 'examination'
      ? 'formal examination paper'
      : assessmentLabel === 'mock'
        ? 'timed mock test'
        : 'practice quiz';

  const difficultyDirective =
    args.difficulty === 'mixed'
      ? 'Spread the difficulty of the pool across beginner, intermediate, and expert levels. Do not concentrate the entire question set on one difficulty.'
      : `All questions must be ${args.difficulty} difficulty.`;

  const topicDirective = args.topic?.trim()
    ? `Focus every question on the topic: ${args.topic.trim()}.`
    : 'Cover a balanced range of topics within the subject and class.';

  return `Generate a question pool with the following configuration:
- Subject: ${subjectLabel}
- Class range: ${classLabel} (all questions must be appropriate for this single class level)
- Number of questions: ${args.count}
- Difficulty: ${args.difficulty || 'mixed'}
- Assessment type: ${assessmentLabel} (${assessmentNote})
- ${topicDirective}

${difficultyDirective}

QUESTION TYPES: produce roughly 70% multiple-choice and 30% true/false questions unless true/false is unsuitable for the topic.

EXCLUDED questions (must not duplicate, repeat, or be excessively similar to any of these):
${args.exclusions.length > 0 ? args.exclusions.map((t) => `- ${t}`).join('\n') : `- (none - this is a fresh pool)`}

Educational content to draw concepts from (use for topic guidance, but phrase every question originally):
${args.text}

Return a JSON array. Each element MUST match one of these two schemas:

Multiple choice:
{"type":"multiple-choice","question":"...","options":["option A","option B","option C","option D"],"correctAnswer":"A","explanation":"...","difficulty":"beginner|intermediate|expert","topic":"..."}

True/false:
{"type":"true-false","question":"statement that is objectively true or false","correctAnswer":true,"explanation":"...","difficulty":"beginner|intermediate|expert","topic":"..."}

Generate exactly ${args.count} questions.`;
}

function normalizeQuestion(raw: Record<string, unknown>, fallbackDifficulty: string, subject: string): GeneratedQuestion {
  const type: 'multiple-choice' | 'true-false' = raw.type === 'true-false' ? 'true-false' : 'multiple-choice';
  const question = String(raw.question ?? '').trim();
  const explanation = String(raw.explanation ?? '').trim();
  const difficulty = String(raw.difficulty ?? '').toLowerCase() || fallbackDifficulty || 'intermediate';
  const topic = String(raw.topic ?? '').trim() || 'General';

  let options: string[] = [];
  let correctAnswer: string | boolean | null = false;

  if (type === 'multiple-choice') {
    const raws = Array.isArray(raw.options)
      ? (raw.options as unknown[]).map((o) => String(o ?? '').trim())
      : ['optionA', 'optionB', 'optionC', 'optionD'].map((k) => String(raw[k] ?? '').trim());
    options = raws.slice(0, 4);

    if (raw.correctAnswer === true || raw.correctAnswer === false) {
      correctAnswer = Boolean(raw.correctAnswer);
    } else {
      const ans = String(raw.correctAnswer ?? '').trim();
      const resolved = resolveAnswerToText(options, ans);
      correctAnswer = resolved.ok ? resolved.value : ans;
    }
  } else {
    const ans = raw.correctAnswer;
    if (ans === true || ans === 'true' || ans === 'TRUE' || ans === 'True') correctAnswer = true;
    else if (ans === false || ans === 'false' || ans === 'FALSE' || ans === 'False') correctAnswer = false;
    else correctAnswer = null;
  }

  return { type, question, options, correctAnswer, explanation, difficulty, topic, fingerprint: fingerprint(question), subject };
}

function isValidQuestion(q: GeneratedQuestion, exclusion: Set<string>): boolean {
  if (q.question.length < 8) return false;
  if (exclusion.has(q.fingerprint)) return false;
  if (q.explanation.length < 5) return false;
  if (!DIFFICULTIES.includes(q.difficulty as Difficulty)) return false;

  if (q.type === 'multiple-choice') {
    if (q.options.length !== 4) return false;
    if (q.options.some((o) => o.length === 0)) return false;
    if (typeof q.correctAnswer !== 'string' || !q.options.includes(q.correctAnswer)) return false;
  } else {
    if (typeof q.correctAnswer !== 'boolean') return false;
  }
  return true;
}

async function callGemini(system: string, user: string): Promise<unknown[]> {
  const MAX_GEMINI_ATTEMPTS = 3;

  for (let attempt = 1; attempt <= MAX_GEMINI_ATTEMPTS; attempt += 1) {
    let aiResponse: Awaited<ReturnType<typeof fetch>> | null = null;
    try {
      aiResponse = await fetch(GEMINI_URL(GEMINI_MODEL, getGeminiKey()), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(120_000),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ parts: [{ text: user }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 32768,
            responseMimeType: 'application/json',
          },
        }),
      });
    } catch (err) {
      const name = (err as Error)?.name;
      const isTimeout = name === 'TimeoutError' || name === 'AbortError';
      if (isTimeout && attempt < MAX_GEMINI_ATTEMPTS) {
        console.error(`Gemini request timed out, retrying (attempt ${attempt}):`, err);
        await sleep(2000 * attempt);
        continue;
      }
      const error = new Error(isTimeout
        ? 'AI request timed out after 120 seconds. Please try fewer questions.'
        : `Failed to reach the AI service. ${(err as Error)?.message || ''}`.trim()) as Error & { status?: number };
      if (isTimeout) error.status = 502;
      throw error;
    }

    if (aiResponse.ok) {
      const aiData = (await aiResponse.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const content = (aiData.candidates?.[0]?.content?.parts || [])
        .map((p) => p.text || '')
        .join('')
        .trim();

      const cleaned = content
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      let array: unknown[];
      try {
        array = JSON.parse(cleaned);
      } catch {
        const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error('Invalid AI response format');
        array = JSON.parse(jsonMatch[0]);
      }
      return Array.isArray(array) ? array : [];
    }

    const errText = await aiResponse.text();
    console.error('Gemini API error:', aiResponse.status, errText);
    let detail = '';
    try {
      const errJson = JSON.parse(errText);
      detail = errJson?.error?.message || '';
    } catch { /* use fallback below */ }
    if (!detail) {
      detail = errText.slice(0, 500);
    }
    if (!detail) {
      detail = aiResponse.status === 404
        ? `Gemini model "${GEMINI_MODEL}" was not found. Check the GEMINI_MODEL setting.`
        : aiResponse.status === 403 || aiResponse.status === 400
          ? 'Gemini rejected the API key or request. Check that GEMINI_API_KEY is valid.'
          : 'AI generation failed. Please try again.';
    }

    if (aiResponse.status === 429 && attempt < MAX_GEMINI_ATTEMPTS) {
      const wait = parseRetryAfter(aiResponse, errText);
      console.error(`Gemini rate-limit hit, retrying in ${wait}s (attempt ${attempt})`);
      await sleep(wait * 1000);
      continue;
    }

    if (aiResponse.status >= 500 && attempt < MAX_GEMINI_ATTEMPTS) {
      console.error(`Gemini 5xx error, retrying in ${2000 * attempt}ms (attempt ${attempt})`);
      await sleep(2000 * attempt);
      continue;
    }

    const error = new Error(detail) as Error & { status?: number };
    error.status = aiResponse.status;
    throw error;
  }

  throw new Error('AI generation failed. Please try again.');
}

async function getUserPlan(user: AuthRequest['user']): Promise<string> {
  if (!user) return 'free';
  if (user.role === 'admin') return 'premium';
  const effective = await getEffectivePlan(user.id);
  return effective.plan;
}

async function getUserAiLimit(user: AuthRequest['user']): Promise<number> {
  if (!user) return PLAN_LIMITS.free.aiQuestions;
  if (user.role === 'admin') return -1;
  const effective = await getEffectivePlan(user.id);
  return PLAN_LIMITS[effective.plan].aiQuestions;
}

export async function getBankAiQuestionCount(userId: string, month: string): Promise<number> {
  const [year, mon] = month.split('-').map(Number);
  const start = new Date(Date.UTC(year, (mon || 1) - 1, 1));
  const end = new Date(Date.UTC(year, mon || 1, 1));
  const { count } = await supabase
    .from('questions')
    .select('id, documents!inner(mime_type)', { count: 'exact', head: true })
    .eq('created_by', userId)
    .eq('documents.mime_type', 'application/ai-generated')
    .gte('created_at', start.toISOString())
    .lt('created_at', end.toISOString());
  return count || 0;
}

async function getUsage(userId: string, month: string): Promise<number> {
  return getBankAiQuestionCount(userId, month);
}

export async function getAIGenerationStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const plan = await getUserPlan(req.user);
    const month = getCurrentMonth();
    const used = await getUsage(req.user!.id, month);
    const limit = await getUserAiLimit(req.user);

    res.json({ plan, used, limit, month });
  } catch (error) {
    console.error('Get AI status error:', error);
    res.status(500).json({ message: 'Failed to fetch AI generation status' });
  }
}

export async function generateQuestionsFromAI(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      text,
      subject,
      difficulty = 'mixed',
      count: requestedCount = 10,
      classLevel = 'jhs1',
      assessmentType = 'quiz',
      topic,
    } = req.body;

    const subjectKey = normalizeSubject(subject);
    const classLevelKey = normalizeClassLevel(classLevel);

    if (!text || !subject) {
      res.status(400).json({ message: 'Text and subject are required' }); return;
    }

    const plan = await getUserPlan(req.user);
    const month = getCurrentMonth();
    const used = await getUsage(req.user!.id, month);
    const limit = await getUserAiLimit(req.user);

    if (limit !== -1 && used + (requestedCount || 10) > limit) {
      const remaining = Math.max(0, limit - used);
      res.status(403).json({
        message: `AI generation limit reached. You have ${remaining} questions remaining this month.`,
        limit, used, remaining,
      });
      return;
    }

    if (!getGeminiKey()) {
      res.status(503).json({ message: 'AI service not configured. Set GEMINI_API_KEY.' }); return;
    }

    const targetCount = Math.min(Math.max(1, requestedCount || 10), MAX_QUESTIONS_PER_REQUEST);
    const truncatedText = text.slice(0, 8000);
    const system = buildSystemPrompt();

    const { texts: previousTexts, fingerprints: exclusionSet } = await getPreviousQuestions();
    const exclusionTexts = previousTexts.slice(0, 200);

    const pool: GeneratedQuestion[] = [];
    let attempts = 0;

    while (pool.length < targetCount && attempts < MAX_ATTEMPTS) {
      attempts += 1;
      const remaining = targetCount - pool.length;
      const batchCount = Math.ceil(remaining / BATCH_SIZE);

      for (let b = 0; b < batchCount; b += 1) {
        if (pool.length >= targetCount) break;
        if (b > 0) await sleep(2500);
        const batchSize = Math.min(BATCH_SIZE, targetCount - pool.length);

        const userPrompt = buildUserPrompt({
          subject: subjectKey,
          classLevel: classLevelKey,
          assessmentType,
          topic,
          difficulty,
          count: batchSize,
          text: truncatedText,
          exclusions: exclusionTexts,
        });

        let rawQuestions: unknown[];
        try {
          rawQuestions = await callGemini(system, userPrompt);
        } catch (err) {
          const status = (err as Error & { status?: number }).status;
          const detail = (err as Error).message || 'AI generation failed. Please try again.';
          if (status && status > 0) {
            res.status(status === 429 ? 429 : 502).json({ message: detail });
            return;
          }
          console.error('Gemini generation batch failed (transport error, retrying):', err);
          continue;
        }

        for (const raw of rawQuestions) {
          if (pool.length >= targetCount) break;
          const cleaned = normalizeQuestion((raw as Record<string, unknown>) || {}, difficulty, subjectKey);
          if (!isValidQuestion(cleaned, exclusionSet)) continue;
          exclusionSet.add(cleaned.fingerprint);
          exclusionTexts.push(cleaned.question);
          pool.push(cleaned);
        }
      }
    }

    if (pool.length === 0) {
      res.status(502).json({ message: 'AI did not return any valid questions. Please try again.' });
      return;
    }

    const remaining = limit === -1 ? -1 : Math.max(0, limit - used);

    res.json({
      questions: pool.map((q) => ({
        question: q.question,
        options: q.type === 'true-false' ? ['True', 'False'] : q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        difficulty: q.difficulty,
        topic: q.topic,
        classLevel: classLevelKey,
        assessmentType,
        fingerprint: q.fingerprint,
        subject: q.subject,
        type: q.type,
      })),
      usage: { used, limit, remaining, month },
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

    const plan = await getUserPlan(req.user);
    const month = getCurrentMonth();
    const used = await getUsage(req.user!.id, month);
    const limit = await getUserAiLimit(req.user);

    const existingFingerprints = (await getPreviousQuestions()).fingerprints;
    const deduped: typeof questions = [];
    for (const q of questions) {
      const fp = q.fingerprint && typeof q.fingerprint === 'string'
        ? q.fingerprint
        : fingerprint(String(q.question ?? '').trim());
      if (!fp || existingFingerprints.has(fp)) continue;
      existingFingerprints.add(fp);
      deduped.push(q);
    }

    const usage = {
      used: used + deduped.length,
      limit,
      remaining: limit === -1 ? -1 : Math.max(0, limit - used - deduped.length),
      month,
    };

    if (deduped.length === 0) {
      res.status(201).json({
        message: 'No new questions to save (they were already in the question bank).',
        count: 0,
        documentId: documentId || undefined,
        plan,
        usage,
      });
      return;
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
          extracted_text: `AI generated ${deduped.length} questions`,
          topics: [...new Set(deduped.map((q: { subject?: string }) => q.subject || 'General'))] as string[],
          status: 'ready',
        })
        .select('id')
        .single();
      if (docErr) throw docErr;
      docId = doc.id;
    }

    const insertRows = deduped.map((q: {
      question: string;
      options?: string[];
      correctAnswer: string | boolean;
      explanation?: string;
      difficulty?: string;
      subject?: string;
      type?: string;
      topic?: string;
      classLevel?: string;
    }) => ({
      document_id: docId,
      created_by: req.user!.id,
      question: q.question,
      type: q.type || 'multiple-choice',
      options: q.options || [],
      correct_answer: q.type === 'true-false'
        ? (typeof q.correctAnswer === 'boolean' ? q.correctAnswer : String(q.correctAnswer ?? '').toLowerCase().trim() === 'true')
        : (typeof q.correctAnswer === 'boolean' ? String(q.correctAnswer) : q.correctAnswer),
      explanation: q.explanation || '',
      difficulty: q.difficulty || 'intermediate',
      topic: q.topic || q.subject || 'General',
      subject: normalizeSubject(q.subject),
      class_level: normalizeClassLevel(q.classLevel),
      approved: req.user?.role === 'admin',
    }));

    const { error } = await supabase.from('questions').insert(insertRows);
    if (error) throw error;

    res.status(201).json({
      message: `${deduped.length} questions saved`,
      count: deduped.length,
      documentId: docId,
      plan,
      usage,
    });
  } catch (error) {
    console.error('Save AI questions error:', error);
    res.status(500).json({ message: 'Failed to save questions' });
  }
}

export async function getAIUsageStats(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const rows: Array<{ created_by: string; created_at: string }> = [];
    let from = 0;
    let batch: Array<{ created_by: string; created_at: string }> = [];
    do {
      const { data } = await supabase
        .from('questions')
        .select('id, created_by, created_at, documents!inner(mime_type)')
        .eq('documents.mime_type', 'application/ai-generated')
        .order('created_at', { ascending: false })
        .range(from, from + 999);
      batch = (data as Array<{ created_by: string; created_at: string }>) || [];
      rows.push(...batch);
      from += batch.length;
    } while (batch.length === 1000);

    const byUser: Record<string, { total: number; months: Record<string, number> }> = {};
    for (const r of rows || []) {
      const userId = r.created_by as string;
      const created = new Date(r.created_at as string);
      if (!userId || isNaN(created.getTime())) continue;
      const month = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`;
      byUser[userId] = byUser[userId] || { total: 0, months: {} };
      byUser[userId].total += 1;
      byUser[userId].months[month] = (byUser[userId].months[month] || 0) + 1;
    }

    const monthlyBreakdown = Object.entries(byUser)
      .flatMap(([user_id, u]) =>
        Object.entries(u.months).map(([month, questions_generated]) => ({ user_id, month, questions_generated }))
      )
      .sort((a, b) => (a.month < b.month ? 1 : -1));

    res.json({
      totalGenerated: Object.values(byUser).reduce((sum, u) => sum + u.total, 0),
      activeUsers: Object.keys(byUser).length,
      monthlyBreakdown,
    });
  } catch (error) {
    console.error('Get AI usage stats error:', error);
    res.status(500).json({ message: 'Failed to fetch AI usage stats' });
  }
}
