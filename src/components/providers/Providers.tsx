"use client"

import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getFullnodeUrl } from "@mysten/sui.js/client";
import { useState } from "react";
import '@mysten/dapp-kit/dist/index.css';
import { TuskyProvider } from "@/components/providers/TuskyProvider";

// Suiネットワーク設定
const networks = {
  testnet: { url: getFullnodeUrl("testnet") },
  mainnet: { url: getFullnodeUrl("mainnet") },
};

export function Providers({ children }: { children: React.ReactNode }) {
  // クライアントサイドでのみ実行されるようにuseStateを使用
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networks} defaultNetwork="testnet">
        <WalletProvider>
          <TuskyProvider>
            {children}
          </TuskyProvider>
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
} 