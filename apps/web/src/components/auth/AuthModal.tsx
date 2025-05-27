// apps/web/src/components/auth/AuthModal.tsx
"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import GoogleSignInButton from "./GoogleSignInButton";
import { PiggyBank } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AuthModal({ isOpen, onOpenChange }: AuthModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] p-8">
        <DialogHeader className="text-center mb-4">
          <div className="flex justify-center mb-4">
            <PiggyBank className="h-12 w-12 text-primary" />
          </div>
          <DialogTitle className="text-2xl font-bold">Welcome to BudgetFlo</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Sign in with your Google account to continue.
            Its quick, easy, and secure.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <GoogleSignInButton callbackUrl="/home" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
