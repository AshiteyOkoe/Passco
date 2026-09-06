import { supabase } from '../config/supabase';

export interface AuditLogData {
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string | string[];
  details?: Record<string, unknown>;
  ipAddress?: string | string[];
}

export async function logAuditEvent(data: AuditLogData): Promise<void> {
  try {
    await supabase.from('audit_logs').insert({
      user_id: data.userId || null,
      action: data.action,
      entity_type: data.entityType,
      entity_id: Array.isArray(data.entityId) ? data.entityId[0] || '' : data.entityId || '',
      details: data.details || {},
      ip_address: Array.isArray(data.ipAddress) ? data.ipAddress[0] || '' : data.ipAddress || '',
    });
  } catch (error) {
    console.error('Audit log error:', error);
  }
}
