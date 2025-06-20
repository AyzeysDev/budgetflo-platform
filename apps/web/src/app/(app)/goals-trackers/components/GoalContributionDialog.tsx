'use client';

import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { WebAppGoal } from '@/types/goal';
import type { WebAppAccount } from '@/types/account';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const contributionSchema = z.object({
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  description: z.string().optional(),
  date: z.date({ required_error: 'Date is required' }),
  accountId: z.string().min(1, 'Source account is required'),
});

type ContributionFormData = z.infer<typeof contributionSchema>;

interface GoalContributionDialogProps {
  goal: WebAppGoal;
  accounts: WebAppAccount[];
  onClose: () => void;
  onContributionSaved: (goal: WebAppGoal) => void;
}

export default function GoalContributionDialog({
  goal,
  accounts,
  onClose,
  onContributionSaved,
}: GoalContributionDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContributionFormData>({
    resolver: zodResolver(contributionSchema),
    defaultValues: {
      amount: undefined,
      description: '',
      date: new Date(),
      accountId: '',
    },
  });
  
  React.useEffect(() => {
    reset({
      amount: undefined,
      description: '',
      date: new Date(),
      accountId: '',
    });
  }, [goal, reset]);

  const onSubmit = async (data: ContributionFormData) => {
    setIsSubmitting(true);
    const toastId = toast.loading('Adding contribution...');
    
    try {
      // Step 1: Create the transaction
      const transactionResponse = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: data.accountId,
          amount: -data.amount, // Contribution is a withdrawal from the account
          type: 'expense',
          date: format(data.date, 'yyyy-MM-dd'),
          notes: `Contribution to goal: ${goal.name}`,
          description: data.description,
        }),
      });

      if (!transactionResponse.ok) {
        throw new Error('Failed to create transaction for the contribution.');
      }
      
      const newTransaction = await transactionResponse.json();

      // Step 2: Add contribution to the goal
      const contributionPayload = {
        amount: data.amount,
        date: format(data.date, 'yyyy-MM-dd'),
        notes: data.description,
        transactionId: newTransaction.transactionId,
      };

      const goalResponse = await fetch(`/api/goals/${goal.goalId}/contributions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contributionPayload),
      });

      if (!goalResponse.ok) {
        // Here you might want to delete the created transaction to avoid inconsistency
        throw new Error('Failed to add contribution to the goal.');
      }

      const updatedGoal = await goalResponse.json();
      onContributionSaved(updatedGoal);
      toast.success('Contribution added successfully', { id: toastId });
      onClose();
    } catch (error) {
      toast.error((error as Error).message, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const remainingAmount = goal.targetAmount - goal.currentAmount;

  return (
    <Dialog open={true} onOpenChange={(isOpen) => !isOpen && onClose()}>
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
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              {...register('amount', { valueAsNumber: true })}
              placeholder="50.00"
              disabled={isSubmitting}
            />
            {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountId">Source Account</Label>
            <Controller
              name="accountId"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.accountId} value={acc.accountId}>{acc.name} ({acc.type})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.accountId && <p className="text-sm text-destructive">{errors.accountId.message}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Controller
              control={control}
              name="date"
              render={({ field }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={'outline'}
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                      disabled={isSubmitting}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}
            />
            {errors.date && <p className="text-sm text-destructive">{errors.date.message}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="e.g., Monthly contribution"
              disabled={isSubmitting}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Add Contribution'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 