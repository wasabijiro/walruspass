export * from './types'
export * from './console'

// デフォルトのロガーインスタンスを作成
import { createConsoleLogger } from './console'
export const logger = createConsoleLogger()
