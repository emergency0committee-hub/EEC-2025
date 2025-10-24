import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Test connection function
export const testSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('test_submissions').select('count').limit(1)
    if (error) {
      console.log('Supabase connection test failed:', error.message)
      return false
    }
    console.log('Supabase connection successful')
    return true
  } catch (err) {
    console.log('Supabase connection test error:', err.message)
    return false
  }
}
