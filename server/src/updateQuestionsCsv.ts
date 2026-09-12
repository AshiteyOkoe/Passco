import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { supabase } from './config/supabase';
import {
  normalizeSubject,
  normalizeClassLevel,
  normalizeDifficulty,
  normalizeTrueFalseAnswer,
  isTrueFalseOptions,
  resolveAnswerToText,
} from './utils/questionNormalize';

function matchKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/[\u00ad\u200b]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'for', 'of', 'in', 'on', 'with', 'by', 'at', 'to', 'from',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'will', 'would',
  'should', 'could', 'can', 'must', 'shall', 'may', 'this', 'that', 'these', 'those', 'it', 'as',
  'his', 'her', 'its', 'our', 'their', 'your', 'you', 'he', 'she', 'we', 'they', 'i', 'not',
  'so', 'if', 'when', 'which', 'who', 'whom', 'whose', 'what', 'how', 'why', 'am',
]);

function tokens(text: string): Set<string> {
  return new Set(
    matchKey(text)
      .split(/\s+/)
      .filter((w) => w.length > 1 && !STOPWORDS.has(w))
  );
}

function overlapScore(candidate: Set<string>, dbRow: Set<string>): number {
  if (candidate.size === 0) return 0;
  let inter = 0;
  for (const t of candidate) if (dbRow.has(t)) inter += 1;
  return inter / candidate.size;
}

const FUZZY_THRESHOLD = 0.6;

interface CsvRow {
  question: string;
  subject: string;
  classLevel: string;
  difficulty: string;
  options: string[];
  answer: string;
  explanation: string;
  topic: string;
}

interface DbQuestion {
  id: string;
  subject: string;
  class_level: string;
  question: string;
  correct_answer: unknown;
}

