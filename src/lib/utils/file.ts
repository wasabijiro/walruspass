import { logger } from '@/lib/logger'

interface FilePreviewResult {
  file: File
  previewUrl: string
}

export function createFilePreview(file: File): FilePreviewResult {
  try {
    const previewUrl = URL.createObjectURL(file)
    return { file, previewUrl }
  } catch (error) {
    logger.error('Failed to create file preview', { error })
    throw error
  }
}

export function revokeFilePreview(url: string): void {
  try {
    URL.revokeObjectURL(url)
  } catch (error) {
    logger.error('Failed to revoke file preview', { error })
  }
}
