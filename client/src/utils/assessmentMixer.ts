import {
  AssessmentType,
  BankQuestion,
  DifficultyLevel,
  shuffleArray,
} from '../data/questionBank';

export interface MixCounts {
  beginner: number;
  intermediate: number;
  expert: number;
}

export const ASSESSMENT_MIX: Record<AssessmentType, MixCounts> = {
  mock: { beginner: 8, intermediate: 2, expert: 0 },
  examination: { beginner: 0, intermediate: 14, expert: 6 },
  'likely-bece': { beginner: 0, intermediate: 15, expert: 35 },
};

const STATIC_FRACTION = 0.2;
const BUCKETS: DifficultyLevel[] = ['beginner', 'intermediate', 'expert'];

function questionKey(q: BankQuestion): string {
  return q.question.trim().toLowerCase();
}

function withDifficulty(q: BankQuestion): BankQuestion {
  return { ...q, difficulty: q.difficulty ?? 'intermediate' };
}

export function composeAssessment(
  type: AssessmentType,
  backendByDifficulty: Record<DifficultyLevel, BankQuestion[]>,
  staticQuestions: BankQuestion[],
  targetCount: number
): BankQuestion[] {
  const mix = ASSESSMENT_MIX[type];
  const staticBudget = Math.min(staticQuestions.length, Math.round(targetCount * STATIC_FRACTION));
  const staticDraw = shuffleArray(staticQuestions).slice(0, staticBudget);

  const used = new Set<string>();
  const result: BankQuestion[] = [];
  const tryPush = (q: BankQuestion | undefined): boolean => {
    if (!q) return false;
    const key = questionKey(q);
    if (used.has(key)) return false;
    used.add(key);
    result.push(withDifficulty(q));
    return true;
  };

  for (const bucket of BUCKETS) {
    const needed = mix[bucket];
    if (!needed) continue;

    let picked = 0;
    if (bucket === 'intermediate') {
      for (const q of staticDraw) {
        if (picked >= needed) break;
        if (tryPush(q)) picked++;
      }
    }

    const backend = shuffleArray(backendByDifficulty[bucket] || []);
    for (const q of backend) {
      if (picked >= needed) break;
      if (tryPush(q)) picked++;
    }
  }

  const leftovers = shuffleArray(BUCKETS.flatMap((b) => backendByDifficulty[b] || []));
  for (const q of leftovers) {
    if (result.length >= targetCount) break;
    tryPush(q);
  }

  return shuffleArray(result).slice(0, targetCount);
}