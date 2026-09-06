import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../types';
import { logAuditEvent } from '../services/auditService';

function clientIp(req: AuthRequest): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd) return fwd.split(',')[0].trim();
  return req.ip || '';
}

function parsePage(value: unknown, fallback: number): number {
  const n = parseInt(String(value));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;

export async function sendContactMessage(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, email, accountType, subject, category, message, attachment, attachmentName } = req.body;

    if (!name || !email || !subject || !message) {
      res.status(400).json({ message: 'Name, email, subject and message are required' });
      return;
    }

    if (attachment && Buffer.byteLength(attachment, 'utf8') > MAX_ATTACHMENT_BYTES * 1.4) {
      res.status(400).json({ message: 'Attachment is too large. Please keep it under 2 MB.' });
      return;
    }

    const { data, error } = await supabase
      .from('contact_messages')
      .insert({
        name,
        email,
        account_type: accountType || '',
        subject: subject || 'General Enquiry',
        category: category || 'general',
        message,
        attachment: attachment || null,
        attachment_name: attachmentName || '',
        user_id: req.user?.id || null,
        ip_address: clientIp(req),
      })
      .select()
      .single();

    if (error) throw error;

    await logAuditEvent({
      userId: req.user?.id,
      action: 'contact_submitted',
      entityType: 'contact_message',
      entityId: data.id,
      ipAddress: clientIp(req),
      details: { subject: data.subject },
    });

    res.status(201).json({ message: 'Message sent successfully. Our team will get back to you soon.' });
  } catch (error) {
    console.error('Send contact message error:', error);
    res.status(500).json({ message: 'Failed to send message. Please try again.' });
  }
}

export async function reportQuestion(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { questionId, questionText, subject, classLevel, assessmentType, assessmentKey, reason, note } = req.body;

    if (!reason) {
      res.status(400).json({ message: 'A report reason is required' });
      return;
    }

    const { data, error } = await supabase
      .from('question_reports')
      .insert({
        question_id: questionId || '',
        question_text: questionText || '',
        subject: subject || '',
        class_level: classLevel || '',
        assessment_type: assessmentType || '',
        assessment_key: assessmentKey || '',
        user_id: req.user?.id || null,
        reason: reason,
        note: note || '',
        ip_address: clientIp(req),
      })
      .select()
      .single();

    if (error) throw error;

    await logAuditEvent({
      userId: req.user?.id,
      action: 'question_reported',
      entityType: 'question_report',
      entityId: data.id,
      ipAddress: clientIp(req),
      details: { subject: subject || '', reason },
    });

    res.status(201).json({ message: 'Question reported. Thank you for helping us improve.' });
  } catch (error) {
    console.error('Report question error:', error);
    res.status(500).json({ message: 'Failed to report question. Please try again.' });
  }
}

export async function getContactMessages(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { status, search, page = '1', limit = '20' } = req.query;

    let query = supabase.from('contact_messages').select('*', { count: 'exact' });
    if (status && status !== 'all') query = query.eq('status', status as string);
    if (search) {
      const q = String(search).toLowerCase();
      query = query.or(`name.ilike.*${q}*,email.ilike.*${q}*,subject.ilike.*${q}*`);
    }

    const pageNum = parsePage(page, 1);
    const limitNum = parsePage(limit, 20);
    const offset = (pageNum - 1) * limitNum;

    query = query.order('created_at', { ascending: false }).range(offset, offset + limitNum - 1);

    const { data, count, error } = await query;
    if (error) throw error;

    res.json({
      messages: data || [],
      total: count || 0,
      page: pageNum,
      totalPages: Math.ceil((count || 0) / limitNum),
    });
  } catch (error) {
    console.error('Get contact messages error:', error);
    res.status(500).json({ message: 'Failed to fetch contact messages' });
  }
}

export async function updateContactMessageStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['new', 'in_progress', 'closed'].includes(status)) {
      res.status(400).json({ message: 'Invalid status' });
      return;
    }

    const { data, error } = await supabase
      .from('contact_messages')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      res.status(404).json({ message: 'Message not found' });
      return;
    }

    await logAuditEvent({
      userId: req.user?.id,
      action: 'contact_status_updated',
      entityType: 'contact_message',
      entityId: id,
      ipAddress: clientIp(req),
      details: { status },
    });

    res.json({ message: 'Message status updated', item: data });
  } catch (error) {
    console.error('Update contact status error:', error);
    res.status(500).json({ message: 'Failed to update message status' });
  }
}

export async function getQuestionReports(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { status, page = '1', limit = '20' } = req.query;

    let query = supabase.from('question_reports').select('*', { count: 'exact' });
    if (status && status !== 'all') query = query.eq('status', status as string);

    const pageNum = parsePage(page, 1);
    const limitNum = parsePage(limit, 20);
    const offset = (pageNum - 1) * limitNum;

    query = query.order('created_at', { ascending: false }).range(offset, offset + limitNum - 1);

    const { data, count, error } = await query;
    if (error) throw error;

    const enriched = await Promise.all(
      (data || []).map(async (report) => {
        const { data: user } = report.user_id
          ? await supabase.from('users').select('name, email').eq('id', report.user_id).single()
          : { data: null };
        return { ...report, userName: user?.name || 'Guest', userEmail: user?.email || '' };
      })
    );

    res.json({
      reports: enriched,
      total: count || 0,
      page: pageNum,
      totalPages: Math.ceil((count || 0) / limitNum),
    });
  } catch (error) {
    console.error('Get question reports error:', error);
    res.status(500).json({ message: 'Failed to fetch question reports' });
  }
}

export async function updateQuestionReportStatus(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['new', 'in_progress', 'closed'].includes(status)) {
      res.status(400).json({ message: 'Invalid status' });
      return;
    }

    const { data, error } = await supabase
      .from('question_reports')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      res.status(404).json({ message: 'Report not found' });
      return;
    }

    await logAuditEvent({
      userId: req.user?.id,
      action: 'question_report_status_updated',
      entityType: 'question_report',
      entityId: id,
      ipAddress: clientIp(req),
      details: { status },
    });

    res.json({ message: 'Report status updated', item: data });
  } catch (error) {
    console.error('Update report status error:', error);
    res.status(500).json({ message: 'Failed to update report status' });
  }
}