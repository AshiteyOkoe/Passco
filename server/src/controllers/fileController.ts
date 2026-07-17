import { Response } from 'express';
import { supabase } from '../config/supabase';
import { parseFile, extractTopics } from '../services/fileParser';
import { AuthRequest } from '../types';

export async function uploadFile(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    const userId = req.user?.id;

    const { data: document, error } = await supabase
      .from('documents')
      .insert({
        user_id: userId,
        original_name: req.file.originalname,
        storage_path: req.file.path,
        mime_type: req.file.mimetype,
        file_size: req.file.size,
        status: 'processing',
      })
      .select('id, original_name, mime_type, file_size, status, created_at')
      .single();

    if (error) throw error;

    res.status(201).json({
      message: 'File uploaded successfully',
      document: {
        id: document.id,
        originalName: document.original_name,
        mimeType: document.mime_type,
        fileSize: document.file_size,
        status: document.status,
        createdAt: document.created_at,
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

    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (fetchError || !document) {
      res.status(404).json({ message: 'Document not found' });
      return;
    }

    if (document.user_id !== req.user?.id && req.user?.role !== 'admin') {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }

    const text = await parseFile(document.storage_path, document.mime_type);

    if (!text || text.trim().length === 0) {
      await supabase.from('documents').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', documentId);
      res.status(400).json({ message: 'No text could be extracted from the file' });
      return;
    }

    const topics = extractTopics(text);

    await supabase
      .from('documents')
      .update({
        extracted_text: text,
        topics,
        status: 'ready',
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId);

    res.json({
      message: 'File processed successfully',
      document: {
        id: document.id,
        originalName: document.original_name,
        extractedText: text.substring(0, 1000) + (text.length > 1000 ? '...' : ''),
        topics,
        status: 'ready',
      },
    });
  } catch (error) {
    console.error('Process error:', error);
    res.status(500).json({ message: 'File processing failed' });
  }
}

export async function getDocuments(req: AuthRequest, res: Response): Promise<void> {
  try {
    let query = supabase.from('documents').select('*').order('created_at', { ascending: false });
    if (req.user?.role === 'student') {
      query = query.eq('user_id', req.user.id);
    }

    const { data: documents } = await query;

    const enriched = await Promise.all(
      (documents || []).map(async (doc) => {
        let uploaderName: string | undefined;
        if (req.user?.role === 'admin') {
          const { data: user } = await supabase.from('users').select('name').eq('id', doc.user_id).single();
          uploaderName = user?.name;
        }
        return {
          id: doc.id,
          originalName: doc.original_name,
          mimeType: doc.mime_type,
          fileSize: doc.file_size,
          topics: doc.topics,
          status: doc.status,
          uploadedBy: uploaderName,
          createdAt: doc.created_at,
        };
      })
    );

    res.json({ documents: enriched });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ message: 'Failed to fetch documents' });
  }
}

export async function getDocumentById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { data: document, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', req.params.documentId)
      .single();

    if (error || !document) {
      res.status(404).json({ message: 'Document not found' });
      return;
    }

    if (document.user_id !== req.user?.id && req.user?.role !== 'admin') {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }

    res.json({
      id: document.id,
      originalName: document.original_name,
      mimeType: document.mime_type,
      fileSize: document.file_size,
      extractedText: document.extracted_text,
      topics: document.topics,
      status: document.status,
      createdAt: document.created_at,
    });
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({ message: 'Failed to fetch document' });
  }
}

export async function deleteDocument(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { data: document, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', req.params.documentId)
      .single();

    if (error || !document) {
      res.status(404).json({ message: 'Document not found' });
      return;
    }

    if (document.user_id !== req.user?.id && req.user?.role !== 'admin') {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }

    await supabase.from('documents').delete().eq('id', req.params.documentId);

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ message: 'Failed to delete document' });
  }
}
