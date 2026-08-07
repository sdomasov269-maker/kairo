"use client";
import { SessionProvider as Provider } from "next-auth/react";
import { AccountDataProvider } from "@/components/data/AccountDataProvider";
import { AccountMergeDialog } from "@/components/data/AccountMergeDialog";
export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider>
      <AccountDataProvider>
        {children}
        <AccountMergeDialog />
      </AccountDataProvider>
    </Provider>
  );
}
