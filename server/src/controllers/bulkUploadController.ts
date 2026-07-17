import { Response } from 'express';
import { AuthRequest } from '../types';
import { supabase } from '../config/supabase';

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

    const { data: doc, error: docError } = await supabase
      .from('documents')
      .insert({
        user_id: req.user!.id,
        original_name: `Bulk Upload - ${new Date().toLocaleDateString()}`,
        storage_path: `bulk-upload-${Date.now()}`,
        mime_type: 'application/bulk-upload',
        file_size: 0,
        extracted_text: `Bulk upload of ${questions.length} questions`,
        topics: [...new Set(questions.map((q: { topic?: string; subject?: string }) => q.topic || q.subject).filter(Boolean))] as string[],
        status: 'ready',
      })
      .select('id')
      .single();

    if (docError) throw docError;

    const subjectBreakdown: Record<string, number> = {};
    const classBreakdown: Record<string, number> = {};
    const difficultyBreakdown: Record<string, number> = {};

    const insertRows = questions.map((q: Record<string, unknown>) => {
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
          saved_questions: questions.length,
          subject_breakdown: subjectBreakdown,
          class_breakdown: classBreakdown,
          difficulty_breakdown: difficultyBreakdown,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bulkUploadId);
    }

    res.status(201).json({
      message: `${questions.length} questions saved successfully`,
      count: questions.length,
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
