import { Tusky } from '@tusky-io/ts-sdk';
import { createContext, useContext } from 'react';

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

// Tuskyクライアントのコンテキスト
export const TuskyContext = createContext<TuskyClientType | null>(null);

// Tuskyクライアントを使用するためのフック
export const useTusky = () => {
  const context = useContext(TuskyContext);
  if (!context) {
    throw new Error('useTusky must be used within a TuskyProvider');
  }
  return context;
};

