import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../types';

export async function getAuditLogs(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { action, entityType, userId, page = '1', limit = '50' } = req.query;

    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' });

    if (action) query = query.eq('action', action as string);
    if (entityType) query = query.eq('entity_type', entityType as string);
    if (userId) query = query.eq('user_id', userId as string);

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    query = query.order('created_at', { ascending: false }).range(offset, offset + limitNum - 1);

    const { data: logs, count, error } = await query;
    if (error) throw error;

    const enriched = await Promise.all(
      (logs || []).map(async (log) => {
        const { data: user } = log.user_id
          ? await supabase.from('users').select('name, email').eq('id', log.user_id).single()
          : { data: null };
        return {
          ...log,
          userName: user?.name || 'System',
          userEmail: user?.email || '',
        };
      })
    );

    res.json({
      logs: enriched,
      total: count || 0,
      page: pageNum,
      totalPages: Math.ceil((count || 0) / limitNum),
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ message: 'Failed to fetch audit logs' });
  }
}

export async function getAuditStats(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const { count: totalLogs } = await supabase
      .from('audit_logs')
      .select('id', { count: 'exact', head: true });

    const { data: actionCounts } = await supabase
      .from('audit_logs')
      .select('action');

    const actions: Record<string, number> = {};
    for (const log of actionCounts || []) {
      actions[log.action] = (actions[log.action] || 0) + 1;
    }

    const { data: recentLogs } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    const enriched = await Promise.all(
      (recentLogs || []).map(async (log) => {
        const { data: user } = log.user_id
          ? await supabase.from('users').select('name, email').eq('id', log.user_id).single()
          : { data: null };
        return {
          ...log,
          userName: user?.name || 'System',
          userEmail: user?.email || '',
        };
      })
    );

    res.json({
      totalLogs: totalLogs || 0,
      actionCounts: actions,
      recentLogs: enriched,
    });
  } catch (error) {
    console.error('Get audit stats error:', error);
    res.status(500).json({ message: 'Failed to fetch audit stats' });
  }
}
