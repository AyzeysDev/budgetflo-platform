// apps/web/src/components/providers.tsx
"use client";

import React from 'react';
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";

interface ProvidersProps {
  children: React.ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
        <Toaster richColors position="top-right" closeButton />
      </ThemeProvider>
    </SessionProvider>
  );
}