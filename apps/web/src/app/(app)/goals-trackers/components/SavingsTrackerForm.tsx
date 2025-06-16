'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { WebAppSavingsTracker } from '@/types/tracker';
import type { WebAppAccount } from '@/types/account';
import type { WebAppGoal } from '@/types/goal';

interface SavingsTrackerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tracker: WebAppSavingsTracker | null;
  accounts: WebAppAccount[];
  goals: WebAppGoal[];
  onSave: (tracker: WebAppSavingsTracker) => void;
}

export default function SavingsTrackerForm({
  open,
  onOpenChange,
}: SavingsTrackerFormProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Savings Tracker</DialogTitle>
        </DialogHeader>
        <div className="py-6 text-center text-muted-foreground">
          Savings tracker form coming soon...
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