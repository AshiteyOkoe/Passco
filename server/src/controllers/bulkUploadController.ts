import { Response } from 'express';
import { AuthRequest } from '../types';
import { supabase } from '../config/supabase';

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
}

function isDuplicate(newQuestion: string, newAnswer: string, existingNormalized: Map<string, string>): boolean {
  const norm = normalizeText(newQuestion);
  if (existingNormalized.has(norm)) {
    return true;
  }
  const words = norm.split(' ').filter((w) => w.length > 3);
  for (const [exNorm] of existingNormalized) {
    const exWords = exNorm.split(' ').filter((w: string) => w.length > 3);
    if (words.length > 0 && exWords.length > 0) {
      const overlap = words.filter((w: string) => exWords.includes(w)).length;
      const similarity = overlap / Math.max(words.length, exWords.length);
      if (similarity >= 0.85) {
        return true;
      }
    }
  }
  return false;
}

export async function parseUploadedFile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    const { data: bulkUpload, error: insertError } = await supabase
      .from('bulk_uploads')
      .insert({
        user_id: req.user!.id,
        file_name: file.originalname,
        mime_type: file.mimetype,
        file_size: file.size,
        status: 'processing',
      })
      .select('id')
      .single();

    if (insertError) throw insertError;

    let extractedText = '';
    const mime = file.mimetype;

    try {
      if (mime === 'application/pdf') {
        const pdfParse = (await import('pdf-parse')).default;
        const fs = await import('fs');
        const buffer = fs.readFileSync(file.path);
        const data = await pdfParse(buffer);
        extractedText = data.text;
      } else if (
        mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        mime === 'application/msword'
      ) {
        const mammoth = await import('mammoth');
        const fs = await import('fs');
        const buffer = fs.readFileSync(file.path);
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value;
      } else if (
        mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        mime === 'application/vnd.ms-excel' ||
        mime === 'text/csv'
      ) {
        const XLSX = await import('xlsx');
        const workbook = XLSX.readFile(file.path);
        const allText: string[] = [];
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          const csv = XLSX.utils.sheet_to_csv(sheet);
          allText.push(csv);
        }
        extractedText = allText.join('\n\n');
      } else if (mime === 'text/plain' || mime === 'text/json' || mime === 'application/json') {
        const fs = await import('fs');
        extractedText = fs.readFileSync(file.path, 'utf-8');
      } else if (mime.startsWith('image/')) {
        const { createWorker } = await import('tesseract.js');
        const worker = await createWorker('eng');
        const { data } = await worker.recognize(file.path);
        extractedText = data.text;
        await worker.terminate();
      } else {
        const fs = await import('fs');
        extractedText = fs.readFileSync(file.path, 'utf-8');
      }
    } catch (parseError) {
      await supabase
        .from('bulk_uploads')
        .update({
          status: 'failed',
          error_message: `Failed to parse file: ${(parseError as Error).message}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bulkUpload.id);
      res.status(500).json({ message: 'Failed to parse file', bulkUploadId: bulkUpload.id });
      return;
    }

    await supabase
      .from('bulk_uploads')
      .update({ status: 'parsed', updated_at: new Date().toISOString() })
      .eq('id', bulkUpload.id);

    res.json({
      bulkUploadId: bulkUpload.id,
      fileName: file.originalname,
      extractedText,
      status: 'parsed',
    });
  } catch (error) {
    console.error('Parse file error:', error);
    res.status(500).json({ message: 'Failed to process upload' });
  }
}

export async function saveBulkQuestions(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { bulkUploadId, questions } = req.body;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      res.status(400).json({ message: 'No questions provided' });
      return;
    }

    const { data: existingQuestions } = await supabase
      .from('questions')
      .select('question, correct_answer')
      .limit(10000);

    const existingNormalized = new Map<string, string>();
    (existingQuestions || []).forEach((eq) => {
      existingNormalized.set(normalizeText(eq.question), normalizeText(String(eq.correct_answer)));
    });

    const skippedDuplicates: string[] = [];
    const filteredQuestions: Record<string, unknown>[] = [];

    for (const q of questions) {
      const qText = (q.question as string) || '';
      const qAnswer = (q.correctAnswer as string) || '';

      if (isDuplicate(qText, qAnswer, existingNormalized)) {
        skippedDuplicates.push(qText);
        continue;
      }

      const norm = normalizeText(qText);
      existingNormalized.set(norm, normalizeText(qAnswer));
      filteredQuestions.push(q);
    }

    if (filteredQuestions.length === 0) {
      if (bulkUploadId) {
        await supabase
          .from('bulk_uploads')
          .update({
            status: 'completed',
            total_questions: questions.length,
            saved_questions: 0,
            error_message: `All ${questions.length} questions were duplicates`,
            updated_at: new Date().toISOString(),
          })
          .eq('id', bulkUploadId);
      }
      res.status(200).json({
        message: 'All questions were duplicates — nothing saved',
        savedCount: 0,
        skippedCount: skippedDuplicates.length,
        skippedDuplicates,
      });
      return;
    }

    const { data: doc, error: docError } = await supabase
      .from('documents')
      .insert({
        user_id: req.user!.id,
        original_name: `Bulk Upload - ${new Date().toLocaleDateString()}`,
        storage_path: `bulk-upload-${Date.now()}`,
        mime_type: 'application/bulk-upload',
        file_size: 0,
        extracted_text: `Bulk upload of ${filteredQuestions.length} questions`,
        topics: [...new Set(filteredQuestions.map((q: Record<string, unknown>) => (q.topic as string) || (q.subject as string) || 'General'))] as string[],
        status: 'ready',
      })
      .select('id')
      .single();

    if (docError) throw docError;

    const subjectBreakdown: Record<string, number> = {};
    const classBreakdown: Record<string, number> = {};
    const difficultyBreakdown: Record<string, number> = {};

    const insertRows = filteredQuestions.map((q: Record<string, unknown>) => {
      const subj = (q.subject as string) || 'General';
      subjectBreakdown[subj] = (subjectBreakdown[subj] || 0) + 1;
      const cls = (q.classLevel as string) || 'unknown';
      classBreakdown[cls] = (classBreakdown[cls] || 0) + 1;
      const diff = (q.difficulty as string) || 'intermediate';
      difficultyBreakdown[diff] = (difficultyBreakdown[diff] || 0) + 1;

      return {
        document_id: doc.id,
        created_by: req.user!.id,
        question: q.question,
        type: q.type || 'multiple-choice',
        options: q.type === 'multiple-choice' ? q.options : [],
        correct_answer: q.correctAnswer,
        explanation: q.explanation || '',
        difficulty: q.difficulty || 'intermediate',
        topic: (q.topic as string) || (q.subject as string) || 'General',
        subject: subj,
        class_level: q.classLevel || '',
        approved: req.user?.role === 'admin',
      };
    });

    const { error: qError } = await supabase.from('questions').insert(insertRows);
    if (qError) throw qError;

    if (bulkUploadId) {
      await supabase
        .from('bulk_uploads')
        .update({
          status: 'completed',
          total_questions: questions.length,
          saved_questions: filteredQuestions.length,
          subject_breakdown: subjectBreakdown,
          class_breakdown: classBreakdown,
          difficulty_breakdown: difficultyBreakdown,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bulkUploadId);
    }

    res.status(201).json({
      message: skippedDuplicates.length > 0
        ? `${filteredQuestions.length} questions saved, ${skippedDuplicates.length} duplicates skipped`
        : `${filteredQuestions.length} questions saved successfully`,
      count: filteredQuestions.length,
      savedCount: filteredQuestions.length,
      skippedCount: skippedDuplicates.length,
      skippedDuplicates,
      documentId: doc.id,
      subjectBreakdown,
      classBreakdown,
      difficultyBreakdown,
    });
  } catch (error) {
    console.error('Save bulk questions error:', error);
    res.status(500).json({ message: 'Failed to save questions' });
  }
}

export async function getBulkUploads(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { data: uploads } = await supabase
      .from('bulk_uploads')
      .select('*')
      .eq('user_id', req.user!.id)
      .order('created_at', { ascending: false })
      .limit(50);

    res.json({ uploads: uploads || [] });
  } catch (error) {
    console.error('Get bulk uploads error:', error);
    res.status(500).json({ message: 'Failed to fetch uploads' });
  }
}
