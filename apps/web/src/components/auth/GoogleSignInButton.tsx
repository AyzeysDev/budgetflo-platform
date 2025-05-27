// apps/web/src/components/auth/GoogleSignInButton.tsx
"use client";

import { Button } from "@/components/ui/button";
import { signIn } from "next-auth/react";
import React, { useTransition } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGoogle } from '@fortawesome/free-brands-svg-icons';

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
        <FontAwesomeIcon icon={faGoogle} />
      )}
      Sign in with Google
    </Button>
  );
}