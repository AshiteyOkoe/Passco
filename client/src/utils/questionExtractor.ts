export type SubjectId = 'mathematics' | 'science' | 'english' | 'social-studies' | 'ict' | 'rme' | 'creative-arts' | 'career-tech';
export type JHSCategory = 'jhs1' | 'jhs2' | 'jhs3';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'expert';
export type QuestionType = 'multiple-choice' | 'true-false';

export interface ExtractedQuestion {
  id: string;
  question: string;
  type: QuestionType;
  options: string[];
  correctAnswer: string;
  explanation: string;
  subject: SubjectId;
  classLevel: JHSCategory;
  difficulty: DifficultyLevel;
  topic: string;
  confidence: number;
  status: 'pending' | 'approved' | 'edited';
  originalIndex: number;
}

const SUBJECT_KEYWORDS: Record<SubjectId, string[]> = {
  mathematics: [
    'math', 'mathematics', 'algebra', 'geometry', 'trigonometry', 'calculus',
    'equation', 'formula', 'calculate', 'solve', 'sum', 'difference', 'multiply',
    'divide', 'fraction', 'decimal', 'percentage', 'ratio', 'proportion',
    'area', 'perimeter', 'volume', 'angle', 'triangle', 'circle', 'square',
    'rectangle', 'x', 'y', 'variable', 'integer', 'prime', 'factor', 'square root',
    'addition', 'subtraction', 'multiplication', 'division', 'numerator', 'denominator',
    'times', 'plus', 'minus', 'equals', 'percent', 'statistics', 'probability',
    'number', 'digit', 'place value', 'rounding', 'estimation', 'hcf', 'lcm',
    'coordinate', 'graph', 'axis', 'slope', 'gradient',
  ],
  science: [
    'science', 'biology', 'chemistry', 'physics', 'photosynthesis', 'cell',
    'organism', 'ecosystem', 'energy', 'force', 'gravity', 'motion', 'atom',
    'molecule', 'element', 'compound', 'reaction', 'experiment', 'hypothesis',
    'plant', 'animal', 'DNA', 'evolution', 'habitat', 'food chain', 'water cycle',
    'solar system', 'planet', 'earth', 'sun', 'moon', 'magnet', 'electricity',
    'circuit', 'voltage', 'current', 'temperature', 'heat', 'light', 'sound',
    'wave', 'density', 'mass', 'weight', 'volume', 'solution', 'acid', 'base',
    'enzyme', 'protein', 'carbon', 'oxygen', 'hydrogen', 'nitrogen',
    'respiration', 'digestion', 'circulation', 'reproduction', 'germination',
    'chemical', 'physical', 'states of matter', 'solid', 'liquid', 'gas',
    'skeleton', 'muscle', 'nervous system', 'skeleton', 'leaf', 'root', 'stem',
  ],
  english: [
    'english', 'grammar', 'vocabulary', 'reading', 'writing', 'comprehension',
    'essay', 'noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition',
    'conjunction', 'interjection', 'synonym', 'antonym', 'idiom', 'metaphor',
    'simile', 'alliteration', 'personification', 'stanza', 'rhyme', 'poem',
    'fiction', 'non-fiction', 'narrative', 'dialogue', 'character', 'plot',
    'setting', 'theme', 'mood', 'tone', 'figurative language', 'literal',
    'comma', 'period', 'semicolon', 'apostrophe', 'quotation', 'sentence',
    'paragraph', 'tense', 'singular', 'plural', 'subject', 'predicate',
    'active voice', 'passive voice', 'direct speech', 'indirect speech',
    'spelling', 'punctuation', 'article', 'determiner', 'clause', 'phrase',
    'main clause', 'subordinate clause', 'conditional', 'past tense', 'present tense',
  ],
  'social-studies': [
    'social studies', 'history', 'geography', 'government', 'civic',
    'democracy', 'constitution', 'culture', 'society', 'community',
    'election', 'parliament', 'judiciary', 'executive', 'legislature',
    'colony', 'independence', 'slavery', 'civilization', 'empire',
    'trade', 'economy', 'agriculture', 'industry', 'population',
    'migration', 'settlement', 'urban', 'rural', 'resource', 'climate',
    'continent', 'ocean', 'river', 'mountain', 'map', 'latitude', 'longitude',
    'festival', 'tradition', 'custom', 'heritage', 'archaeology',
    'map reading', 'direction', 'compass', 'equator', 'hemisphere',
    'colonialism', 'imperialism', 'nationalism', 'pan-africanism',
  ],
  ict: [
    'ict', 'information', 'communication', 'technology', 'computer',
    'software', 'hardware', 'internet', 'network', 'database', 'spreadsheet',
    'word processor', 'presentation', 'programming', 'algorithm', 'binary',
    'data', 'input', 'output', 'processing', 'storage', 'cpu', 'ram', 'rom',
    'monitor', 'keyboard', 'mouse', 'printer', 'scanner', 'modem', 'router',
    'server', 'client', 'website', 'email', 'browser', 'search engine',
    'cyber', 'security', 'virus', 'malware', 'firewall', 'password',
    'operating system', 'windows', 'linux', 'mac', 'file', 'folder',
    'excel', 'word', 'powerpoint', 'programming', 'code', 'debug',
    'html', 'css', 'javascript', 'database', 'sql', 'excel',
    'ms word', 'ms excel', 'ms powerpoint', 'typing', 'keyboard shortcut',
  ],
  rme: [
    'religious', 'moral', 'education', 'rme', 'islam', 'christianity',
    'bible', 'quran', 'prayer', 'worship', 'faith', 'belief', 'god',
    'prophet', 'mosque', 'church', 'temple', 'religious', 'moral',
    'ethical', 'values', 'right', 'wrong', 'good', 'evil', 'sin',
    'virtue', 'honesty', 'truth', 'justice', 'mercy', 'compassion',
    'respect', 'responsibility', 'integrity', 'obedience', 'festival',
    'ramadan', 'easter', 'christmas', 'eid', 'hajj', 'pilgrimage',
    'ten commandments', 'five pillars', 'creation', 'Adam', 'Eve',
    'Muhammad', 'Jesus', 'Moses', 'Abraham', 'worship', 'ritual',
    'sacred', 'holy', 'scripture', 'sermon', 'preaching', 'tithe',
  ],
  'creative-arts': [
    'creative arts', 'art', 'design', 'music', 'dance', 'drama',
    'drawing', 'painting', 'sculpture', 'craft', 'pottery', 'weaving',
    'textile', 'pattern', 'color', 'colour', 'shape', 'line', 'texture',
    'form', 'rhythm', 'melody', 'harmony', 'instruments', 'drum', 'guitar',
    'piano', 'flute', 'trumpet', 'choir', 'song', 'compose', 'perform',
    'theater', 'theatre', 'stage', 'costume', 'props', 'set design',
    'animation', 'film', 'photography', 'printmaking', 'collage',
    'mask', 'folk', 'traditional', 'modern', 'abstract', 'realism',
    'portrait', 'landscape', 'still life', 'aesthetics', 'creative',
  ],
  'career-tech': [
    'career', 'technology', 'vocational', 'entrepreneurship', 'business',
    'accounting', 'finance', 'marketing', 'management', 'economics',
    'trade', 'craft', 'skill', 'occupation', 'profession', 'employment',
    'self-employment', 'profit', 'loss', 'revenue', 'cost', 'price',
    'supply', 'demand', 'market', 'consumer', 'producer', 'goods',
    'services', 'industry', 'manufacturing', 'construction', 'agriculture',
    'carpentry', 'masonry', 'plumbing', 'welding', 'tailoring', 'baking',
    'cooking', 'hospitality', 'tourism', 'health', 'safety', 'first aid',
    'tool', 'equipment', 'material', 'process', 'quality', 'production',
    'budget', 'savings', 'investment', 'tax', 'insurance', 'loan',
  ],
};

