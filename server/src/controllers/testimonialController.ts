import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthRequest } from '../types';

export async function getApprovedTestimonials(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const { data: testimonials } = await supabase
      .from('testimonials')
      .select('*')
      .eq('is_approved', true)
      .order('created_at', { ascending: true });

    res.json({ testimonials: testimonials || [] });
  } catch (error) {
    console.error('Get testimonials error:', error);
    res.status(500).json({ message: 'Failed to fetch testimonials' });
  }
}

export async function getAllTestimonials(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const { data: testimonials } = await supabase
      .from('testimonials')
      .select('*')
      .order('created_at', { ascending: false });

    res.json({ testimonials: testimonials || [] });
  } catch (error) {
    console.error('Get all testimonials error:', error);
    res.status(500).json({ message: 'Failed to fetch testimonials' });
  }
}

export async function createTestimonial(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, role, school, quote, rating, avatarUrl } = req.body;
    if (!name || !quote) {
      res.status(400).json({ message: 'Name and quote are required' });
      return;
    }

    const { data, error } = await supabase
      .from('testimonials')
      .insert({
        name,
        role: role || '',
        school: school || '',
        quote,
        rating: Math.min(5, Math.max(1, Number(rating) || 5)),
        avatar_url: avatarUrl || '',
        is_approved: true,
        created_by: req.user!.id,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ testimonial: data });
  } catch (error) {
    console.error('Create testimonial error:', error);
    res.status(500).json({ message: 'Failed to create testimonial' });
  }
}

export async function updateTestimonial(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, role, school, quote, rating, avatarUrl, isApproved } = req.body;

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) patch.name = name;
    if (role !== undefined) patch.role = role;
    if (school !== undefined) patch.school = school;
    if (quote !== undefined) patch.quote = quote;
    if (rating !== undefined) patch.rating = Math.min(5, Math.max(1, Number(rating) || 5));
    if (avatarUrl !== undefined) patch.avatar_url = avatarUrl;
    if (isApproved !== undefined) patch.is_approved = !!isApproved;

    const { data, error } = await supabase
      .from('testimonials')
      .update(patch)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ testimonial: data });
  } catch (error) {
    console.error('Update testimonial error:', error);
    res.status(500).json({ message: 'Failed to update testimonial' });
  }
}

export async function deleteTestimonial(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { error } = await supabase.from('testimonials').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Testimonial deleted' });
  } catch (error) {
    console.error('Delete testimonial error:', error);
    res.status(500).json({ message: 'Failed to delete testimonial' });
  }
}