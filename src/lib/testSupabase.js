import { supabase } from './supabase.js';

export const testSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('test_table').select('*').limit(1);
    if (error) {
      console.error('Supabase connection error:', error);
      return false;
    }
    console.log('Supabase connected successfully:', data);
    return true;
  } catch (err) {
    console.error('Unexpected error:', err);
    return false;
  }
};
