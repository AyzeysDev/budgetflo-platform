'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import type { WebAppSavingsTracker, WebAppCreateSavingsTrackerPayload, WebAppUpdateSavingsTrackerPayload } from '@/types/tracker';
import type { WebAppAccount } from '@/types/account';
import type { WebAppGoal } from '@/types/goal';

const savingsTrackerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  linkedAccountId: z.string().min(1, 'Linked account is required'),
  linkedGoalId: z.string().optional(),
  monthlyTarget: z.number().min(0, 'Monthly target must be 0 or greater').optional(),
  overallTarget: z.number().min(0, 'Overall target must be 0 or greater').optional(),
});

type SavingsTrackerFormData = z.infer<typeof savingsTrackerSchema>;

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
  tracker,
  accounts,
  goals,
  onSave,
}: SavingsTrackerFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Debug accounts data
  React.useEffect(() => {
    if (open) {
      console.log('SavingsTrackerForm - All accounts:', accounts);
      console.log('SavingsTrackerForm - Accounts length:', accounts?.length || 0);
      console.log('SavingsTrackerForm - Sample account:', accounts?.[0]);
      const filtered = accounts.filter(account => account.type === 'savings');
      console.log('SavingsTrackerForm - Filtered accounts:', filtered);
      console.log('SavingsTrackerForm - Filtered length:', filtered.length);
    }
  }, [open, accounts]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<SavingsTrackerFormData>({
    resolver: zodResolver(savingsTrackerSchema),
    defaultValues: {
      name: '',
      linkedAccountId: '',
      linkedGoalId: 'none',
      monthlyTarget: 0,
      overallTarget: 0,
    },
  });

  // Filter savings accounts - HARDCODED ROBUST FILTERING
  const savingsAccounts = React.useMemo(() => {
    if (!accounts || !Array.isArray(accounts)) {
      console.log('SavingsTrackerForm - No accounts or not array:', accounts);
      return [];
    }
    
    const filtered = accounts.filter(account => {
      if (!account || !account.type) {
        console.log('SavingsTrackerForm - Invalid account:', account);
        return false;
      }
      
      const isSavingsType = ['savings', 'checking', 'investment'].includes(account.type);
      console.log(`SavingsTrackerForm - Account "${account.name}" (${account.type}): ${isSavingsType ? 'INCLUDED' : 'EXCLUDED'}`);
      return isSavingsType;
    });
    
    console.log('SavingsTrackerForm - Final filtered accounts:', filtered);
    return filtered;
  }, [accounts]);

  React.useEffect(() => {
    if (tracker) {
      reset({
        name: tracker.name,
        linkedAccountId: tracker.linkedAccountId,
        linkedGoalId: tracker.linkedGoalId || 'none',
        monthlyTarget: tracker.monthlyTarget || 0,
        overallTarget: tracker.overallTarget || 0,
      });
    } else {
      reset({
        name: '',
        linkedAccountId: '',
        linkedGoalId: 'none',
        monthlyTarget: 0,
        overallTarget: 0,
      });
    }
  }, [tracker, reset]);

  const onSubmit = async (data: SavingsTrackerFormData) => {
    setIsSubmitting(true);
    try {
      const url = tracker ? `/api/trackers/savings` : '/api/trackers/savings';
      const method = tracker ? 'PUT' : 'POST';
      
      const payload: WebAppCreateSavingsTrackerPayload | WebAppUpdateSavingsTrackerPayload = {
        ...data,
        linkedGoalId: data.linkedGoalId === 'none' || !data.linkedGoalId ? null : data.linkedGoalId,
        monthlyTarget: data.monthlyTarget || null,
        overallTarget: data.overallTarget || null,
        ...(tracker && { trackerId: tracker.trackerId }),
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to save savings tracker');
      }

      const savedTracker = await response.json();
      onSave(savedTracker);
      toast.success(tracker ? 'Savings tracker updated successfully' : 'Savings tracker created successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving savings tracker:', error);
      toast.error('Failed to save savings tracker');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{tracker ? 'Edit Savings Tracker' : 'Create New Savings Tracker'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Tracker Name</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="e.g., Emergency Fund Savings"
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkedAccountId">Linked Account</Label>
            <Select
              value={watch('linkedAccountId')}
              onValueChange={(value) => setValue('linkedAccountId', value)}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a savings account" />
              </SelectTrigger>
              <SelectContent>
                {savingsAccounts.length > 0 ? (
                  savingsAccounts.map((account) => (
                    <SelectItem key={account.accountId} value={account.accountId}>
                      {account.name}
                    </SelectItem>
                  ))
                ) : (
                  // Fallback: show all accounts if filtering fails
                  accounts?.map((account) => (
                    <SelectItem key={account.accountId} value={account.accountId}>
                      {account.name} ({account.type.replace('_', ' ')}) [ALL]
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {savingsAccounts.length === 0 && accounts?.length > 0 && (
              <p className="text-sm text-blue-600 mt-1">
                ℹ️ Showing all accounts. Recommended: Create savings/checking/investment accounts for proper savings tracking.
              </p>
            )}
            {(!accounts || accounts.length === 0) && (
              <p className="text-sm text-amber-600 mt-1">
                ⚠️ No accounts available. Create accounts first to link with savings trackers.
              </p>
            )}
            {watch('linkedAccountId') && watch('linkedAccountId') !== '' && watch('linkedAccountId') !== 'none' && (
              <div className="text-sm text-muted-foreground mt-2 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-md">
                <p className="font-medium text-purple-700 dark:text-purple-300 mb-1">💰 Savings Tracking Features:</p>
                <ul className="space-y-1 text-purple-600 dark:text-purple-400">
                  <li>• Monitor account balance growth</li>
                  <li>• Track monthly savings targets</li>
                  <li>• Link to specific financial goals</li>
                  <li>• View progress towards targets</li>
                </ul>
              </div>
            )}
            {errors.linkedAccountId && (
              <p className="text-sm text-destructive mt-1">{errors.linkedAccountId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkedGoalId">Linked Goal (Optional)</Label>
            <Select
              value={watch('linkedGoalId')}
              onValueChange={(value) => setValue('linkedGoalId', value)}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a goal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {goals.map((goal) => (
                  <SelectItem key={goal.goalId} value={goal.goalId}>
                    {goal.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="monthlyTarget">Monthly Target (Optional)</Label>
              <Input
                id="monthlyTarget"
                type="number"
                step="0.01"
                {...register('monthlyTarget', { valueAsNumber: true })}
                placeholder="0.00"
                disabled={isSubmitting}
              />
              {errors.monthlyTarget && (
                <p className="text-sm text-destructive mt-1">{errors.monthlyTarget.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="overallTarget">Overall Target (Optional)</Label>
              <Input
                id="overallTarget"
                type="number"
                step="0.01"
                {...register('overallTarget', { valueAsNumber: true })}
                placeholder="0.00"
                disabled={isSubmitting}
              />
              {errors.overallTarget && (
                <p className="text-sm text-destructive mt-1">{errors.overallTarget.message}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : tracker ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 