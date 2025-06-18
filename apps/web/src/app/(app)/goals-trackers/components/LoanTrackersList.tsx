'use client';

import React from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MoreVertical, 
  Edit, 
  Trash2, 
  Landmark,
  Calendar,
  BarChart3,
  Percent
} from 'lucide-react';
import { format } from 'date-fns';
import type { WebAppLoanTracker } from '@/types/tracker';
import type { WebAppAccount } from '@/types/account';
import { toast } from 'sonner';
import ProgressModal from './ProgressModal';

interface LoanTrackersListProps {
  trackers: WebAppLoanTracker[];
  accounts: WebAppAccount[];
  onEdit: (tracker: WebAppLoanTracker) => void;
  onDelete: (trackerId: string) => void;
  onUpdate: (tracker: WebAppLoanTracker) => void;
}

export default function LoanTrackersList({ 
  trackers, 
  accounts, 
  onEdit, 
  onDelete 
}: LoanTrackersListProps) {
  const [progressTracker, setProgressTracker] = React.useState<WebAppLoanTracker | null>(null);
  const [deletingTrackerId, setDeletingTrackerId] = React.useState<string | null>(null);

  const handleDelete = async (trackerId: string) => {
    if (!confirm('Are you sure you want to delete this loan tracker?')) return;
    
    setDeletingTrackerId(trackerId);
    try {
      const response = await fetch(`/api/trackers/loans`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackerId }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete loan tracker');
      }

      onDelete(trackerId);
      toast.success('Loan tracker deleted successfully');
    } catch (error) {
      console.error('Error deleting loan tracker:', error);
      toast.error('Failed to delete loan tracker');
    } finally {
      setDeletingTrackerId(null);
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive 
      ? 'bg-green-500/10 text-green-700 dark:text-green-400'
      : 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
  };

  const getAccountName = (accountId: string | null) => {
    if (!accountId) return 'No account linked';
    const account = accounts.find(a => a.accountId === accountId);
    return account ? account.name : 'Unknown account';
  };

  if (trackers.length === 0) {
    return (
      <div className="text-center py-12">
        <Landmark className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No loan trackers yet</h3>
        <p className="text-muted-foreground">
          Create a loan tracker to monitor your EMI payments and track payoff progress
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {trackers.map((tracker) => {
          const progress = (tracker.paidInstallments / (tracker.tenureMonths || 1)) * 100;
          const remainingMonths = (tracker.tenureMonths || 0) - tracker.paidInstallments;
          
          return (
            <Card key={tracker.trackerId} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold leading-none">{tracker.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {getAccountName(tracker.linkedAccountId)}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={deletingTrackerId === tracker.trackerId}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setProgressTracker(tracker)}>
                        <BarChart3 className="h-4 w-4 mr-2" />
                        View Progress
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(tracker)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(tracker.trackerId)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <Badge className={getStatusColor(tracker.isActive)}>
                  {tracker.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Repayment Progress</span>
                    <span className="font-medium">
                      {tracker.paidInstallments} / {tracker.tenureMonths} EMIs
                    </span>
                  </div>
                  <Progress 
                    value={progress} 
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {progress.toFixed(1)}% complete
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Remaining Balance</p>
                    <p className="text-lg font-semibold text-red-600">
                      ${tracker.remainingBalance.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Monthly EMI</p>
                    <p className="text-lg font-semibold">
                      ${tracker.emiAmount.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{format(new Date(tracker.nextDueDate), 'MMM d')}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Percent className="h-3 w-3" />
                    <span>{tracker.interestRate}% APR</span>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="pt-3">
                <div className="w-full text-center">
                  <p className="text-sm text-muted-foreground">
                    {remainingMonths} months remaining
                  </p>
                </div>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {progressTracker && (
        <ProgressModal
          item={progressTracker}
          type="loan"
          open={!!progressTracker}
          onOpenChange={(open) => !open && setProgressTracker(null)}
        />
      )}
    </>
  );
} 