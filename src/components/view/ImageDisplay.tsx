'use client'

import { useState, useEffect } from 'react'
import { logger } from '@/lib/logger'

interface ImageDisplayProps {
  uploadId?: string
  alt?: string
  className?: string
  width?: number
  height?: number
}

export default function ImageDisplay({ 
  uploadId = '3f056da3-063e-4013-b980-ba86ed5279b7',
  alt = '画像',
  className = '',
  width = 500,
  height = 300
}: ImageDisplayProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // 重要: 正しいURLにする - app.tusky.ioではなくAPIパスに変更
  const imageUrl = `https://app.tusky.io/api/proxy/download/${uploadId}`
  
  useEffect(() => {
    if (!uploadId) {
      setError('uploadIdが指定されていません')
      setIsLoading(false)
      logger.error('uploadIdが指定されていません', { uploadId })
    }
  }, [uploadId])
  
  const handleImageLoad = () => {
    logger.info('画像の読み込みが完了しました', { uploadId })
    setIsLoading(false)
  }
  
  const handleImageError = () => {
    logger.error('画像の読み込みに失敗しました', { uploadId })
    setError('画像の読み込みに失敗しました')
    setIsLoading(false)
  }
  
  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      )}
      
      {error ? (
        <div className="bg-red-50 p-4 rounded-md text-red-500 flex items-center justify-center h-full">
          <p>{error}</p>
        </div>
      ) : (
        <img
          className="MuiCardMedia-root MuiCardMedia-media MuiCardMedia-img css-15a2yop"
          src={imageUrl}
          alt={alt}
          height="auto"
          onLoad={handleImageLoad}
          onError={handleImageError}
          style={{ 
            transitionDuration: '300ms', 
            transform: 'translate3d(0px, 0px, 0px) scale(1)' 
          }}
        />
      )}
    </div>
  )
} 