function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const ch = content[i];
    if (inQuotes) {
      if (ch === '"') {
        if (content[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && content[i + 1] === '\n') i += 1;
      row.push(field);
      field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  row.push(field);
  if (row.length > 1 || row[0] !== '') rows.push(row);
  return rows;
}

function headerIndexes(header: string[]): Record<string, number> {
  const idx: Record<string, number> = {};
  header.forEach((h, i) => {
    const key = h.trim().toLowerCase().replace(/[\s-]+/g, '').replace(/[^a-z0-9]/g, '');
    if (idx[key] === undefined) idx[key] = i;
  });
  return idx;
}

function cell(cols: string[], idx: Record<string, number>, names: string[]): string {
  for (const n of names) {
    if (idx[n] !== undefined && idx[n] < cols.length) return (cols[idx[n]] ?? '').trim();
  }
  return '';
}

interface NormalizedRow {
  question: string;
  subject: string;
  classLevel: string;
  difficulty: string;
  type: 'multiple-choice' | 'true-false';
  options: string[];
  correct_answer: string | boolean;
  explanation: string;
  topic: string;
}

function buildRow(s: CsvRow): { ok: true; row: NormalizedRow } | { ok: false; reason: string } {
  const qText = s.question.trim();
  if (qText.length < 5) return { ok: false, reason: 'question too short or empty' };

  const subject = normalizeSubject(s.subject);
  const classLevel = normalizeClassLevel(s.classLevel);
  const difficulty = normalizeDifficulty(s.difficulty);
  if (!subject) return { ok: false, reason: `unrecognized subject "${s.subject}"` };

  const options = s.options.map((o) => String(o ?? '').trim());
  const usable = options.filter((o) => o !== '');

  if (isTrueFalseOptions(usable)) {
    const tf = normalizeTrueFalseAnswer(s.answer);
    if (tf === null) return { ok: false, reason: `answer "${s.answer}" does not resolve to true/false` };
    return {
      ok: true,
      row: {
        question: qText,
        subject,
        classLevel,
        difficulty,
        type: 'true-false',
        options: [],
        correct_answer: tf,
        explanation: s.explanation,
        topic: s.topic || subject,
      },
    };
  }

  const resolved = resolveAnswerToText(usable, s.answer);
  if (!resolved.ok) return { ok: false, reason: `correct answer unverifiable: ${resolved.reason}` };

  return {
    ok: true,
    row: {
      question: qText,
      subject,
      classLevel,
      difficulty,
      type: 'multiple-choice',
      options: usable,
      correct_answer: resolved.value,
      explanation: s.explanation,
      topic: s.topic || subject,
    },
  };
}

async function getAllQuestions(): Promise<DbQuestion[]> {
  const all: DbQuestion[] = [];
  let from = 0;
  let batch: DbQuestion[] = [];
  do {
    const { data } = await supabase
      .from('questions')
      .select('id, question, subject, class_level, correct_answer')
      .range(from, from + 999);
    batch = (data || []) as DbQuestion[];
    all.push(...batch);
    from += batch.length;
  } while (batch.length === 1000);
  return all;
}

function loadFiles(paths: string[]): { file: string; source: CsvRow[]; startLine: number }[] {
  const out: { file: string; source: CsvRow[]; startLine: number }[] = [];
  for (const filePath of paths) {
    if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = parseCsv(content);
    if (parsed.length < 2) throw new Error(`No data rows in ${filePath}`);
    const idx = headerIndexes(parsed[0]);
    if (idx['question'] === undefined || idx['answer'] === undefined) {
      throw new Error(`Header in ${filePath} must include "question" and "answer" columns`);
    }
    const source: CsvRow[] = [];
    for (let i = 1; i < parsed.length; i += 1) {
      const cols = parsed[i];
      source.push({
        question: cell(cols, idx, ['question']),
        subject: cell(cols, idx, ['subject', 'subjectname']),
        classLevel: cell(cols, idx, ['class_level', 'classlevel', 'class']),
        difficulty: cell(cols, idx, ['difficulty']),
        options: [
          cell(cols, idx, ['a', 'optiona', 'option1']),
          cell(cols, idx, ['b', 'optionb', 'option2']),
          cell(cols, idx, ['c', 'optionc', 'option3']),
          cell(cols, idx, ['d', 'optiond', 'option4']),
        ],
        answer: cell(cols, idx, ['answer', 'correctanswer', 'correct_answer', 'key']),
        explanation: cell(cols, idx, ['explanation']),
        topic: cell(cols, idx, ['topic']),
      });
    }
    out.push({ file: filePath, source, startLine: 2 });
  }
  return out;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes('--dry-run');
  const paths = argv.filter((a) => a !== '--dry-run');
  if (paths.length === 0) {
    console.error('Usage: npx tsx src/updateQuestionsCsv.ts <csv...> [--dry-run]');
    process.exit(1);
  }

  const files = loadFiles(paths);

  console.log(`Loading existing questions from DB...`);
  const existing = await getAllQuestions();
  const byNorm = new Map<string, DbQuestion[]>();
  for (const q of existing) {
    const key = matchKey(q.question);
    const list = byNorm.get(key);
    if (list) list.push(q);
    else byNorm.set(key, [q]);
  }
  console.log(`DB has ${existing.length} questions, ${byNorm.size} unique normalized texts.`);

  let updated = 0;
  let fuzzyUpdated = 0;
  let created = 0;
  let rejected = 0;
  let dupInFile = 0;
  const rejectedRows: Array<{ file: string; line: number; reason: string; question: string }> = [];
  const createdRows: Array<{ file: string; line: number; subject: string; classLevel: string; question: string }> = [];
  const updatedBreakdown: Record<string, Record<string, number>> = {};
  const fuzzyBreakdown: Record<string, Record<string, number>> = {};
  const createdBreakdown: Record<string, Record<string, number>> = {};
  const updateBatchPlans: Array<{ ids: string[]; row: NormalizedRow }> = [];
  const fuzzyPlans: Array<{ id: string; row: NormalizedRow; score: number; matchedText: string }> = [];
  const pendingFuzzy: Array<{ row: NormalizedRow; file: string; line: number }> = [];
  const insertCandidates: Array<{ docId: string; creator: string; row: NormalizedRow }> = [];
  const seenInFile = new Map<string, string>();
  const claimedIds = new Set<string>();
  const docStatus = new Map<string, { docId: string; creator: string }>();

  const bump = (map: Record<string, Record<string, number>>, s: string, c: string) => {
    map[s] = map[s] || {};
    map[s][c] = (map[s][c] || 0) + 1;
  };

  for (const { file, source, startLine } of files) {
    const creatorRes = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();
    const creator = process.env.IMPORT_CREATED_BY || (creatorRes.data?.id as string | undefined) || '';
    if (!creator) throw new Error('No admin user found to attribute inserted questions. Set IMPORT_CREATED_BY.');
    const docId = dryRun ? '' : await (async () => {
      const fileName = path.basename(file);
      const { data: doc, error: docError } = await supabase
        .from('documents')
        .insert({
          user_id: creator,
          original_name: fileName,
          storage_path: `csv-update-import-${Date.now()}`,
          mime_type: 'text/csv',
          file_size: fs.statSync(file).size,
          extracted_text: 'Bulk CSV question update',
          topics: [],
          status: 'ready',
        })
        .select('id')
        .single();
      if (docError) throw docError;
      return doc.id;
    })();
    docStatus.set(file, { docId, creator });

    for (let i = 0; i < source.length; i += 1) {
      const s = source[i];
      const line = startLine + i;
      const qText = s.question.trim();
      if (!qText && !s.answer) continue;

      const norm = matchKey(qText);
      const prev = seenInFile.get(norm);
      if (prev !== undefined) {
        dupInFile += 1;
        rejectedRows.push({ file, line, reason: `duplicate of question text first seen on line ${prev}`, question: qText.slice(0, 80) });
        continue;
      }
      seenInFile.set(norm, String(line));

      const built = buildRow(s);
      if (!built.ok) {
        rejected += 1;
        rejectedRows.push({ file, line, reason: built.reason, question: qText.slice(0, 80) });
        continue;
      }
      const { row } = built;

      const matches = byNorm.get(norm);
      if (matches && matches.length > 0) {
        updated += 1;
        bump(updatedBreakdown, row.subject, row.classLevel || 'unknown');
        for (const m of matches) claimedIds.add(m.id);
        updateBatchPlans.push({ ids: matches.map((m) => m.id), row });
      } else {
        pendingFuzzy.push({ row, file, line });
      }
    }
  }

  const fuzzyPool = existing.map((q) => ({
    id: q.id,
    subject: q.subject,
    class_level: q.class_level,
    tokenSet: tokens(q.question),
    text: q.question,
  }));

  for (const p of pendingFuzzy) {
    let best = 0;
    let bestDb: (typeof fuzzyPool)[number] | null = null;
    const pool = fuzzyPool.filter(
      (q) => q.subject === p.row.subject && q.class_level === (p.row.classLevel || q.class_level)
    );
    for (const q of pool) {
      if (claimedIds.has(q.id)) continue;
      const s = overlapScore(tokens(p.row.question), q.tokenSet);
      if (s > best) {
        best = s;
        bestDb = q;
      }
    }
    if (best >= FUZZY_THRESHOLD && bestDb) {
      fuzzyUpdated += 1;
      bump(fuzzyBreakdown, p.row.subject, p.row.classLevel || 'unknown');
      claimedIds.add(bestDb.id);
      fuzzyPlans.push({ id: bestDb.id, row: p.row, score: best, matchedText: bestDb.text });
    } else {
      created += 1;
      bump(createdBreakdown, p.row.subject, p.row.classLevel || 'unknown');
      createdRows.push({ file: p.file, line: p.line, subject: p.row.subject, classLevel: p.row.classLevel || 'unknown', question: p.row.question });
      insertCandidates.push({ docId: docStatus.get(p.file)!.docId, creator: docStatus.get(p.file)!.creator, row: p.row });
    }
  }

  console.log(`\n=== PLAN (before writing) ===`);
  console.log(`Rows read:        ${files.reduce((n, f) => n + f.source.length, 0)}`);
  console.log(`To update:        ${updated}  (matched by question text)`);
  console.log(`To fuzzy-update:  ${fuzzyUpdated}  (reworded versions, overwritten in place)`);
  console.log(`To insert:        ${created}  (no existing text in DB)`);
  console.log(`Rejected/skipped: ${rejected + dupInFile}  (${rejected} validation failures, ${dupInFile} in-file duplicates)`);

  console.log('\nUpdated breakdown (subject/class):');
  for (const [s, cm] of Object.entries(updatedBreakdown)) {
    for (const [c, n] of Object.entries(cm)) console.log(`  ${s} / ${c}: ${n}`);
  }
  if (Object.keys(fuzzyBreakdown).length > 0) {
    console.log('\nFuzzy-update breakdown (subject/class):');
    for (const [s, cm] of Object.entries(fuzzyBreakdown)) {
      for (const [c, n] of Object.entries(cm)) console.log(`  ${s} / ${c}: ${n}`);
    }
  }
  console.log('\nInsert breakdown (subject/class):');
  for (const [s, cm] of Object.entries(createdBreakdown)) {
    for (const [c, n] of Object.entries(cm)) console.log(`  ${s} / ${c}: ${n}`);
  }

  for (const r of rejectedRows) {
    console.log(`  [line ${r.line}] ${r.reason} :: ${r.question}  (${r.file})`);
  }

  if (fuzzyPlans.length > 0) {
    console.log('\nQuestions that will OVERWRITE a reworded DB row in place:');
    for (const f of fuzzyPlans) {
      console.log(`  [${f.score.toFixed(2)}] "${f.row.question.slice(0, 70)}"`);
      console.log(`        -> replaces "${f.matchedText.slice(0, 80)}" (${f.id})`);
    }
  }

  if (createdRows.length > 0) {
    console.log('\nQuestions that will be INSERTED as new (no equivalent text in DB):');
    for (const c of createdRows) console.log(`  [${c.file} line ${c.line}] ${c.subject}/${c.classLevel} :: ${c.question}`);
  }

  if (dryRun) {
    console.log('\nDry run only — no changes written.');
    process.exit(0);
  }

  console.log('\nWriting updates...');
  const chunkSize = 500;
  let updatedWritten = 0;
  for (let i = 0; i < updateBatchPlans.length; i += chunkSize) {
    const chunk = updateBatchPlans.slice(i, i + chunkSize);
    for (const plan of chunk) {
      const { error } = await supabase
        .from('questions')
        .update({
          question: plan.row.question,
          type: plan.row.type,
          options: plan.row.options,
          correct_answer: plan.row.correct_answer,
          explanation: plan.row.explanation || '',
          difficulty: plan.row.difficulty,
          topic: plan.row.topic,
          subject: plan.row.subject,
          class_level: plan.row.classLevel,
        })
        .in('id', plan.ids);
      if (error) {
        console.error(`  update failed for ids ${plan.ids.join(',')}: ${error.message}`);
        process.exit(1);
      }
      updatedWritten += plan.ids.length;
    }
  }
  console.log(`Updated ${updated} question groups -> ${updatedWritten} rows.`);

  if (fuzzyPlans.length > 0) {
    for (const f of fuzzyPlans) {
      const { error } = await supabase
        .from('questions')
        .update({
          question: f.row.question,
          type: f.row.type,
          options: f.row.options,
          correct_answer: f.row.correct_answer,
          explanation: f.row.explanation || '',
          difficulty: f.row.difficulty,
          topic: f.row.topic,
          subject: f.row.subject,
          class_level: f.row.classLevel,
        })
        .eq('id', f.id);
      if (error) {
        console.error(`  fuzzy update failed for ${f.id}: ${error.message}`);
        process.exit(1);
      }
    }
  }
  console.log(`Fuzzy-updated ${fuzzyPlans.length} reworded questions in place.`);

  const insertRows = insertCandidates.map(({ docId, creator, row }) => ({
    document_id: docId,
    created_by: creator,
    question: row.question,
    type: row.type,
    options: row.options,
    correct_answer: row.correct_answer,
    explanation: row.explanation || '',
    difficulty: row.difficulty,
    topic: row.topic,
    subject: row.subject,
    class_level: row.classLevel,
    approved: true,
  }));
  for (let i = 0; i < insertRows.length; i += chunkSize) {
    const chunk = insertRows.slice(i, i + chunkSize);
    const { error } = await supabase.from('questions').insert(chunk);
    if (error) {
      console.error(`  insert failed: ${error.message}`);
      process.exit(1);
    }
  }
  console.log(`Inserted ${insertRows.length} new questions.`);

  const after = await getAllQuestions();
  console.log(`\nDB question count now: ${after.length} (was ${existing.length}).`);
}

main().catch((e) => {
  console.error('Update failed:', e);
  process.exit(1);
});