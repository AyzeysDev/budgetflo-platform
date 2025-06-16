'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { WebAppGoal } from '@/types/goal';

interface GoalContributionDialogProps {
  goal: WebAppGoal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (goal: WebAppGoal) => void;
}

export default function GoalContributionDialog({
  goal,
  open,
  onOpenChange,
}: GoalContributionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Contribution to {goal.name}</DialogTitle>
        </DialogHeader>
        <div className="py-6 text-center text-muted-foreground">
          Contribution form coming soon...
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