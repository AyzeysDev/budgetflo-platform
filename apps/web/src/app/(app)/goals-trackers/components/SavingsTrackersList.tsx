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
  PiggyBank,
  Target,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import type { WebAppSavingsTracker } from '@/types/tracker';
import type { WebAppAccount } from '@/types/account';
import type { WebAppGoal } from '@/types/goal';
import { toast } from 'sonner';
import ProgressModal from './ProgressModal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface SavingsTrackersListProps {
  trackers: WebAppSavingsTracker[];
  accounts: WebAppAccount[];
  goals: WebAppGoal[];
  onEdit: (tracker: WebAppSavingsTracker) => void;
  onDelete: (trackerId: string) => void;
  onUpdate: (tracker: WebAppSavingsTracker) => void;
}

export default function SavingsTrackersList({ 
  trackers, 
  accounts, 
  goals,
  onEdit, 
  onDelete 
}: SavingsTrackersListProps) {
  const [progressTracker, setProgressTracker] = React.useState<WebAppSavingsTracker | null>(null);
  const [trackerToDelete, setTrackerToDelete] = React.useState<WebAppSavingsTracker | null>(null);

  const handleDelete = async () => {
    if (!trackerToDelete) return;

    const toastId = toast.loading('Deleting savings tracker...');
    try {
      const response = await fetch(`/api/trackers/savings?id=${trackerToDelete.trackerId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete savings tracker');
      }

      onDelete(trackerToDelete.trackerId);
      toast.success('Savings tracker deleted successfully', { id: toastId });
    } catch {
      toast.error('Failed to delete savings tracker', { id: toastId });
    } finally {
      setTrackerToDelete(null);
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive 
      ? 'bg-green-500/10 text-green-700 dark:text-green-400'
      : 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
  };

  const getAccountName = (accountId: string) => {
    const account = accounts.find(a => a.accountId === accountId);
    return account ? account.name : 'Unknown account';
  };

  const getGoalName = (goalId: string | null) => {
    if (!goalId) return null;
    const goal = goals.find(g => g.goalId === goalId);
    return goal ? goal.name : 'Unknown goal';
  };

  if (trackers.length === 0) {
    return (
      <div className="text-center py-12">
        <PiggyBank className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No savings trackers yet</h3>
        <p className="text-muted-foreground">
          Create a savings tracker to monitor your savings progress and link to goals
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {trackers.map((tracker) => {
          const currentBalance = tracker.currentBalance || 0;
          const monthlyTarget = tracker.monthlyTarget || 0;
          const goalProgress = tracker.goalProgress || 0;
          const goalName = getGoalName(tracker.linkedGoalId);
          
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
                        disabled={trackerToDelete === tracker}
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
                        className="text-destructive"
                        onClick={() => setTrackerToDelete(tracker)}
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Current Balance</p>
                    <p className="text-lg font-semibold text-green-600">
                      ${currentBalance.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Monthly Target</p>
                    <p className="text-lg font-semibold">
                      ${monthlyTarget.toLocaleString()}
                    </p>
                  </div>
                </div>

                {goalName && (
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Goal Progress</span>
                      <span className="font-medium">{goalName}</span>
                    </div>
                    <Progress 
                      value={goalProgress} 
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {goalProgress.toFixed(1)}% complete
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <TrendingUp className="h-3 w-3" />
                    <span>Savings Account</span>
                  </div>
                  {goalName && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Target className="h-3 w-3" />
                      <span>Linked to Goal</span>
                    </div>
                  )}
                </div>
              </CardContent>

              <CardFooter className="pt-3">
                <div className="w-full text-center">
                  <p className="text-sm text-muted-foreground">
                    {goalName ? `Contributing to ${goalName}` : 'No goal linked'}
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
          type="savings"
          open={!!progressTracker}
          onOpenChange={(open) => !open && setProgressTracker(null)}
        />
      )}

      {trackerToDelete && (
        <Dialog open={!!trackerToDelete} onOpenChange={() => setTrackerToDelete(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Savings Tracker</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete the savings tracker &quot;{trackerToDelete.name}&quot;? This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTrackerToDelete(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDelete}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
} 