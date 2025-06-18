'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import type { WebAppGoal } from '@/types/goal';

const contributionSchema = z.object({
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  description: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
});

type ContributionFormData = z.infer<typeof contributionSchema>;

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
  onSuccess,
}: GoalContributionDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContributionFormData>({
    resolver: zodResolver(contributionSchema),
    defaultValues: {
      amount: 0,
      description: '',
      date: format(new Date(), 'yyyy-MM-dd'),
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({
        amount: 0,
        description: '',
        date: format(new Date(), 'yyyy-MM-dd'),
      });
    }
  }, [open, reset]);

  const onSubmit = async (data: ContributionFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/goals/${goal.goalId}/contributions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: data.amount,
          date: data.date,
          notes: data.description,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add contribution');
      }

      // Fetch updated goal after contribution
      const goalResponse = await fetch(`/api/goals/${goal.goalId}`);
      if (!goalResponse.ok) {
        throw new Error('Failed to fetch updated goal');
      }

      const updatedGoal = await goalResponse.json();
      onSuccess(updatedGoal);
      toast.success('Contribution added successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding contribution:', error);
      toast.error('Failed to add contribution');
    } finally {
      setIsSubmitting(false);
    }
  };

  const remainingAmount = goal.targetAmount - goal.currentAmount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Contribution to {goal.name}</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current Progress:</span>
              <span className="font-medium">
                ${goal.currentAmount.toLocaleString()} / ${goal.targetAmount.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Remaining:</span>
              <span className="font-medium text-orange-600">
                ${remainingAmount.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Target Date:</span>
              <span className="font-medium">
                {format(new Date(goal.targetDate), 'MMM d, yyyy')}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Contribution Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              {...register('amount', { valueAsNumber: true })}
              placeholder="0.00"
              disabled={isSubmitting}
            />
            {errors.amount && (
              <p className="text-sm text-destructive mt-1">{errors.amount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Contribution Date</Label>
            <Input
              id="date"
              type="date"
              {...register('date')}
              disabled={isSubmitting}
            />
            {errors.date && (
              <p className="text-sm text-destructive mt-1">{errors.date.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="e.g., Monthly savings, bonus contribution"
              disabled={isSubmitting}
              rows={2}
            />
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
              {isSubmitting ? 'Adding...' : 'Add Contribution'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 