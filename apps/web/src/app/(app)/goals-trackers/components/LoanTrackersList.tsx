'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Landmark } from 'lucide-react';
import type { WebAppLoanTracker } from '@/types/tracker';
import type { WebAppAccount } from '@/types/account';

interface LoanTrackersListProps {
  trackers: WebAppLoanTracker[];
  accounts: WebAppAccount[];
  onEdit: (tracker: WebAppLoanTracker) => void;
  onDelete: (trackerId: string) => void;
  onUpdate: (tracker: WebAppLoanTracker) => void;
}

export default function LoanTrackersList({ trackers }: LoanTrackersListProps) {
  if (trackers.length === 0) {
    return (
      <div className="text-center py-12">
        <Landmark className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No loan trackers yet</h3>
        <p className="text-muted-foreground">
          Create a loan tracker to monitor your EMI payments
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
              EMI: ${tracker.emiAmount.toLocaleString()} | 
              Remaining: ${tracker.remainingBalance.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
} 