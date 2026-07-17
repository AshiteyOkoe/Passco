import bcrypt from 'bcryptjs';
import { supabase } from './config/supabase';

const SEED_USERS = [
  {
    name: 'Test Student',
    email: 'test@test.com',
    password: 'password123',
    role: 'student' as const,
    institution: 'PASSCO Academy',
    grade_level: 'JHS 3',
    date_of_birth: new Date('2008-07-15').toISOString(),
  },
  {
    name: 'Test Admin',
    email: 'admin@test.com',
    password: 'password123',
    role: 'admin' as const,
    institution: 'PASSCO Academy',
    grade_level: '',
    date_of_birth: new Date('1990-03-10').toISOString(),
  },
];

export async function seedUsers(): Promise<void> {
  for (const userData of SEED_USERS) {
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', userData.email)
      .single();

    if (existing) continue;

    const hashedPassword = await bcrypt.hash(userData.password, 12);
    const { error } = await supabase.from('users').insert({
      name: userData.name,
      email: userData.email,
      password_hash: hashedPassword,
      role: userData.role,
      institution: userData.institution,
      grade_level: userData.grade_level,
      date_of_birth: userData.date_of_birth,
    });

    if (error) {
      console.error(`  Failed to seed ${userData.email}:`, error.message);
    } else {
      console.log(`  Seeded: ${userData.email} [${userData.role}]`);
    }
  }
}
