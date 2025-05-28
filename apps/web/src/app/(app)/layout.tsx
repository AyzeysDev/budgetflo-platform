// apps/web/src/app/(app)/layout.tsx
import React from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Sidebar } from '@/components/layout/Sidebar'; // Import the new Sidebar
import { MobileHeader } from '@/components/layout/MobileHeader'; // Import the new MobileHeader
import { Toaster } from "@/components/ui/sonner"; // Ensure Toaster is here for app-level notifications

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

export default async function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    const callbackUrl = encodeURIComponent(process.env.NEXTAUTH_URL_INTERNAL || process.env.NEXTAUTH_URL || "/home");
    redirect(`/?callbackUrl=${callbackUrl}#hero-section`);
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-muted/30 dark:bg-background">
      {/* New Modern Sidebar */}
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* New Modern Mobile Header */}
        <MobileHeader />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-background">
          {/* Main content area for authenticated pages */}
          {children}
        </main>
      </div>
      <Toaster richColors position="top-right" closeButton />
    </div>
  );
}