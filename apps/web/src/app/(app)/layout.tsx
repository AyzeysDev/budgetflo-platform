// apps/web/src/app/(app)/layout.tsx
import React from 'react';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth'; // Ensure this path is correct
// import { Sidebar } from '@/components/layout/Sidebar'; // Placeholder - Create this component
// import { MobileHeader } from '@/components/layout/MobileHeader'; // Placeholder - Create this component
// import Navbar from '@/components/common/Navbar'; // Using the common Navbar for now
// import Footer from '@/components/common/Footer';   // Using the common Footer

// Placeholder components until you create them
const Sidebar = () => (
  <aside className="hidden md:block md:w-64 lg:w-72 bg-card border-r border-border p-4 overflow-y-auto">
    <div className="sticky top-0">
      <h2 className="text-lg font-semibold text-card-foreground mb-4">BudgetFlo App</h2>
      <nav className="flex flex-col space-y-2">
        <a href="/home" className="text-muted-foreground hover:text-primary px-2 py-1.5 rounded-md text-sm">Dashboard</a>
        <a href="#" className="text-muted-foreground hover:text-primary px-2 py-1.5 rounded-md text-sm">Budgets</a>
        <a href="#" className="text-muted-foreground hover:text-primary px-2 py-1.5 rounded-md text-sm">Transactions</a>
        <a href="#" className="text-muted-foreground hover:text-primary px-2 py-1.5 rounded-md text-sm">Reports</a>
        <a href="#" className="text-muted-foreground hover:text-primary px-2 py-1.5 rounded-md text-sm">Settings</a>
      </nav>
    </div>
  </aside>
);

const MobileHeader = () => (
  <header className="md:hidden sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border p-4">
    {/* Mobile navigation trigger or app title can go here */}
    {/* For now, we'll rely on the main Navbar for mobile navigation if it's adapted */}
    <p className="text-lg font-semibold text-foreground">BudgetFlo</p>
  </header>
);


interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

export default async function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    // Redirect to the landing page (where AuthModal is triggered)
    // or a dedicated login page if you create one.
    // The callbackUrl ensures users are returned to their intended page after login.
    const callbackUrl = encodeURIComponent(process.env.NEXTAUTH_URL_INTERNAL || process.env.NEXTAUTH_URL || "/home"); // Default to /home
    redirect(`/?callbackUrl=${callbackUrl}#hero-section`); // Redirect to landing page, anchor to hero, pass callback
  }

  // The Navbar might need adjustments if it relies on client-side session for its display.
  // For a server component layout, session is passed directly if needed by Navbar.
  // However, the common Navbar uses useSession, so it will fetch its own session client-side.
  // This is acceptable but means the Navbar's auth state might update slightly after layout load.
  // An alternative is to create a server-side Navbar or pass session data to it.

  return (
    <div className="flex h-screen w-full overflow-hidden bg-muted/40 dark:bg-slate-950">
      {/* Placeholder for a potential sidebar specific to the authenticated app section */}
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* The main Navbar can be here if it's part of the scrollable content 
            or above the main flex container if it should be fixed globally.
            For a typical app layout, a dedicated MobileHeader is often used for mobile,
            and the main Navbar might be part of the Sidebar or a top bar within this column.
            Re-using the global Navbar here means it will appear above the scrollable content.
        */}
        {/* <Navbar onGetStartedClick={() => {}} />  // onGetStartedClick is irrelevant here */}
        
        {/* Mobile Header for authenticated section */}
        <MobileHeader /> {/* This would typically contain a menu toggle for mobile sidebar */}

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
        
        {/* Footer might not be typical in a full-screen app layout, or might be simpler */}
        {/* <Footer /> */}
      </div>
    </div>
  );
}