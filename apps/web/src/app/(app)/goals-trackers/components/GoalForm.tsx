'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import type { WebAppGoal, WebAppCreateGoalPayload, WebAppUpdateGoalPayload } from '@/types/goal';
import type { WebAppCategory } from '@/types/budget';
import type { WebAppAccount } from '@/types/account';
import { format } from 'date-fns';

const goalSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  targetAmount: z.number().min(0.01, 'Target amount must be greater than 0'),
  targetDate: z.string().min(1, 'Target date is required'),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  linkedAccountId: z.string().optional(),
});

type GoalFormData = z.infer<typeof goalSchema>;

interface GoalFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: WebAppGoal | null;
  categories: WebAppCategory[];
  accounts: WebAppAccount[];
  onSave: (goal: WebAppGoal) => void;
}

export default function GoalForm({
  open,
  onOpenChange,
  goal,
  categories,
  accounts,
  onSave,
}: GoalFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Debug accounts data
  React.useEffect(() => {
    if (open) {
      console.log('GoalForm - All accounts:', accounts);
      console.log('GoalForm - Accounts length:', accounts?.length || 0);
      console.log('GoalForm - Sample account:', accounts?.[0]);
      const filtered = accounts.filter(account => ['savings', 'checking', 'investment'].includes(account.type));
      console.log('GoalForm - Filtered accounts:', filtered);
      console.log('GoalForm - Filtered length:', filtered.length);
    }
  }, [open, accounts]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      name: '',
      targetAmount: 0,
      targetDate: format(new Date(), 'yyyy-MM-dd'),
      description: '',
      categoryId: 'none',
      linkedAccountId: 'none',
    },
  });

  // Calculate suggested monthly contribution
  const targetAmount = watch('targetAmount');
  const targetDate = watch('targetDate');
  
  const getSuggestedContribution = () => {
    if (!targetAmount || !targetDate || targetAmount <= 0) return null;
    
    const today = new Date();
    const target = new Date(targetDate);
    const monthsUntilTarget = Math.max(1, Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30)));
    
    return Math.ceil(targetAmount / monthsUntilTarget);
  };

  const suggestedContribution = getSuggestedContribution();

  // Filter asset accounts for goals - HARDCODED ROBUST FILTERING
  const assetAccounts = React.useMemo(() => {
    if (!accounts || !Array.isArray(accounts)) {
      console.log('GoalForm - No accounts or not array:', accounts);
      return [];
    }
    
    const filtered = accounts.filter(account => {
      if (!account || !account.type) {
        console.log('GoalForm - Invalid account:', account);
        return false;
      }
      
      const isAsset = ['savings', 'checking', 'investment', 'cash', 'property', 'other_asset'].includes(account.type);
      console.log(`GoalForm - Account "${account.name}" (${account.type}): ${isAsset ? 'INCLUDED' : 'EXCLUDED'}`);
      return isAsset;
    });
    
    console.log('GoalForm - Final filtered accounts:', filtered);
    return filtered;
  }, [accounts]);

  React.useEffect(() => {
    if (goal) {
      reset({
        name: goal.name,
        targetAmount: goal.targetAmount,
        targetDate: format(new Date(goal.targetDate), 'yyyy-MM-dd'),
        description: goal.description || '',
        categoryId: goal.categoryId || 'none',
        linkedAccountId: goal.linkedAccountId || 'none',
      });
    } else {
      reset({
        name: '',
        targetAmount: 0,
        targetDate: format(new Date(), 'yyyy-MM-dd'),
        description: '',
        categoryId: 'none',
        linkedAccountId: 'none',
      });
    }
  }, [goal, reset]);

  const onSubmit = async (data: GoalFormData) => {
    setIsSubmitting(true);
    try {
      const url = goal ? `/api/goals/${goal.goalId}` : '/api/goals';
      const method = goal ? 'PUT' : 'POST';
      
      const payload: WebAppCreateGoalPayload | WebAppUpdateGoalPayload = {
        ...data,
        categoryId: data.categoryId === 'none' || !data.categoryId ? null : data.categoryId,
        linkedAccountId: data.linkedAccountId === 'none' || !data.linkedAccountId ? null : data.linkedAccountId,
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to save goal');
      }

      const savedGoal = await response.json();
      onSave(savedGoal);
      toast.success(goal ? 'Goal updated successfully' : 'Goal created successfully');
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving goal:', error);
      toast.error('Failed to save goal');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{goal ? 'Edit Goal' : 'Create New Goal'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Goal Name</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="e.g., Emergency Fund"
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetAmount">Target Amount</Label>
            <Input
              id="targetAmount"
              type="number"
              step="0.01"
              {...register('targetAmount', { valueAsNumber: true })}
              placeholder="0.00"
              disabled={isSubmitting}
            />
            {errors.targetAmount && (
              <p className="text-sm text-destructive mt-1">{errors.targetAmount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetDate">Target Date</Label>
            <Input
              id="targetDate"
              type="date"
              {...register('targetDate')}
              disabled={isSubmitting}
            />
            {errors.targetDate && (
              <p className="text-sm text-destructive mt-1">{errors.targetDate.message}</p>
            )}
            {suggestedContribution && (
              <div className="text-xs text-muted-foreground mt-1 p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded-md">
                <p className="font-medium text-yellow-700 dark:text-yellow-300">💡 Save ${suggestedContribution.toLocaleString()}/month to reach your goal</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="What is this goal for?"
              disabled={isSubmitting}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoryId">Category (Optional)</Label>
            <Select
              value={watch('categoryId')}
              onValueChange={(value) => setValue('categoryId', value)}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="linkedAccountId">Linked Account (Optional)</Label>
            <Select
              value={watch('linkedAccountId')}
              onValueChange={(value) => setValue('linkedAccountId', value)}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a savings account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {assetAccounts.length > 0 ? (
                  assetAccounts.map((account) => (
                    <SelectItem key={account.accountId} value={account.accountId}>
                      {account.name} ({account.type.replace('_', ' ')})
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
            {assetAccounts.length === 0 && accounts?.length > 0 && (
              <p className="text-sm text-blue-600 mt-1">
                ℹ️ Showing all accounts. Recommended: Create savings/checking/investment accounts for better goal tracking.
              </p>
            )}
            {(!accounts || accounts.length === 0) && (
              <p className="text-sm text-amber-600 mt-1">
                ⚠️ No accounts available. Create accounts first to link with goals.
              </p>
            )}
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
              {isSubmitting ? 'Saving...' : goal ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 