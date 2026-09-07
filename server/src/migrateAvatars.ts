import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { supabase } from './config/supabase';

const AVATARS_BUCKET = 'avatars';

async function ensurePublicBucket(): Promise<void> {
  const { data: bucket } = await supabase.storage.getBucket(AVATARS_BUCKET);
  if (!bucket) {
    const { error } = await supabase.storage.createBucket(AVATARS_BUCKET, { public: true });
    if (error) throw error;
  } else if (!bucket.public) {
    const { error } = await supabase.storage.updateBucket(AVATARS_BUCKET, { public: true });
    if (error) throw error;
  }
}

function contentTypeFor(ext: string): string {
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  return 'image/jpeg';
}

async function migrate(): Promise<void> {
  await ensurePublicBucket();

  const { data: rows, error } = await supabase
    .from('users')
    .select('id, avatar')
    .like('avatar', '/uploads/%');

  if (error) throw error;

  let migrated = 0;
  let cleared = 0;

  for (const row of rows || []) {
    const relative = String(row.avatar).replace(/^\/+/, '');
    const file = path.join(process.cwd(), relative);

    if (fs.existsSync(file)) {
      const ext = path.extname(file) || '.jpg';
      const key = `avatar-${crypto.randomUUID()}${ext}`;
      const { error: upErr } = await supabase.storage
        .from(AVATARS_BUCKET)
        .upload(key, fs.createReadStream(file), { contentType: contentTypeFor(ext) });
      if (upErr) throw upErr;

      const publicUrl = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(key).data.publicUrl;
      const { error: dbErr } = await supabase
        .from('users')
        .update({ avatar: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', row.id);
      if (dbErr) throw dbErr;

      fs.unlinkSync(file);
      migrated++;
      console.log(`Migrated avatar for ${row.id} -> ${key}`);
    } else {
      const { error: dbErr } = await supabase
        .from('users')
        .update({ avatar: '', updated_at: new Date().toISOString() })
        .eq('id', row.id);
      if (dbErr) throw dbErr;

      cleared++;
      console.log(`Cleared dead avatar for ${row.id} (file missing: ${relative})`);
    }
  }

  console.log(`Done. migrated=${migrated} cleared=${cleared}`);
  process.exit(0);
}

migrate().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});