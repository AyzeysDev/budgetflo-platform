'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PiggyBank } from 'lucide-react';
import type { WebAppSavingsTracker } from '@/types/tracker';
import type { WebAppAccount } from '@/types/account';
import type { WebAppGoal } from '@/types/goal';

interface SavingsTrackersListProps {
  trackers: WebAppSavingsTracker[];
  accounts: WebAppAccount[];
  goals: WebAppGoal[];
  onEdit: (tracker: WebAppSavingsTracker) => void;
  onDelete: (trackerId: string) => void;
  onUpdate: (tracker: WebAppSavingsTracker) => void;
}

export default function SavingsTrackersList({ trackers }: SavingsTrackersListProps) {
  if (trackers.length === 0) {
    return (
      <div className="text-center py-12">
        <PiggyBank className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No savings trackers yet</h3>
        <p className="text-muted-foreground">
          Create a savings tracker to monitor your savings progress
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {trackers.map((tracker) => (
        <Card key={tracker.trackerId}>
          <CardHeader>
            <CardTitle>{tracker.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Current Balance: ${tracker.currentBalance?.toLocaleString() || '0'}
              {tracker.monthlyTarget && ` | Target: $${tracker.monthlyTarget.toLocaleString()}/month`}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
} 