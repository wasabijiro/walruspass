/**
 * Common API error types
 */
export type ApiError = {
  type: ApiErrorType
  message: string
  code: number
  details?: unknown
}

export type ApiErrorType =
  | "not_found"      // 404: リソースが見つからない
  | "validation"     // 422: バリデーションエラー
  | "unauthorized"   // 401: 認証エラー
  | "forbidden"      // 403: 権限エラー
  | "database"       // 500: データベースエラー
  | "network"        // 500: ネットワークエラー
  | "unknown"        // 500: 不明なエラー

/**
 * Error response helper functions
 */
export const createApiError = (
  type: ApiErrorType,
  message: string,
  details?: unknown
): ApiError => {
  const code = getErrorStatusCode(type)
  return { type, message, code, details }
}

/**
 * Maps error types to HTTP status codes
 */
export const getErrorStatusCode = (type: ApiErrorType): number => {
  switch (type) {
    case "not_found":
      return 404
    case "validation":
      return 422
    case "unauthorized":
      return 401
    case "forbidden":
      return 403
    case "database":
    case "network":
    case "unknown":
      return 500
  }
}
