import { Response } from 'express';
import crypto from 'crypto';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../types';
import { logAuditEvent } from '../services/auditService';
import { generateReportRecord } from './reportCardController';

const MIN_COMPLETED_REPORT = 5;
const MIN_AVG_CERTIFICATE = 70;
const MIN_COMPLETED_CERTIFICATE = 20;

const CERT_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export type DocumentKind = 'report' | 'certificate';

export interface EligibilityRequirement {
  key: string;
  label: string;
  target: number;
  current: number;
  met: boolean;
}

export interface EligibilityResult {
  eligible: boolean;
  requirements: EligibilityRequirement[];
}

function clientIp(req: AuthRequest): string {
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd) return fwd.split(',')[0].trim();
  return req.ip || '';
}

function isDocumentKind(value: string): value is DocumentKind {
  return value === 'report' || value === 'certificate';
}

export async function computeEligibility(userId: string, kind: DocumentKind): Promise<EligibilityResult> {
  const { data: results } = await supabase
    .from('assessment_results')
    .select('percentage')
    .eq('user_id', userId)
    .eq('abandoned', false);

  const completed = (results || []).length;
  const scores = (results || [])
    .map((r) => Number(r.percentage))
    .filter((n) => !Number.isNaN(n));
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

  if (kind === 'report') {
    const requirement = {
      key: 'completedAssessments',
      label: 'Completed assessments',
      target: MIN_COMPLETED_REPORT,
      current: completed,
      met: completed >= MIN_COMPLETED_REPORT,
    };
    return { eligible: requirement.met, requirements: [requirement] };
  }

  const avgReq = {
    key: 'averageScore',
    label: 'Average score',
    target: MIN_AVG_CERTIFICATE,
    current: avgScore,
    met: avgScore >= MIN_AVG_CERTIFICATE,
  };
  const completedReq = {
    key: 'completedAssessments',
    label: 'Completed assessments',
    target: MIN_COMPLETED_CERTIFICATE,
    current: completed,
    met: completed >= MIN_COMPLETED_CERTIFICATE,
  };
  return { eligible: avgReq.met && completedReq.met, requirements: [avgReq, completedReq] };
}

function serializeRequest(row: Record<string, unknown>) {
  return {
    id: row.id,
    userId: row.user_id,
    kind: row.kind,
    academicYear: row.academic_year,
    term: row.term,
    status: row.status,
    adminNote: row.admin_note || '',
    reportId: row.report_id || null,
    certificateCode: row.certificate_code || '',
    approvedBy: row.approved_by || null,
    requestedAt: row.requested_at,
    processedAt: row.processed_at || null,
  };
}

async function enrichUserInfo(requests: Array<Record<string, unknown>>) {
  const userIds = [...new Set(requests.map((r) => r.user_id).filter(Boolean))];
  const reportIds = [...new Set(requests.map((r) => r.report_id).filter(Boolean))];
  const nameMap = new Map<string, string>();
  const reportMap = new Map<string, string>();

  if (userIds.length > 0) {
    const { data: users } = await supabase.from('users').select('id, name').in('id', userIds);
    (users || []).forEach((u) => nameMap.set(u.id, u.name));
  }
  if (reportIds.length > 0) {
    const { data: reports } = await supabase.from('report_cards').select('id, report_number').in('id', reportIds);
    (reports || []).forEach((r) => reportMap.set(r.id, r.report_number));
  }

  return requests.map((r) => ({
    ...serializeRequest(r),
    studentName: nameMap.get(String(r.user_id)) || '',
    reportNumber: r.report_id ? reportMap.get(String(r.report_id)) || '' : '',
  }));
}

export async function getEligibility(req: AuthRequest, res: Response): Promise<void> {
  try {
    const kind = String(req.query.kind || '');
    if (!isDocumentKind(kind)) {
      res.status(400).json({ message: 'kind must be "report" or "certificate"' });
      return;
    }
    const userId = req.user?.role === 'admin' && req.query.userId ? String(req.query.userId) : req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const eligibility = await computeEligibility(userId, kind);
    res.json(eligibility);
  } catch (error) {
    console.error('Get document eligibility error:', error);
    res.status(500).json({ message: 'Failed to check eligibility' });
  }
}

export async function createDocumentRequest(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const kind = String((req.body || {}).kind || '');
    if (!isDocumentKind(kind)) {
      res.status(400).json({ message: 'kind must be "report" or "certificate"' });
      return;
    }

    const eligibility = await computeEligibility(userId, kind);
    if (!eligibility.eligible) {
      res.status(422).json({
        message: 'You have not met the requirements for this document yet.',
        eligible: false,
        requirements: eligibility.requirements,
      });
      return;
    }

    const { data: existing } = await supabase
      .from('document_requests')
      .select('id')
      .eq('user_id', userId)
      .eq('kind', kind)
      .eq('status', 'pending')
      .maybeSingle();
    if (existing) {
      res.status(409).json({ message: `You already have a pending ${kind} request.` });
      return;
    }

    const academicYear = kind === 'report' ? String((req.body || {}).academicYear || String(new Date().getFullYear())) : '';
    const term = kind === 'report' ? String((req.body || {}).term || 'Full Year') : '';

    const { data: record, error } = await supabase
      .from('document_requests')
      .insert({ user_id: userId, kind, academic_year: academicYear, term, status: 'pending' })
      .select()
      .single();

    if (error) throw error;

    await logAuditEvent({
      userId,
      action: 'document_requested',
      entityType: 'document_request',
      entityId: record.id,
      ipAddress: clientIp(req),
      details: { kind, academicYear, term },
    });

    res.status(201).json({ request: serializeRequest(record) });
  } catch (error) {
    console.error('Create document request error:', error);
    res.status(500).json({ message: 'Your request could not be submitted. Please try again.' });
  }
}

