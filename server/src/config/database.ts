import { supabase } from './supabase';

export async function connectDatabase(): Promise<void> {
  const { error } = await supabase.from('users').select('id').limit(1);
  if (error) {
    console.error('Supabase connection error:', error.message);
    process.exit(1);
  }
  console.log('Connected to Supabase successfully');
}

export async function disconnectDatabase(): Promise<void> {
  console.log('Disconnected from Supabase');
}
