'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Plus, Link, Banknote } from 'lucide-react';
import { toast } from 'sonner';
import type { WebAppGoal } from '@/types/goal';
import type { WebAppAccount } from '@/types/account';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const manualContributionSchema = z.object({
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  notes: z.string().optional(),
});

type ManualContributionForm = z.infer<typeof manualContributionSchema>;

interface GoalContributionDialogProps {
  goal: WebAppGoal | null;
  accounts: WebAppAccount[];
  categories: any[];
  isOpen: boolean;
  onClose: () => void;
  onContributionSaved: () => void;
}

export default function GoalContributionDialog({
  goal,
  accounts,
  isOpen,
  onClose,
  onContributionSaved,
}: GoalContributionDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const linkedAccount = useMemo(() => {
    if (!goal?.linkedAccountId) return null;
    return accounts.find(acc => acc.accountId === goal.linkedAccountId) || null;
  }, [goal, accounts]);

  const isAlreadySynced = goal?.isSyncedWithAccount || false;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ManualContributionForm>({
    resolver: zodResolver(manualContributionSchema),
    defaultValues: {
      amount: 0,
      notes: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({ amount: 0, notes: '' });
    }
  }, [isOpen, reset]);

  const handleManualContribution = async (data: ManualContributionForm) => {
    if (!goal) return;

    setIsLoading(true);
    const toastId = toast.loading('Adding contribution...');

    try {
      const response = await fetch(`/api/goals/${goal.goalId}/contributions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: data.amount,
          notes: data.notes || `Manual contribution to ${goal.name}`,
          date: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add contribution');
      }

      const formatCurrency = (amount: number) => 
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

      toast.success(`Added ${formatCurrency(data.amount)} to ${goal.name}!`, { id: toastId });
      onContributionSaved();
      onClose();
    } catch (error) {
      toast.error((error as Error).message, { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !goal) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">
            {goal.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* SYNCED GOAL - Clean card style */}
          {isAlreadySynced && linkedAccount ? (
            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="text-center space-y-5">
                  {/* Simple sync icon */}
                  <div className="mx-auto w-12 h-12 rounded-full border-2 border-border bg-muted/50 flex items-center justify-center">
                    <Link className="h-5 w-5 text-muted-foreground" />
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Already Synced</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      This goal is automatically synced with your <span className="font-medium">{linkedAccount.name}</span> account
                    </p>
                  </div>

                  {/* Simple balance display */}
                  <div className="bg-muted/50 rounded-lg p-4 border border-border">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Current Balance</div>
                    <div className="text-2xl font-semibold">
                      ${linkedAccount.balance.toLocaleString()}
                    </div>
                  </div>

                  <Button 
                    variant="outline" 
                    onClick={onClose}
                    className="w-full"
                  >
                    Close
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* NON-SYNCED GOAL - Clean manual contribution card */
            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="space-y-5">
                  <div className="text-center">
                    {/* Simple plus icon */}
                    <div className="mx-auto w-12 h-12 rounded-full border-2 border-border bg-muted/50 flex items-center justify-center mb-4">
                      <Plus className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold">Add Contribution</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Manually add progress to your goal
                    </p>
                  </div>

                  <form onSubmit={handleSubmit(handleManualContribution)} className="space-y-5">
                    <div className="space-y-3">
                      <Label htmlFor="amount" className="text-sm font-medium">Amount <span className="text-red-500">*</span></Label>
                      <div className="relative">
                        <Banknote className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          className="pl-10"
                          {...register('amount', { valueAsNumber: true })}
                          disabled={isLoading}
                        />
                      </div>
                      {errors.amount && (
                        <p className="text-sm text-destructive">{errors.amount.message}</p>
                      )}
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="notes" className="text-sm font-medium">Notes (Optional)</Label>
                      <Textarea
                        id="notes"
                        placeholder="What's this contribution for?"
                        rows={3}
                        className="resize-none"
                        {...register('notes')}
                        disabled={isLoading}
                      />
                    </div>

                    <div className="flex gap-3 pt-3">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={onClose} 
                        className="flex-1"
                        disabled={isLoading}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={isLoading} 
                        className="flex-1"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          'Add Contribution'
                        )}
                      </Button>
                    </div>
                  </form>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 