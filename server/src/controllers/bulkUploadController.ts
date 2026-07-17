import { Response } from 'express';
import { AuthRequest } from '../types';
import BulkUpload from '../models/BulkUpload';
import Document from '../models/Document';
import Question from '../models/Question';

export async function parseUploadedFile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    const bulkUpload = await BulkUpload.create({
      userId: req.user!.id,
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      status: 'processing',
    });

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
      await BulkUpload.findByIdAndUpdate(bulkUpload._id, {
        status: 'failed',
        errorMessage: `Failed to parse file: ${(parseError as Error).message}`,
      });
      res.status(500).json({ message: 'Failed to parse file', bulkUploadId: bulkUpload._id });
      return;
    }

    await BulkUpload.findByIdAndUpdate(bulkUpload._id, { status: 'parsed' });

    res.json({
      bulkUploadId: bulkUpload._id,
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

    const doc = await Document.create({
      userId: req.user!.id,
      originalName: `Bulk Upload - ${new Date().toLocaleDateString()}`,
      storagePath: `bulk-upload-${Date.now()}`,
      mimeType: 'application/bulk-upload',
      fileSize: 0,
      extractedText: `Bulk upload of ${questions.length} questions`,
      topics: [...new Set(questions.map((q: { topic?: string }) => q.topic).filter(Boolean))],
      status: 'ready',
    });

    const createdQuestions = [];
    const subjectBreakdown: Record<string, number> = {};
    const classBreakdown: Record<string, number> = {};
    const difficultyBreakdown: Record<string, number> = {};

    for (const q of questions) {
      const question = await Question.create({
        documentId: doc._id,
        createdBy: req.user!.id,
        question: q.question,
        type: q.type || 'multiple-choice',
        options: q.type === 'multiple-choice' ? q.options : undefined,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || '',
        difficulty: q.difficulty || 'intermediate',
        topic: q.topic || q.subject || 'General',
        subject: q.subject || '',
        classLevel: q.classLevel || '',
        approved: req.user?.role === 'admin',
      });
      createdQuestions.push(question);

      const subj = q.subject || 'General';
      subjectBreakdown[subj] = (subjectBreakdown[subj] || 0) + 1;
      const cls = q.classLevel || 'unknown';
      classBreakdown[cls] = (classBreakdown[cls] || 0) + 1;
      const diff = q.difficulty || 'intermediate';
      difficultyBreakdown[diff] = (difficultyBreakdown[diff] || 0) + 1;
    }

    if (bulkUploadId) {
      await BulkUpload.findByIdAndUpdate(bulkUploadId, {
        status: 'completed',
        totalQuestions: questions.length,
        savedQuestions: createdQuestions.length,
        subjectBreakdown,
        classBreakdown,
        difficultyBreakdown,
      });
    }

    res.status(201).json({
      message: `${createdQuestions.length} questions saved successfully`,
      count: createdQuestions.length,
      documentId: doc._id,
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
    const uploads = await BulkUpload.find({ userId: req.user!.id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ uploads });
  } catch (error) {
    console.error('Get bulk uploads error:', error);
    res.status(500).json({ message: 'Failed to fetch uploads' });
  }
}
