import { logger } from '@/lib/logger'
import { Result, ok, err } from 'neverthrow'
import { ApiError, createApiError } from './error'

/**
 * Extract bearer token from authorization header
 */
export function extractBearerToken(authHeader: string | null): Result<string, ApiError> {
  if (!authHeader?.startsWith('Bearer ')) {
    logger.warn('Missing or invalid authorization header')
    return err(createApiError(
      'unauthorized',
      'Missing or invalid authorization header'
    ))
  }

  return ok(authHeader.split(' ')[1])
}
