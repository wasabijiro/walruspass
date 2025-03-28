import { Tusky } from '@tusky-io/ts-sdk';

// TuskyClientの型を定義
export type TuskyClientType = Awaited<ReturnType<typeof Tusky.init>>;

// ブラウザ環境では初期化しない（コンポーネント内で行う）
export const createTuskyClient = async (signPersonalMessage: any, account: any) => {
  try {
    return await Tusky.init({ 
      wallet: { 
        signPersonalMessage, 
        account 
      } 
    });
  } catch (error) {
    console.error('Failed to initialize Tusky client:', error);
    throw error;
  }
};

// APIキーを使用してサーバーサイドでTuskyクライアントを初期化する
export const createServerTuskyClient = async (apiKey: string) => {
  try {
    // Server-side client initialization with API key
    return await Tusky.init({ apiKey });
  } catch (error) {
    console.error('Failed to initialize server-side Tusky client:', error);
    throw error;
  }
};

