import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../types';

export async function getAnnouncements(req: AuthRequest, res: Response): Promise<void> {
  try {
    let query = supabase
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false });

    if (req.user?.role === 'student') {
      query = query.or('target_audience.eq.all,target_audience.eq.students');
    }

    const { data: announcements } = await query;
    res.json({ announcements: announcements || [] });
  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({ message: 'Failed to fetch announcements' });
  }
}

export async function createAnnouncement(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { title, body, priority, targetAudience } = req.body;
    if (!title || !body) { res.status(400).json({ message: 'Title and body are required' }); return; }

    const { data, error } = await supabase
      .from('announcements')
      .insert({
        title,
        body,
        priority: priority || 'normal',
        target_audience: targetAudience || 'all',
        created_by: req.user!.id,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ announcement: data });
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({ message: 'Failed to create announcement' });
  }
}

export async function deleteAnnouncement(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { error } = await supabase.from('announcements').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Announcement deleted' });
  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({ message: 'Failed to delete announcement' });
  }
}

export async function getAllAnnouncements(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const { data: announcements } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });
    res.json({ announcements: announcements || [] });
  } catch (error) {
    console.error('Get all announcements error:', error);
    res.status(500).json({ message: 'Failed to fetch announcements' });
  }
}
