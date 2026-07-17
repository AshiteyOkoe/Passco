import { QuestionData, Difficulty } from '../types';

export function generateQuestions(
  text: string,
  topics: string[],
  difficulty: Difficulty,
  count: number = 10
): QuestionData[] {
  const sentences = text
    .replace(/\n+/g, ' ')
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 30 && s.length < 300);

  if (sentences.length === 0) {
    return generateFallbackQuestions(topics, difficulty, count);
  }

  const questions: QuestionData[] = [];
  const usedSentences = new Set<number>();
  const mcqCount = Math.ceil(count * 0.6);
  const tfCount = count - mcqCount;

  for (let i = 0; i < mcqCount; i++) {
    const sentenceIdx = findUnusedSentence(sentences, usedSentences);
    if (sentenceIdx === -1) break;
    usedSentences.add(sentenceIdx);

    const sentence = sentences[sentenceIdx];
    const q = generateMCQ(sentence, topics, difficulty);
    if (q) questions.push(q);
  }

  for (let i = 0; i < tfCount; i++) {
    const sentenceIdx = findUnusedSentence(sentences, usedSentences);
    if (sentenceIdx === -1) break;
    usedSentences.add(sentenceIdx);

    const sentence = sentences[sentenceIdx];
    const q = generateTrueFalse(sentence, topics, difficulty);
    if (q) questions.push(q);
  }

  return questions.length > 0 ? questions : generateFallbackQuestions(topics, difficulty, count);
}

function findUnusedSentence(sentences: string[], used: Set<number>): number {
  for (let i = 0; i < sentences.length; i++) {
    if (!used.has(i)) return i;
  }
  return -1;
}

function generateMCQ(sentence: string, topics: string[], difficulty: Difficulty): QuestionData | null {
  const words = sentence.split(' ').filter((w) => w.length > 3);

  if (words.length < 4) return null;

  const keyWordIndex = Math.floor(words.length / 2);
  const correctAnswer = words[keyWordIndex].replace(/[^a-zA-Z]/g, '');

  if (correctAnswer.length < 3) return null;

  const distractors = generateDistractors(correctAnswer, topics, difficulty);
  const options = shuffleArray([correctAnswer, ...distractors]);

  return {
    question: sentence.replace(correctAnswer, '________'),
    type: 'multiple-choice',
    options,
    correctAnswer,
    explanation: `The correct answer is "${correctAnswer}" based on the study material.`,
    difficulty,
    topic: topics[Math.floor(Math.random() * topics.length)] || 'General',
  };
}

function generateTrueFalse(sentence: string, topics: string[], difficulty: Difficulty): QuestionData | null {
  const isTrue = Math.random() > 0.5;

  let question: string;
  let correctAnswer: boolean;

  if (isTrue) {
    question = sentence.trim() + '.';
    correctAnswer = true;
  } else {
    const words = sentence.split(' ');
    if (words.length < 5) return null;
    const swapIdx = Math.floor(Math.random() * words.length);
    const original = words[swapIdx];
    const opposite = getOpposite(original);
    if (!opposite) return null;
    words[swapIdx] = opposite;
    question = words.join(' ').trim() + '.';
    correctAnswer = false;
  }

  return {
    question,
    type: 'true-false',
    correctAnswer,
    explanation: `Based on the study material, this statement is ${correctAnswer ? 'true' : 'false'}.`,
    difficulty,
    topic: topics[Math.floor(Math.random() * topics.length)] || 'General',
  };
}

function generateDistractors(correct: string, topics: string[], difficulty: Difficulty): string[] {
  const pool: string[] = [];
  const topicWords = topics.join(' ').split(' ').filter((w) => w.length > 3);

  const allWords = [
    ...topicWords,
    'significant', 'important', 'process', 'system', 'structure',
    'function', 'theory', 'principle', 'element', 'factor',
    'method', 'approach', 'concept', 'mechanism', 'component',
  ];

  for (const word of allWords) {
    if (word.toLowerCase() !== correct.toLowerCase() && !pool.includes(word)) {
      pool.push(word);
    }
  }

  const count = difficulty === 'beginner' ? 2 : difficulty === 'intermediate' ? 3 : 3;
  return shuffleArray(pool).slice(0, count);
}

function getOpposite(word: string): string | null {
  const opposites: Record<string, string> = {
    'increases': 'decreases', 'increase': 'decrease',
    'larger': 'smaller', 'large': 'small',
    'greater': 'lesser', 'great': 'less',
    'higher': 'lower', 'high': 'low',
    'positive': 'negative', 'present': 'absent',
    'includes': 'excludes', 'include': 'exclude',
    'always': 'never', 'all': 'none',
    'true': 'false', 'correct': 'incorrect',
    'more': 'less', 'most': 'least',
    'before': 'after', 'first': 'last',
    'strong': 'weak', 'stronger': 'weaker',
    'major': 'minor', 'primary': 'secondary',
    'active': 'inactive', 'enabled': 'disabled',
  };

  const lower = word.toLowerCase();
  return opposites[lower] || null;
}

function generateFallbackQuestions(topics: string[], difficulty: Difficulty, count: number): QuestionData[] {
  const questions: QuestionData[] = [];
  const topic = topics[0] || 'General';

  const templates = [
    { q: `What is a key concept in "${topic}"?`, a: `The fundamental principles of ${topic}`, d: 'beginner' as Difficulty },
    { q: `How does "${topic}" apply to real-world scenarios?`, a: `${topic} has practical applications`, d: 'intermediate' as Difficulty },
    { q: `What are the main components of "${topic}"?`, a: `The components include ${topic}`, d: 'beginner' as Difficulty },
  ];

  for (let i = 0; i < Math.min(count, 5); i++) {
    const t = templates[i % templates.length];
    const options = [
      t.a,
      `An alternative approach to ${topic}`,
      `A different perspective on ${topic}`,
      `Another aspect of ${topic}`,
    ];

    questions.push({
      question: t.q,
      type: 'multiple-choice',
      options: shuffleArray(options),
      correctAnswer: t.a,
      explanation: `${t.a} is correct based on standard ${topic} principles.`,
      difficulty: difficulty,
      topic,
    });
  }

  return questions;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
