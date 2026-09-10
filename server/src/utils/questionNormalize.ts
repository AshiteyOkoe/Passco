export const SUBJECT_KEYS = [
  'mathematics',
  'science',
  'english',
  'social-studies',
  'ict',
  'rme',
  'creative-arts',
  'career-tech',
] as const;

export type SubjectKey = (typeof SUBJECT_KEYS)[number];

const SUBJECT_LABELS: Record<string, string> = {
  mathematics: 'mathematics',
  science: 'science',
  english: 'english',
  'social-studies': 'social-studies',
  ict: 'ict',
  rme: 'rme',
  'creative-arts': 'creative-arts',
  'career-tech': 'career-tech',
};

const SUBJECT_LABEL_TO_KEY: Record<string, string> = {
  mathematics: 'mathematics',
  maths: 'mathematics',
  math: 'mathematics',
  science: 'science',
  'english language': 'english',
  english: 'english',
  'social studies': 'social-studies',
  ict: 'ict',
  'information technology': 'ict',
  'information and communication technology': 'ict',
  computing: 'ict',
  'computing (ict)': 'ict',
  'ict (computing)': 'ict',
  'religious and moral education': 'rme',
  'religious & moral education': 'rme',
  rme: 'rme',
  'creative arts and design': 'creative-arts',
  'creative arts': 'creative-arts',
  'creative art & design': 'creative-arts',
  'creative art and design': 'creative-arts',
  'creative art': 'creative-arts',
  'career technology': 'career-tech',
  'career tech': 'career-tech',
};

export function normalizeSubject(value?: string): string {
  if (!value) return '';
  const lower = value.trim().toLowerCase();
  if (SUBJECT_KEYS.includes(lower as SubjectKey)) return lower;
  return SUBJECT_LABEL_TO_KEY[lower] || SUBJECT_LABELS[lower] || value.trim();
}

export function normalizeClassLevel(value?: string): string {
  if (!value) return '';
  const lvl = value.trim().toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ');
  if (lvl.includes('3') || lvl.includes('third') || lvl.includes('three') || lvl.endsWith('3')) return 'jhs3';
  if (lvl.includes('2') || lvl.includes('second') || lvl.includes('two') || lvl.endsWith('2')) return 'jhs2';
  if (lvl.includes('1') || lvl.includes('first') || lvl.includes('one') || lvl.endsWith('1')) return 'jhs1';
  return value.trim();
}

const DIFFICULTIES = ['beginner', 'intermediate', 'expert'] as const;

export function normalizeDifficulty(value?: string, fallback = 'intermediate'): string {
  const v = String(value ?? '').trim().toLowerCase();
  if (DIFFICULTIES.includes(v as (typeof DIFFICULTIES)[number])) return v;
  if (v === 'easy' || v === 'basic') return 'beginner';
  if (v === 'hard' || v === 'advanced' || v === 'difficult') return 'expert';
  return fallback;
}

export function normalizeTrueFalseAnswer(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  const s = String(value ?? '').trim().toLowerCase();
  if (s === 'true' || s === '1' || s === 't' || s === 'yes' || s === 'a') return true;
  if (s === 'false' || s === '0' || s === 'f' || s === 'no' || s === 'b') return false;
  return null;
}

export function isTrueFalseOptions(options: string[]): boolean {
  const two = options.filter((o) => String(o ?? '').trim() !== '');
  if (two.length !== 2) return false;
  const texts = two.map((o) => String(o).trim().toLowerCase());
  return (
    (texts[0] === 'true' && texts[1] === 'false') ||
    (texts[0] === 'false' && texts[1] === 'true')
  );
}

export function resolveAnswerToText(options: string[], answer: unknown): { ok: boolean; value: string; reason?: string } {
  const opts = options.map((o) => String(o ?? '').trim());
  const raw = String(answer ?? '').trim();

  if (raw === '') return { ok: false, value: raw, reason: 'answer is empty' };

  const exact = opts.find((o) => o.toLowerCase() === raw.toLowerCase());
  if (exact !== undefined) return { ok: true, value: exact };

  if (/^[A-Da-d]{1}$/.test(raw)) {
    const idx = raw.toUpperCase().charCodeAt(0) - 65;
    if (idx < opts.length && opts[idx]) {
      return { ok: true, value: opts[idx] };
    }
    return { ok: false, value: opts[idx] ?? raw, reason: `answer letter ${raw} has no matching non-empty option at index ${idx}` };
  }

  return { ok: false, value: raw, reason: 'answer text does not match any option' };
}

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s+\-*/=<>()[\]{}.,!?%^_:;@&$#~|']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}