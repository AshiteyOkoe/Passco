import 'dotenv/config';
import { supabase } from './config/supabase';

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

function normalizeSubject(value?: string): string {
  if (!value) return '';
  const lower = value.trim().toLowerCase();
  if (SUBJECT_KEYS.includes(lower)) return lower;
  return SUBJECT_LABEL_TO_KEY[lower] || value.trim();
}

function normalizeClass(value?: string): string {
  if (!value) return '';
  const lvl = value.trim().toLowerCase().replace(/\./g, '');
  if (lvl.includes('3') || lvl.includes('third') || lvl.includes('three')) return 'jhs3';
  if (lvl.includes('2') || lvl.includes('second') || lvl.includes('two')) return 'jhs2';
  if (lvl.includes('1') || lvl.includes('first') || lvl.includes('one')) return 'jhs1';
  return value.trim();
}

function normalizeTrueFalseAnswer(value: unknown): unknown {
  if (typeof value === 'boolean') return value;
  const s = String(value ?? '').toLowerCase().trim();
  if (s === 'true' || s === '1') return true;
  if (s === 'false' || s === '0') return false;
  return value;
}

interface QuestionRow {
  id: string;
  subject?: string;
  class_level?: string;
  type?: string;
  correct_answer?: unknown;
}

async function reconcile(): Promise<void> {
  const { data: rows, error } = await supabase
    .from('questions')
    .select('id, subject, class_level, type, correct_answer')
    .order('created_at', { ascending: false });

  if (error) throw error;

  let updated = 0;

  for (const row of (rows || []) as QuestionRow[]) {
    const nextSubject = normalizeSubject(row.subject);
    const nextClass = normalizeClass(row.class_level);
    const nextAnswer = row.type === 'true-false' ? normalizeTrueFalseAnswer(row.correct_answer) : row.correct_answer;

    const subjectChanged = String(nextSubject) !== (row.subject || '');
    const classChanged = String(nextClass) !== (row.class_level || '');
    const answerChanged = String(nextAnswer) !== String(row.correct_answer ?? '');

    if (!subjectChanged && !classChanged && !answerChanged) continue;

    const { error: upErr } = await supabase
      .from('questions')
      .update({
        subject: nextSubject,
        class_level: nextClass,
        correct_answer: nextAnswer,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id);

    if (upErr) throw upErr;
    updated++;
    console.log(`Fixed question ${row.id} (subject: ${row.subject || ''} -> ${nextSubject}, class: ${row.class_level || ''} -> ${nextClass}, answer: ${String(row.correct_answer ?? '')} -> ${String(nextAnswer)})`);
  }

  console.log(`Done. updated=${updated} of ${(rows || []).length}`);
  process.exit(0);
}

reconcile().catch((e) => {
  console.error('Reconciliation failed:', e);
  process.exit(1);
});