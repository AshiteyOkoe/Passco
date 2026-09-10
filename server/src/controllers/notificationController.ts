import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../types';

interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  entity_type: string;
  entity_id: string;
  is_read: boolean;
  created_at: string;
}

function serialize(n: NotificationRow): Record<string, unknown> {
  return {
    id: n.id,
    userId: n.user_id,
    type: n.type,
    title: n.title,
    body: n.body,
    entityType: n.entity_type,
    entityId: n.entity_id,
    isRead: n.is_read,
    createdAt: n.created_at,
  };
}

export async function getMyNotifications(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { data } = await supabase
      .from('user_notifications')
      .select('*')
      .eq('user_id', req.user!.id)
      .order('created_at', { ascending: false })
      .limit(30);
    const notifications = ((data as NotificationRow[]) || []).map(serialize);
    const unread = notifications.filter((n) => !n.isRead).length;
    res.json({ notifications, unread });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ message: 'Failed to load notifications' });
  }
}

export async function markNotificationRead(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { error } = await supabase
      .from('user_notifications')
      .update({ is_read: true })
      .eq('id', req.params.id)
      .eq('user_id', req.user!.id);
    if (error) {
      res.status(400).json({ message: 'Notification not found' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ message: 'Failed to update notification' });
  }
}

export async function markAllNotificationsRead(req: AuthRequest, res: Response): Promise<void> {
  try {
    await supabase.from('user_notifications').update({ is_read: true }).eq('user_id', req.user!.id).is('is_read', false);
    res.json({ success: true });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({ message: 'Failed to update notifications' });
  }
}