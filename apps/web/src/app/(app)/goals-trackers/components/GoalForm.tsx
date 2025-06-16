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
      categoryId: '',
      linkedAccountId: '',
    },
  });

  React.useEffect(() => {
    if (goal) {
      reset({
        name: goal.name,
        targetAmount: goal.targetAmount,
        targetDate: format(new Date(goal.targetDate), 'yyyy-MM-dd'),
        description: goal.description || '',
        categoryId: goal.categoryId || '',
        linkedAccountId: goal.linkedAccountId || '',
      });
    } else {
      reset({
        name: '',
        targetAmount: 0,
        targetDate: format(new Date(), 'yyyy-MM-dd'),
        description: '',
        categoryId: '',
        linkedAccountId: '',
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
        categoryId: data.categoryId || null,
        linkedAccountId: data.linkedAccountId || null,
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{goal ? 'Edit Goal' : 'Create New Goal'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
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

          <div>
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

          <div>
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
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="What is this goal for?"
              disabled={isSubmitting}
            />
          </div>

          <div>
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
                <SelectItem value="">None</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="linkedAccountId">Linked Account (Optional)</Label>
            <Select
              value={watch('linkedAccountId')}
              onValueChange={(value) => setValue('linkedAccountId', value)}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {accounts.map((account) => (
                  <SelectItem key={account.accountId} value={account.accountId}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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