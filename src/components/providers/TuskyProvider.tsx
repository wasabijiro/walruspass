"use client"

import { ReactNode, useState } from "react"
import { TuskyContext } from "@/hooks/useTusky"
import type { TuskyClientType } from "@/lib/tusky/client"

export function TuskyProvider({ children }: { children: ReactNode }) {
  const [tuskyClient, setTuskyClient] = useState<TuskyClientType | null>(null)
  const [isSignedIn, setIsSignedIn] = useState(false)
  
  return (
    <TuskyContext.Provider value={{ 
      client: tuskyClient, 
      setClient: setTuskyClient,
      isSignedIn,
      setIsSignedIn
    }}>
      {children}
    </TuskyContext.Provider>
  )
}
