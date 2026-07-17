import { Response } from 'express';
import Document from '../models/Document';
import { parseFile, extractTopics } from '../services/fileParser';
import { AuthRequest } from '../types';

export async function uploadFile(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    const userId = req.user?.id;

    const document = await Document.create({
      userId,
      originalName: req.file.originalname,
      storagePath: req.file.path,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      status: 'processing',
    });

    res.status(201).json({
      message: 'File uploaded successfully',
      document: {
        id: document._id,
        originalName: document.originalName,
        mimeType: document.mimeType,
        fileSize: document.fileSize,
        status: document.status,
        createdAt: document.createdAt,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'File upload failed' });
  }
}

export async function processFile(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { documentId } = req.params;

    const document = await Document.findById(documentId);
    if (!document) {
      res.status(404).json({ message: 'Document not found' });
      return;
    }

    if (document.userId.toString() !== req.user?.id && req.user?.role !== 'admin') {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }

    const text = await parseFile(document.storagePath, document.mimeType);

    if (!text || text.trim().length === 0) {
      document.status = 'failed';
      await document.save();
      res.status(400).json({ message: 'No text could be extracted from the file' });
      return;
    }

    const topics = extractTopics(text);

    document.extractedText = text;
    document.topics = topics;
    document.status = 'ready';
    await document.save();

    res.json({
      message: 'File processed successfully',
      document: {
        id: document._id,
        originalName: document.originalName,
        extractedText: text.substring(0, 1000) + (text.length > 1000 ? '...' : ''),
        topics,
        status: document.status,
      },
    });
  } catch (error) {
    console.error('Process error:', error);
    res.status(500).json({ message: 'File processing failed' });
  }
}

export async function getDocuments(req: AuthRequest, res: Response): Promise<void> {
  try {
    const filter: Record<string, unknown> = {};
    if (req.user?.role === 'student') {
      filter.userId = req.user.id;
    }

    const documents = await Document.find(filter)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      documents: documents.map((doc) => ({
        id: doc._id,
        originalName: doc.originalName,
        mimeType: doc.mimeType,
        fileSize: doc.fileSize,
        topics: doc.topics,
        status: doc.status,
        uploadedBy: req.user?.role === 'admin' ? (doc.userId as unknown as { name: string }).name : undefined,
        createdAt: doc.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ message: 'Failed to fetch documents' });
  }
}

export async function getDocumentById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const document = await Document.findById(req.params.documentId).populate('userId', 'name email');

    if (!document) {
      res.status(404).json({ message: 'Document not found' });
      return;
    }

    if (document.userId.toString() !== req.user?.id && req.user?.role !== 'admin') {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }

    res.json({
      id: document._id,
      originalName: document.originalName,
      mimeType: document.mimeType,
      fileSize: document.fileSize,
      extractedText: document.extractedText,
      topics: document.topics,
      status: document.status,
      createdAt: document.createdAt,
    });
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({ message: 'Failed to fetch document' });
  }
}

export async function deleteDocument(req: AuthRequest, res: Response): Promise<void> {
  try {
    const document = await Document.findById(req.params.documentId);

    if (!document) {
      res.status(404).json({ message: 'Document not found' });
      return;
    }

    if (document.userId.toString() !== req.user?.id && req.user?.role !== 'admin') {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }

    await Document.findByIdAndDelete(req.params.documentId);

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ message: 'Failed to delete document' });
  }
}
