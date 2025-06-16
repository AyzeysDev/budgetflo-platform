'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { WebAppLoanTracker } from '@/types/tracker';
import type { WebAppAccount } from '@/types/account';

interface LoanTrackerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tracker: WebAppLoanTracker | null;
  accounts: WebAppAccount[];
  onSave: (tracker: WebAppLoanTracker) => void;
}

export default function LoanTrackerForm({
  open,
  onOpenChange,
}: LoanTrackerFormProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Loan Tracker</DialogTitle>
        </DialogHeader>
        <div className="py-6 text-center text-muted-foreground">
          Loan tracker form coming soon...
        </div>
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 