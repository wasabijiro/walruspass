import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/api/client'
import { SupabaseRepository } from '@/lib/api/adapters'
import { ApiError } from '@/lib/api/error'
import { logger } from '@/lib/logger'

const supabaseRepository = new SupabaseRepository(supabase)

/**
 * Get profile by userId
 * @route GET /api/profile
 * @auth Not Required
 * @param {string} userId - Query parameter for the user ID to retrieve
 *   - Format: /api/profile?userId=xxx
 *   - Required: Yes
 * @returns {Object} Profile data or error
 *   - id {string} User's unique identifier
 *   - displayName {string|null} User's display name
 *   - avatarUrl {string|null} User's avatar URL
 * @error
 *   - 400: Bad Request - Missing userId parameter
 *   - 404: Not Found - Profile not found
 *   - 500: Internal Server Error - Database or unexpected errors
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      logger.warn('Missing userId in request')
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    logger.info('Fetching profile', { userId })
    const result = await supabaseRepository.findProfileById({ userId })

    return result.match(
      (profile) => {
        logger.info('Profile fetched successfully', { userId })
        return NextResponse.json(profile)
      },
      (error: ApiError) => {
        logger.error('Profile get error', { userId, error })
        return NextResponse.json(
          { error: error.message },
          { status: error.code }
        )
      }
    )
  } catch (error) {
    logger.error('Unexpected error in profile fetch', { error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
