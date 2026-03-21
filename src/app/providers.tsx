'use client';

import { AppProvider } from "@/lib/context/AppContext";


export function Providers({ children }: { children: React.ReactNode }) {
  return <AppProvider>{children}</AppProvider>;
}