import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_CONFIG } from './config'

// Default Supabase client instance
export const supabase = createClient(
  SUPABASE_CONFIG.PROJECT.URL,
  SUPABASE_CONFIG.PROJECT.ANON_KEY,
)

// Create authenticated client with token
export function createAuthenticatedClient(token: string): SupabaseClient {
  return createClient(
    SUPABASE_CONFIG.PROJECT.URL,
    SUPABASE_CONFIG.PROJECT.ANON_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    }
  )
}