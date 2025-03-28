import { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/api/client'
import { logger } from '@/lib/logger'

/**
 * Get current auth session
 * @throws Error if no session is found
 */
export async function getAuthSession(): Promise<Session> {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) {
    logger.error('Failed to get auth session', { error })
    throw error
  }
  if (!session) {
    logger.error('No session found')
    throw new Error('No session found')
  }
  return session
}
