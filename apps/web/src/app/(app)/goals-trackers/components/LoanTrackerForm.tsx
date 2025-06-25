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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import type { WebAppLoanTracker, WebAppCreateLoanTrackerPayload, WebAppUpdateLoanTrackerPayload } from '@/types/tracker';
import type { WebAppAccount } from '@/types/account';
import { cn } from '@/lib/utils';
import { Controller } from 'react-hook-form';

const loanTrackerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  totalAmount: z.number().min(0.01, 'Total amount must be greater than 0'),
  interestRate: z.number().min(0, 'Interest rate cannot be negative'),
  tenureMonths: z.number().min(1, 'Tenure must be at least 1 month'),
  startDate: z.date({ required_error: 'Start date is required' }),
  emiAmount: z.number().min(0.01, 'EMI amount must be greater than 0'),
  linkedAccountId: z.string().min(1, 'Please select a linked account'),
});

type LoanTrackerFormData = z.infer<typeof loanTrackerSchema>;

interface LoanTrackerFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (tracker: WebAppLoanTracker) => void;
  editingTracker: WebAppLoanTracker | null;
  accounts: WebAppAccount[];
}

export default function LoanTrackerForm({
  isOpen,
  onOpenChange,
  onSave,
  editingTracker,
  accounts,
}: LoanTrackerFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Debug accounts data
  React.useEffect(() => {
    if (isOpen) {
      console.log('LoanTrackerForm - All accounts:', accounts);
      console.log('LoanTrackerForm - Accounts length:', accounts?.length || 0);
      console.log('LoanTrackerForm - Sample account:', accounts?.[0]);
      const filtered = accounts.filter(account => ['home_loan', 'personal_loan', 'car_loan', 'student_loan', 'line_of_credit', 'other_liability'].includes(account.type));
      console.log('LoanTrackerForm - Filtered accounts:', filtered);
      console.log('LoanTrackerForm - Filtered length:', filtered.length);
    }
  }, [isOpen, accounts]);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<LoanTrackerFormData>({
    resolver: zodResolver(loanTrackerSchema),
  });

  // Filter liability accounts for loans - HARDCODED ROBUST FILTERING
  const liabilityAccounts = React.useMemo(() => {
    if (!accounts || !Array.isArray(accounts)) {
      console.log('LoanTrackerForm - No accounts or not array:', accounts);
      return [];
    }
    
    const filtered = accounts.filter(account => {
      if (!account || !account.type) {
        console.log('LoanTrackerForm - Invalid account:', account);
        return false;
      }
      
      const isLiability = ['home_loan', 'personal_loan', 'car_loan', 'student_loan', 'line_of_credit', 'other_liability', 'credit_card'].includes(account.type);
      console.log(`LoanTrackerForm - Account "${account.name}" (${account.type}): ${isLiability ? 'INCLUDED' : 'EXCLUDED'}`);
      return isLiability;
    });
    
    console.log('LoanTrackerForm - Final filtered accounts:', filtered);
    return filtered;
  }, [accounts]);

  React.useEffect(() => {
    if (editingTracker) {
      reset({
        name: editingTracker.name,
        totalAmount: editingTracker.totalAmount,
        interestRate: editingTracker.interestRate,
        tenureMonths: editingTracker.tenureMonths,
        startDate: new Date(editingTracker.startDate),
        emiAmount: editingTracker.emiAmount,
        linkedAccountId: editingTracker.linkedAccountId || '',
      });
    } else {
      reset({
        name: '',
        totalAmount: 0,
        interestRate: 0,
        tenureMonths: 12,
        startDate: new Date(),
        emiAmount: 0,
        linkedAccountId: '',
      });
    }
  }, [editingTracker, reset]);

  // Calculate EMI when loan details change
  const totalAmount = watch('totalAmount');
  const interestRate = watch('interestRate');
  const tenureMonths = watch('tenureMonths');

  React.useEffect(() => {
    if (totalAmount > 0 && interestRate >= 0 && tenureMonths > 0) {
      const monthlyRate = interestRate / 100 / 12;
      let emi = 0;
      
      if (monthlyRate > 0) {
        emi = (totalAmount * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) / 
              (Math.pow(1 + monthlyRate, tenureMonths) - 1);
      } else {
        emi = totalAmount / tenureMonths;
      }
      
      setValue('emiAmount', Math.round(emi * 100) / 100);
    }
  }, [totalAmount, interestRate, tenureMonths, setValue]);

  const onSubmit = async (data: LoanTrackerFormData) => {
    setIsSubmitting(true);
    const toastId = toast.loading(editingTracker ? "Updating loan tracker..." : "Creating loan tracker...");
    
    try {
      const url = editingTracker ? `/api/trackers/loans` : '/api/trackers/loans';
      const method = editingTracker ? 'PUT' : 'POST';
      
      const payload: WebAppCreateLoanTrackerPayload | WebAppUpdateLoanTrackerPayload = {
        ...data,
        linkedAccountId: data.linkedAccountId,
        ...(editingTracker && { trackerId: editingTracker.trackerId }),
        startDate: format(data.startDate, 'yyyy-MM-dd'),
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save loan tracker');
      }

      const savedTracker = await response.json();
      onSave(savedTracker);
      toast.success(editingTracker ? 'Loan tracker updated successfully' : 'Loan tracker created successfully', { id: toastId });
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving loan tracker:', error);
      toast.error((error as Error).message, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingTracker ? 'Edit Loan Tracker' : 'Create New Loan Tracker'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Loan Name</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="e.g., Home Loan, Car Loan"
              disabled={isSubmitting}
            />
            {errors.name && (
              <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="totalAmount">Total Amount</Label>
              <Input
                id="totalAmount"
                type="number"
                step="0.01"
                {...register('totalAmount', { valueAsNumber: true })}
                placeholder="0.00"
                disabled={isSubmitting}
              />
              {errors.totalAmount && (
                <p className="text-sm text-destructive mt-1">{errors.totalAmount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="interestRate">Interest Rate (%)</Label>
              <Input
                id="interestRate"
                type="number"
                step="0.01"
                {...register('interestRate', { valueAsNumber: true })}
                placeholder="0.00"
                disabled={isSubmitting}
              />
              {errors.interestRate && (
                <p className="text-sm text-destructive mt-1">{errors.interestRate.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tenureMonths">Tenure (months)</Label>
              <Input
                id="tenureMonths"
                type="number"
                {...register('tenureMonths', { valueAsNumber: true })}
                placeholder="12"
                disabled={isSubmitting}
              />
              {errors.tenureMonths && (
                <p className="text-sm text-destructive mt-1">{errors.tenureMonths.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Start Date</Label>
              <Controller
                name="startDate"
                control={control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.startDate && <p className="text-sm text-destructive">{errors.startDate.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="emiAmount">EMI Amount (Auto-calculated)</Label>
            <Input
              id="emiAmount"
              type="number"
              step="0.01"
              {...register('emiAmount', { valueAsNumber: true })}
              placeholder="0.00"
              disabled={true}
              className="bg-muted"
            />
            {errors.emiAmount && (
              <p className="text-sm text-destructive mt-1">{errors.emiAmount.message}</p>
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
                <SelectValue placeholder="Select a loan account (required)" />
              </SelectTrigger>
              <SelectContent>
                {liabilityAccounts.length > 0 ? (
                  liabilityAccounts.map((account) => (
                    <SelectItem key={account.accountId} value={account.accountId}>
                      {account.name} - {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(account.balance)} ({account.type.replace('_', ' ')})
                    </SelectItem>
                  ))
                ) : (
                  // Fallback: show all accounts if filtering fails
                  accounts?.map((account) => (
                    <SelectItem key={account.accountId} value={account.accountId}>
                      {account.name} - {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(account.balance)} ({account.type.replace('_', ' ')}) [ALL]
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {liabilityAccounts.length === 0 && accounts?.length > 0 && (
              <p className="text-sm text-blue-600 mt-1">
                ℹ️ Showing all accounts. Recommended: Create loan accounts for proper EMI tracking.
              </p>
            )}
            {(!accounts || accounts.length === 0) && (
              <p className="text-sm text-amber-600 mt-1">
                ⚠️ No accounts available. Create accounts first to link with loan trackers.
              </p>
            )}
            {watch('linkedAccountId') && (
              <div className="space-y-3 p-4 border rounded-lg bg-muted/50 border-border">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <Label className="text-sm font-medium text-foreground">
                      Auto-Sync Enabled
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Loan progress will automatically sync with account balance
                  </p>
                </div>
                {(() => {
                  const selectedAccount = liabilityAccounts.length > 0 
                    ? liabilityAccounts.find(acc => acc.accountId === watch('linkedAccountId'))
                    : accounts?.find(acc => acc.accountId === watch('linkedAccountId'));
                  return selectedAccount && (
                    <div className="text-xs bg-background p-3 rounded-lg border border-border">
                      <div className="flex items-center justify-between">
                        <span className="text-foreground font-medium">
                          Current Balance:
                        </span>
                        <span className="text-foreground font-bold">
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedAccount.balance)}
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-1">
                        💡 Progress = (Total Loan - Current Balance) ÷ Total Loan
                      </p>
                      <p className="text-muted-foreground text-xs">
                        As you make payments, the account balance decreases and progress increases
                      </p>
                    </div>
                  );
                })()}
              </div>
            )}
            {errors.linkedAccountId && (
              <p className="text-sm text-destructive mt-1">{errors.linkedAccountId.message}</p>
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
              {isSubmitting ? 'Saving...' : editingTracker ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 