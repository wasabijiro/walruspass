"use client"

import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { networks } from "@/lib/sui/client";
import { useState } from "react";
import '@mysten/dapp-kit/dist/index.css';
import { TuskyProvider } from "@/components/providers/TuskyProvider";

export function Providers({ children }: { children: React.ReactNode }) {
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