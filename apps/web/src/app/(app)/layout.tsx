// apps/web/src/app/(app)/layout.tsx
import React from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { Toaster } from "@/components/ui/sonner";
import { cn } from '@/lib/utils'; // Assuming cn is available for class merging

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

export default async function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    // The callbackBase variable was declared but not used, so it's removed.
    // The callbackUrl is constructed directly.
    // For simplicity, redirecting to /home as callback or just root.
    // Middleware would be a better place for more sophisticated callback logic
    // if the intended redirect path needs to be dynamically captured from the current request.
    const callbackUrl = encodeURIComponent("/home"); // Or a more dynamic path if available and determined by middleware
    redirect(`/?callbackUrl=${callbackUrl}#hero-section`);
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-muted/30 dark:bg-background">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden"> {/* This div should not scroll */}
        <MobileHeader />

        {/* Key changes for scrolling:
          - `flex-1`: Allows this main area to grow and shrink.
          - `overflow-y-auto`: Enables vertical scrolling if content exceeds available space.
          - `min-h-0`: Crucial for flex children that need to scroll. 
                       It prevents the child from expanding its parent indefinitely 
                       if its content is too large, allowing overflow-y-auto to work.
        */}
        <main 
          className={cn(
            "flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-background",
            "min-h-0" // Added this class
          )}
        >
          {children}
        </main>
      </div>
      <Toaster richColors position="top-right" closeButton />
    </div>
  );
}