const CLASS_TOPIC_COMPLEXITY: Record<JHSCategory, string[]> = {
  jhs1: [
    'introduction', 'basic', 'fundamental', 'simple', 'what is', 'define',
    'name the', 'list', 'mention', 'identify', 'state', 'true or false',
    'basic arithmetic', 'reading', 'writing', 'alphabet', 'numbers',
    'colors', 'shapes', 'family', 'animals', 'plants', 'weather',
  ],
  jhs2: [
    'explain', 'describe', 'compare', 'difference', 'process', 'function',
    'role', 'importance', 'advantage', 'disadvantage', 'classify', 'types',
    'methods', 'steps', 'components', 'structure', 'system', 'cycle',
    'intermediate', 'analyze', 'relationship', 'pattern', 'formula',
  ],
  jhs3: [
    'analyze', 'evaluate', 'critically', 'discuss', 'justify', 'argue',
    'assess', 'determine', 'calculate', 'prove', 'derive', 'solve complex',
    'application', 'synthesis', 'higher order', 'advanced', 'interpret',
    'compare and contrast', 'implications', 'significance', 'theoretical',
    'advanced mathematics', 'equations', 'simultaneous', 'quadratic',
  ],
};

function generateId(): string {
  return `q_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function detectSubject(text: string): SubjectId {
  const lower = text.toLowerCase();
  const scores: Record<SubjectId, number> = {
    mathematics: 0, science: 0, english: 0, 'social-studies': 0,
    ict: 0, rme: 0, 'creative-arts': 0, 'career-tech': 0,
  };

  for (const [subject, keywords] of Object.entries(SUBJECT_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) {
        scores[subject as SubjectId] += kw.length > 4 ? 2 : 1;
      }
    }
  }

  let best: SubjectId = 'english';
  let bestScore = 0;
  for (const [subject, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      best = subject as SubjectId;
    }
  }
  return best;
}

export function detectClassLevel(text: string): JHSCategory {
  const lower = text.toLowerCase();

  const jhs3Indicators = ['simultaneous', 'quadratic', 'trigonometry', 'logarithm',
    'gradient', 'intercept', 'standard form', 'variation', 'inequality',
    'probability', 'bearing', 'scale drawing', 'construction',
    'essay', 'critically analyze', 'evaluate', 'implications'];
  const jhs1Indicators = ['basic', 'introduction', 'simple', 'what is', 'name',
    'list', 'identify', 'alphabet', 'counting', 'addition', 'subtraction',
    'fill in the blank', 'true or false'];

  for (const ind of jhs3Indicators) {
    if (lower.includes(ind)) return 'jhs3';
  }
  for (const ind of jhs1Indicators) {
    if (lower.includes(ind)) return 'jhs1';
  }

  for (const [cls, topics] of Object.entries(CLASS_TOPIC_COMPLEXITY)) {
    for (const t of topics) {
      if (lower.includes(t)) return cls as JHSCategory;
    }
  }
  return 'jhs2';
}

export function detectDifficulty(text: string, options?: string[]): DifficultyLevel {
  const lower = text.toLowerCase();
  let complexityScore = 0;

  const expertWords = ['analyze', 'evaluate', 'critically', 'derive', 'prove',
    'simultaneous', 'quadratic', 'trigonometry', 'logarithm', 'theoretical',
    'implications', 'justification', 'synthesis', 'hypothesis'];
  const beginnerWords = ['what is', 'name', 'list', 'identify', 'true or false',
    'define', 'state', 'mention', 'basic', 'simple'];

  for (const w of expertWords) { if (lower.includes(w)) complexityScore += 3; }
  for (const w of beginnerWords) { if (lower.includes(w)) complexityScore -= 2; }

  if (options) {
    const avgLen = options.reduce((s, o) => s + o.length, 0) / options.length;
    if (avgLen > 40) complexityScore += 2;
    if (avgLen < 15) complexityScore -= 1;
  }

  if (text.length > 200) complexityScore += 1;
  if (text.split(' ').length > 30) complexityScore += 1;

  if (complexityScore >= 4) return 'expert';
  if (complexityScore <= -2) return 'beginner';
  return 'intermediate';
}

export function detectQuestionType(text: string, options?: string[]): QuestionType {
  const lower = text.toLowerCase().trim();

  if (lower.startsWith('is ') || lower.startsWith('are ') || lower.startsWith('was ') ||
      lower.startsWith('do ') || lower.startsWith('does ') || lower.startsWith('did ') ||
      lower.startsWith('can ') || lower.startsWith('will ') || lower.startsWith('has ') ||
      lower.startsWith('have ')) {
    if (!options || options.length === 0) return 'true-false';
  }

  if (lower.endsWith('.') && !lower.endsWith('?') && !lower.endsWith(':')) {
    if (!options || options.length === 0) return 'true-false';
  }

  if (options && options.length >= 2) {
    const hasLetterPrefix = options.some(o => /^[A-D][\.\)]\s/i.test(o.trim()));
    if (hasLetterPrefix || options.length === 4) return 'multiple-choice';
  }

  if (options && options.length > 0) return 'multiple-choice';
  return 'true-false';
}

function cleanOptionText(text: string): string {
  return text.replace(/^[\s]*[A-Da-d][\.\):\s]+/, '').replace(/^[\s]*[-•]\s*/, '').trim();
}

function detectCorrectAnswerFromText(text: string, options: string[]): string | null {
  const lower = text.toLowerCase();

  const answerPatterns = [
    /(?:correct\s+(?:answer|option|choice))\s*[:=\-]?\s*([A-Da-d])/i,
    /(?:answer\s+is)\s*[:=\-]?\s*([A-Da-d])/i,
    /(?:ans\s*[:=\-])\s*([A-Da-d])/i,
    /\*\*([A-Da-d])\*\*/i,
    /(?:✓|✔|correct)\s*[:=\-]?\s*([A-Da-d])/i,
  ];

  for (const pattern of answerPatterns) {
    const match = lower.match(pattern);
    if (match) {
      const letter = match[1].toUpperCase();
      const idx = letter.charCodeAt(0) - 65;
      if (idx >= 0 && idx < options.length) return letter;
    }
  }

  return null;
}

function detectTFAnswer(text: string): boolean | null {
  const lower = text.toLowerCase();
  if (lower.includes('answer') && lower.includes('true')) return true;
  if (lower.includes('answer') && lower.includes('false')) return false;
  return null;
}

function generateExplanation(question: string, correctAnswer: string, options: string[]): string {
  if (options.length > 0) {
    const ansIdx = correctAnswer.charCodeAt(0) - 65;
    if (ansIdx >= 0 && ansIdx < options.length) {
      return `The correct answer is ${correctAnswer}. ${options[ansIdx]} is the right choice because it directly addresses the question.`;
    }
  }
  if (correctAnswer === 'True' || correctAnswer === 'true') {
    return `This statement is true. Based on established facts and principles, the given statement is correct.`;
  }
  if (correctAnswer === 'False' || correctAnswer === 'false') {
    return `This statement is false. The correct response contradicts the given statement.`;
  }
  return `The correct answer is ${correctAnswer}.`;
}

function detectTopic(question: string, subject: SubjectId): string {
  const lower = question.toLowerCase();
  const subjectTopics: Record<SubjectId, string[]> = {
    mathematics: ['algebra', 'geometry', 'numbers', 'statistics', 'probability', 'measurement', 'trigonometry', 'calculus'],
    science: ['biology', 'chemistry', 'physics', 'ecology', 'human body', 'cells', 'forces', 'energy'],
    english: ['grammar', 'vocabulary', 'comprehension', 'writing', 'literature', 'punctuation', 'tenses'],
    'social-studies': ['history', 'geography', 'government', 'culture', 'economics', 'civics'],
    ict: ['hardware', 'software', 'networking', 'programming', 'data processing', 'internet'],
    rme: ['christianity', 'islam', 'moral values', 'religious practices', 'ethics'],
    'creative-arts': ['music', 'visual arts', 'drama', 'dance', 'design', 'craft'],
    'career-tech': ['entrepreneurship', 'accounting', 'vocational skills', 'business', 'trade'],
  };

  const topics = subjectTopics[subject] || subjectTopics.english;
  for (const topic of topics) {
    if (lower.includes(topic.toLowerCase())) return topic;
  }

  const words = question.split(/\s+/).slice(0, 5).join(' ');
  return words.substring(0, 30).trim() || 'General';
}

function parseQuestionsFromText(text: string): Array<{
  questionText: string;
  options: string[];
  rawBlock: string;
}> {
  const results: Array<{ questionText: string; options: string[]; rawBlock: string }> = [];

  const blocks = text.split(/\n\s*\n|\n(?=\d+[\.\)]\s)|(?:^|\n)(?:Q|Question|q|question)[\s\d]*[\.\):]/im);

  for (const block of blocks) {
    const trimmed = block.trim();
    if (trimmed.length < 10) continue;

    const lines = trimmed.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) continue;

    let questionText = '';
    const options: string[] = [];
    let optionSection = false;

    for (const line of lines) {
      const isOption = /^[A-Da-d][\.\):\s]/.test(line) || /^[-•]\s/.test(line);

      if (isOption) {
        optionSection = true;
        const cleaned = cleanOptionText(line);
        if (cleaned.length > 0) options.push(cleaned);
      } else if (!optionSection) {
        if (questionText) questionText += ' ';
        questionText += line.replace(/^\d+[\.\)]\s*/, '').replace(/^(?:Q|Question|q|question)[\s\d]*[\.\):]\s*/i, '');
      }
    }

    if (questionText.length >= 10) {
      results.push({
        questionText: questionText.trim(),
        options,
        rawBlock: trimmed,
      });
    }
  }

  if (results.length === 0) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    let currentQuestion = '';
    const currentOptions: string[] = [];

    for (const line of lines) {
      const isOption = /^[A-Da-d][\.\):\s]/.test(line);
      const isNumbered = /^\d+[\.\)]\s/.test(line);

      if (isNumbered && !isOption) {
        if (currentQuestion.length >= 10) {
          results.push({
            questionText: currentQuestion,
            options: [...currentOptions],
            rawBlock: currentQuestion + '\n' + currentOptions.join('\n'),
          });
        }
        currentQuestion = line.replace(/^\d+[\.\)]\s*/, '');
        currentOptions.length = 0;
      } else if (isOption) {
        currentOptions.push(cleanOptionText(line));
      } else {
        if (currentQuestion) currentQuestion += ' ';
        currentQuestion += line;
      }
    }

    if (currentQuestion.length >= 10) {
      results.push({
        questionText: currentQuestion,
        options: [...currentOptions],
        rawBlock: currentQuestion + '\n' + currentOptions.join('\n'),
      });
    }
  }

  return results;
}

function parseCSVContent(text: string): ExtractedQuestion[] {
  const questions: ExtractedQuestion[] = [];
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  if (lines.length < 2) return questions;

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
  const questionCol = headers.findIndex(h => h.includes('question') || h.includes('q'));
  const typeCol = headers.findIndex(h => h.includes('type'));
  const subjectCol = headers.findIndex(h => h.includes('subject'));
  const classCol = headers.findIndex(h => h.includes('class') || h.includes('level'));
  const diffCol = headers.findIndex(h => h.includes('difficult') || h.includes('level'));
  const optACol = headers.findIndex(h => h === 'a' || h.includes('option a') || h.includes('opta'));
  const optBCol = headers.findIndex(h => h === 'b' || h.includes('option b') || h.includes('optb'));
  const optCCol = headers.findIndex(h => h === 'c' || h.includes('option c') || h.includes('optc'));
  const optDCol = headers.findIndex(h => h === 'd' || h.includes('option d') || h.includes('optd'));
  const answerCol = headers.findIndex(h => h.includes('answer') || h.includes('correct'));
  const explanationCol = headers.findIndex(h => h.includes('explanation') || h.includes('explain'));
  const topicCol = headers.findIndex(h => h.includes('topic'));

  if (questionCol === -1) return questions;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    const questionText = cols[questionCol];
    if (!questionText || questionText.length < 5) continue;

    const type = typeCol >= 0 ? mapType(cols[typeCol]) : undefined;
    const subject = subjectCol >= 0 ? mapSubject(cols[subjectCol]) : undefined;
    const classLevel = classCol >= 0 ? mapClass(cols[classCol]) : undefined;
    const difficulty = diffCol >= 0 ? mapDifficulty(cols[diffCol]) : undefined;

    const options: string[] = [];
    if (optACol >= 0 && cols[optACol]) options.push(cols[optACol]);
    if (optBCol >= 0 && cols[optBCol]) options.push(cols[optBCol]);
    if (optCCol >= 0 && cols[optCCol]) options.push(cols[optCCol]);
    if (optDCol >= 0 && cols[optDCol]) options.push(cols[optDCol]);

    const detectedType = type || detectQuestionType(questionText, options.length > 0 ? options : undefined);
    const detectedSubject = subject || detectSubject(questionText);
    const detectedClass = classLevel || detectClassLevel(questionText);
    const detectedDifficulty = difficulty || detectDifficulty(questionText, options.length > 0 ? options : undefined);

    let correctAnswer = answerCol >= 0 ? cols[answerCol] : '';
    if (!correctAnswer && detectedType === 'multiple-choice' && options.length > 0) {
      correctAnswer = detectCorrectAnswerFromText(lines[i], options) || 'A';
    }
    if (!correctAnswer && detectedType === 'true-false') {
      correctAnswer = 'True';
    }

    const explanation = explanationCol >= 0 ? cols[explanationCol] : '';
    const topic = topicCol >= 0 ? cols[topicCol] : detectTopic(questionText, detectedSubject);

    questions.push({
      id: generateId(),
      question: questionText,
      type: detectedType,
      options: detectedType === 'multiple-choice' ? (options.length >= 4 ? options.slice(0, 4) : [...options, ...Array(4 - options.length).fill('')]) : [],
      correctAnswer: correctAnswer || 'A',
      explanation: explanation || generateExplanation(questionText, correctAnswer || 'A', options),
      subject: detectedSubject,
      classLevel: detectedClass,
      difficulty: detectedDifficulty,
      topic,
      confidence: 0.85,
      status: 'pending',
      originalIndex: i - 1,
    });
  }

  return questions;
}

function parseJSONContent(text: string): ExtractedQuestion[] {
  try {
    const data = JSON.parse(text);
    const items = Array.isArray(data) ? data : data.questions || data.data || [];
    const questions: ExtractedQuestion[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.question && !item.text && !item.q) continue;

      const questionText = item.question || item.text || item.q || '';
      const rawOptions = item.options || item.choices || [];
      const options = Array.isArray(rawOptions)
        ? rawOptions.map((o: string | { text?: string; value?: string }) => typeof o === 'string' ? o : o.text || o.value || '')
        : [];

      const type = item.type ? mapType(item.type) : detectQuestionType(questionText, options);
      const subject = item.subject ? mapSubject(item.subject) : detectSubject(questionText);
      const classLevel = item.classLevel || item.class ? mapClass(item.classLevel || item.class) : detectClassLevel(questionText);
      const difficulty = item.difficulty ? mapDifficulty(item.difficulty) : detectDifficulty(questionText, options);

      let correctAnswer = item.correctAnswer || item.answer || item.correct || item.correct_option || item.correctOption || item.answerKey || '';
      if (typeof correctAnswer === 'number' && options.length > 0) {
        correctAnswer = String.fromCharCode(65 + correctAnswer);
      }
      if (typeof correctAnswer === 'string' && /^\d+$/.test(correctAnswer.trim()) && options.length > 0) {
        const idx = parseInt(correctAnswer.trim(), 10);
        if (idx >= 0 && idx < options.length) {
          correctAnswer = String.fromCharCode(65 + idx);
        }
      }

      questions.push({
        id: generateId(),
        question: questionText,
        type,
        options: type === 'multiple-choice' ? (options.length >= 4 ? options.slice(0, 4) : [...options, ...Array(4 - options.length).fill('')]) : [],
        correctAnswer: String(correctAnswer) || 'A',
        explanation: item.explanation || item.explain || generateExplanation(questionText, String(correctAnswer) || 'A', options),
        subject,
        classLevel,
        difficulty,
        topic: item.topic || detectTopic(questionText, subject),
        confidence: 0.9,
        status: 'pending',
        originalIndex: i,
      });
    }
    return questions;
  } catch {
    return [];
  }
}

function mapType(val: string): QuestionType {
  const lower = val.toLowerCase().trim();
  if (lower.includes('true') || lower.includes('tf') || lower.includes('t/f')) return 'true-false';
  return 'multiple-choice';
}

function mapSubject(val: string): SubjectId {
  const lower = val.toLowerCase().trim();
  if (lower.includes('math')) return 'mathematics';
  if (lower.includes('science')) return 'science';
  if (lower.includes('english')) return 'english';
  if (lower.includes('social')) return 'social-studies';
  if (lower.includes('ict') || lower.includes('computer')) return 'ict';
  if (lower.includes('religious') || lower.includes('rme')) return 'rme';
  if (lower.includes('creative') || lower.includes('art')) return 'creative-arts';
  if (lower.includes('career') || lower.includes('vocational')) return 'career-tech';
  return detectSubject(val);
}

function mapClass(val: string): JHSCategory {
  const lower = val.toLowerCase().trim();
  if (lower.includes('1') || lower.includes('jhs 1') || lower.includes('jhs1') || lower === '7') return 'jhs1';
  if (lower.includes('3') || lower.includes('jhs 3') || lower.includes('jhs3') || lower === '9') return 'jhs3';
  return 'jhs2';
}

function mapDifficulty(val: string): DifficultyLevel {
  const lower = val.toLowerCase().trim();
  if (lower.includes('beginner') || lower.includes('easy') || lower.includes('simple') || lower.includes('low')) return 'beginner';
  if (lower.includes('expert') || lower.includes('hard') || lower.includes('difficult') || lower.includes('advanced') || lower.includes('high')) return 'expert';
  return 'intermediate';
}

export function extractQuestionsFromText(text: string): ExtractedQuestion[] {
  const trimmed = text.trim();

  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    const jsonQuestions = parseJSONContent(trimmed);
    if (jsonQuestions.length > 0) return jsonQuestions;
  }

  const hasCSVHeaders = /^(question|q|text|subject|type|answer|option)/im.test(trimmed.split('\n')[0] || '');
  if (hasCSVHeaders && trimmed.includes(',')) {
    const csvQuestions = parseCSVContent(trimmed);
    if (csvQuestions.length > 0) return csvQuestions;
  }

  const rawQuestions = parseQuestionsFromText(trimmed);
  const questions: ExtractedQuestion[] = [];

  for (let i = 0; i < rawQuestions.length; i++) {
    const rq = rawQuestions[i];
    const type = detectQuestionType(rq.questionText, rq.options.length > 0 ? rq.options : undefined);
    const subject = detectSubject(rq.questionText);
    const classLevel = detectClassLevel(rq.questionText);
    const difficulty = detectDifficulty(rq.questionText, rq.options.length > 0 ? rq.options : undefined);

    let correctAnswer = detectCorrectAnswerFromText(rq.rawBlock, rq.options) || '';
    if (!correctAnswer && type === 'true-false') {
      const tfAnswer = detectTFAnswer(rq.rawBlock);
      correctAnswer = tfAnswer !== null ? String(tfAnswer) : 'True';
    }
    if (!correctAnswer && type === 'multiple-choice' && rq.options.length > 0) {
      correctAnswer = 'A';
    }

    const options = type === 'multiple-choice'
      ? (rq.options.length >= 4 ? rq.options.slice(0, 4) : [...rq.options, ...Array(Math.max(0, 4 - rq.options.length)).fill('')])
      : [];

    questions.push({
      id: generateId(),
      question: rq.questionText,
      type,
      options,
      correctAnswer,
      explanation: generateExplanation(rq.questionText, correctAnswer, rq.options),
      subject,
      classLevel,
      difficulty,
      topic: detectTopic(rq.questionText, subject),
      confidence: rq.options.length >= 4 ? 0.8 : 0.6,
      status: 'pending',
      originalIndex: i,
    });
  }

  return questions;
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

export function isTextBasedFile(filename: string): boolean {
  const ext = getFileExtension(filename);
  return ['csv', 'txt', 'json'].includes(ext);
}

export function isServerParsedFile(filename: string): boolean {
  const ext = getFileExtension(filename);
  return ['pdf', 'docx', 'doc', 'xlsx', 'xls'].includes(ext);
}

export function isImageFile(filename: string): boolean {
  const ext = getFileExtension(filename);
  return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp'].includes(ext);
}

export function getSubjectLabel(subject: SubjectId): string {
  const labels: Record<SubjectId, string> = {
    mathematics: 'Mathematics',
    science: 'Science',
    english: 'English Language',
    'social-studies': 'Social Studies',
    ict: 'ICT',
    rme: 'Religious & Moral Education',
    'creative-arts': 'Creative Arts & Design',
    'career-tech': 'Career Technology',
  };
  return labels[subject] || subject;
}

export function getClassLabel(cls: JHSCategory): string {
  return cls === 'jhs1' ? 'JHS 1' : cls === 'jhs2' ? 'JHS 2' : 'JHS 3';
}

export function getDifficultyLabel(diff: DifficultyLevel): string {
  return diff === 'beginner' ? 'Beginner' : diff === 'expert' ? 'Expert' : 'Intermediate';
}
