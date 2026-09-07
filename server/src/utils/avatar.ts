import fs from 'fs';
import path from 'path';

export function resolveAvatarUrl(avatar?: string | null): string {
  if (!avatar) return '';
  if (avatar.startsWith('http') || !avatar.startsWith('/uploads/')) return avatar;

  if (process.env.NODE_ENV === 'production') return '';

  try {
    const file = path.join(process.cwd(), avatar.replace(/^\/+/, ''));
    return fs.existsSync(file) ? avatar : '';
  } catch {
    return '';
  }
}