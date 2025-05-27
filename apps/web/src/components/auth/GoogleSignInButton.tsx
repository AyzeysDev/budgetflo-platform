// apps/web/src/components/auth/GoogleSignInButton.tsx
"use client";

import { Button } from "@/components/ui/button";
import { signIn } from "next-auth/react";
import React, { useTransition } from "react";
import { ChromeIcon } from "lucide-react"; // Or a Google icon from react-icons

export default function GoogleSignInButton({ callbackUrl = "/home" }: { callbackUrl?: string }) {
  const [isPending, startTransition] = useTransition();

  const handleSignIn = () => {
    startTransition(() => {
      signIn("google", { callbackUrl: callbackUrl }).catch(console.error);
    });
  };

  return (
    <Button
      variant="outline"
      className="w-full flex items-center justify-center gap-2 py-6 text-base"
      onClick={handleSignIn}
      disabled={isPending}
    >
      {isPending ? (
        <span className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" />
      ) : (
        <ChromeIcon className="h-5 w-5" />
      )}
      Sign in with Google
    </Button>
  );
}