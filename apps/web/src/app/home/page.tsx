// apps/web/src/app/home/page.tsx
"use client";

import React, { useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation"; // Use next/navigation for App Router
import { Button } from "@/components/ui/button";
import Navbar from "@/components/common/Navbar"; 
import Footer from "@/components/common/Footer";   
import { Loader2, LogOut, UserCircle } from "lucide-react";
import AuthModal from "@/components/auth/AuthModal"; // Keep for Navbar if it needs it

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // This useEffect will redirect to the landing page if the user is not authenticated.
  // NextAuth middleware is a more robust way to protect routes for production.
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/"); // Redirect to landing page if not authenticated
    }
  }, [status, router]);

  // State for AuthModal, passed to Navbar.
  // Navbar might still need to trigger this if a user somehow lands here unauthenticated
  // or if there are other auth-related actions in the Navbar on the home page.
  const [isAuthModalOpen, setIsAuthModalOpen] = React.useState(false);
  const openAuthModal = () => setIsAuthModalOpen(true);
  const onAuthModalOpenChange = (open: boolean) => setIsAuthModalOpen(open);


  if (status === "loading") {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center bg-background text-foreground">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg">Loading session...</p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    // This state should ideally be handled by the useEffect redirect,
    // but as a fallback, you can show a message or a redirect button.
    return (
      <div className="flex flex-col min-h-screen items-center justify-center bg-background text-foreground p-6">
        <p className="text-xl mb-4">Access Denied. Redirecting...</p>
      </div>
    );
  }

  // If authenticated, render the home page content
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Navbar onGetStartedClick={openAuthModal} /> 

      <main className="flex-grow container mx-auto px-6 sm:px-8 py-12">
        <div className="bg-card p-8 rounded-xl shadow-xl border border-border">
          <div className="flex items-center mb-6">
            <UserCircle className="h-16 w-16 text-primary mr-4" />
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-card-foreground">
                Welcome to BudgetFlo, {session?.user?.name || "User"}!
              </h1>
              <p className="text-muted-foreground">
                You are successfully signed in.
              </p>
            </div>
          </div>

          <div className="mb-6 p-4 border border-dashed border-border rounded-md bg-background/50">
            <h2 className="text-xl font-semibold mb-2 text-card-foreground">Session Details:</h2>
            <pre className="text-sm bg-muted p-3 rounded-md overflow-x-auto text-muted-foreground">
              {JSON.stringify(session, null, 2)}
            </pre>
          </div>
          
          <p className="text-muted-foreground mb-6">
            This is your authenticated dashboard. You can start building your budget management features here.
          </p>

          <Button
            onClick={() => signOut({ callbackUrl: "/" })} // Redirect to landing page after sign out
            variant="destructive"
            size="lg"
            className="flex items-center gap-2"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </Button>
        </div>
      </main>
      <Footer />
      {/* AuthModal can be rendered here if Navbar needs to control it */}
      <AuthModal isOpen={isAuthModalOpen} onOpenChange={onAuthModalOpenChange} />
    </div>
  );
}