export async function getMyDocumentRequests(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { data } = await supabase
      .from('document_requests')
      .select('*')
      .eq('user_id', req.user?.id)
      .order('requested_at', { ascending: false });

    const requests = await enrichUserInfo(data || []);
    res.json({ requests });
  } catch (error) {
    console.error('Get my document requests error:', error);
    res.status(500).json({ message: 'Failed to load your requests' });
  }
}

export async function cancelDocumentRequest(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = String(req.params.id || '');
    const { data: row } = await supabase.from('document_requests').select('*').eq('id', id).maybeSingle();
    if (!row) {
      res.status(404).json({ message: 'Request not found' });
      return;
    }
    if (row.user_id !== req.user?.id) {
      res.status(403).json({ message: 'You do not have access to this request' });
      return;
    }
    if (row.status !== 'pending') {
      res.status(400).json({ message: 'Only pending requests can be cancelled' });
      return;
    }

    const { data: updated, error } = await supabase
      .from('document_requests')
      .update({ status: 'cancelled', processed_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    await logAuditEvent({
      userId: req.user?.id,
      action: 'document_request_cancelled',
      entityType: 'document_request',
      entityId: id,
      ipAddress: clientIp(req),
    });

    res.json({ request: serializeRequest(updated) });
  } catch (error) {
    console.error('Cancel document request error:', error);
    res.status(500).json({ message: 'Failed to cancel request' });
  }
}

export async function listDocumentRequests(req: AuthRequest, res: Response): Promise<void> {
  try {
    const kind = String(req.query.kind || '');
    let query = supabase.from('document_requests').select('*').order('requested_at', { ascending: false });
    if (kind === 'report' || kind === 'certificate') {
      query = query.eq('kind', kind);
    }
    const { data } = await query;
    const requests = await enrichUserInfo(data || []);
    res.json({ requests });
  } catch (error) {
    console.error('List document requests error:', error);
    res.status(500).json({ message: 'Failed to load requests' });
  }
}

async function generateUniqueCertificateCode(): Promise<string> {
  const prefix = 'PASSCO-CRT-';
  for (let attempt = 0; attempt < 5; attempt++) {
    let candidate = prefix;
    const bytes = crypto.randomBytes(8);
    for (let i = 0; i < 8; i++) candidate += CERT_CHARS[bytes[i] % CERT_CHARS.length];
    const { data } = await supabase.from('document_requests').select('id').eq('certificate_code', candidate).maybeSingle();
    if (!data) return candidate;
  }
  return `${prefix}${Date.now().toString().slice(-8)}`;
}

export async function approveDocumentRequest(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = String(req.params.id || '');
    const { data: row } = await supabase.from('document_requests').select('*').eq('id', id).maybeSingle();
    if (!row) {
      res.status(404).json({ message: 'Request not found' });
      return;
    }
    if (row.status !== 'pending') {
      res.status(409).json({ message: `This request has already been ${row.status}.` });
      return;
    }

    const eligibility = await computeEligibility(String(row.user_id), row.kind as DocumentKind);
    if (!eligibility.eligible) {
      res.status(422).json({
        message: 'This student no longer meets the requirements.',
        eligible: false,
        requirements: eligibility.requirements,
      });
      return;
    }

    let reportId: string | null = null;
    let certificateCode = '';

    if (row.kind === 'report') {
      const record = await generateReportRecord({
        targetUserId: String(row.user_id),
        actorUserId: req.user?.id,
        body: (req.body || {}) as Record<string, unknown>,
        ip: clientIp(req),
      });
      reportId = String(record.id);
    } else {
      certificateCode = await generateUniqueCertificateCode();
    }

    const { data: updated, error } = await supabase
      .from('document_requests')
      .update({
        status: 'approved',
        report_id: reportId,
        certificate_code: certificateCode || null,
        approved_by: req.user?.id,
        processed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    await logAuditEvent({
      userId: req.user?.id,
      action: 'document_request_approved',
      entityType: 'document_request',
      entityId: id,
      ipAddress: clientIp(req),
      details: { kind: row.kind, reportId, certificateCode },
    });

    const enriched = await enrichUserInfo([updated]);
    res.json({ request: enriched[0] });
  } catch (error) {
    console.error('Approve document request error:', error);
    res.status(500).json({ message: 'Failed to approve request' });
  }
}

export async function rejectDocumentRequest(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = String(req.params.id || '');
    const { data: row } = await supabase.from('document_requests').select('*').eq('id', id).maybeSingle();
    if (!row) {
      res.status(404).json({ message: 'Request not found' });
      return;
    }
    if (row.status !== 'pending') {
      res.status(409).json({ message: `This request has already been ${row.status}.` });
      return;
    }

    const note = String((req.body || {}).note || '').slice(0, 1000);

    const { data: updated, error } = await supabase
      .from('document_requests')
      .update({
        status: 'rejected',
        admin_note: note,
        approved_by: req.user?.id,
        processed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    await logAuditEvent({
      userId: req.user?.id,
      action: 'document_request_rejected',
      entityType: 'document_request',
      entityId: id,
      ipAddress: clientIp(req),
      details: { kind: row.kind, note },
    });

    const enriched = await enrichUserInfo([updated]);
    res.json({ request: enriched[0] });
  } catch (error) {
    console.error('Reject document request error:', error);
    res.status(500).json({ message: 'Failed to reject request' });
  }
}