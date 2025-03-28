import { TuskyClientType } from '@/lib/tusky/client';
import { createContext, useContext } from 'react';

// Tuskyコンテキストの型定義
type TuskyContextType = {
  client: TuskyClientType | null;
  setClient: (client: TuskyClientType | null) => void;
  isSignedIn: boolean;
  setIsSignedIn: (isSignedIn: boolean) => void;
};

// Tuskyクライアントのコンテキスト
export const TuskyContext = createContext<TuskyContextType>({
  client: null,
  setClient: () => {},
  isSignedIn: false,
  setIsSignedIn: () => {},
});

// Tuskyクライアントを使用するためのフック
export const useTusky = () => {
  const context = useContext(TuskyContext);
  return context;
};
