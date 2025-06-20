'use client';

import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type {
  WebAppSavingsTracker,
  WebAppCreateSavingsTrackerPayload,
  WebAppUpdateSavingsTrackerPayload,
} from '@/types/tracker';
import type { WebAppAccount } from '@/types/account';

const savingsTrackerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  linkedAccountId: z.string().min(1, 'An account is required.'),
  overallTarget: z.number().optional(),
});

type SavingsTrackerFormData = z.infer<typeof savingsTrackerSchema>;

interface SavingsTrackerFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (tracker: WebAppSavingsTracker) => void;
  editingTracker: WebAppSavingsTracker | null;
  accounts: WebAppAccount[];
}

export default function SavingsTrackerForm({
  isOpen,
  onOpenChange,
  onSave,
  editingTracker,
  accounts,
}: SavingsTrackerFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SavingsTrackerFormData>({
    resolver: zodResolver(savingsTrackerSchema),
  });

  const savingsAccounts = React.useMemo(() => {
    return accounts.filter(acc => acc.type === 'savings');
  }, [accounts]);

  React.useEffect(() => {
    if (isOpen) {
      if (editingTracker) {
        reset({
          name: editingTracker.name,
          linkedAccountId: editingTracker.linkedAccountId,
          overallTarget: editingTracker.overallTarget || undefined,
        });
      } else {
        reset({
          name: '',
          linkedAccountId: '',
          overallTarget: undefined,
        });
      }
    }
  }, [isOpen, editingTracker, reset]);

  const onSubmit = async (data: SavingsTrackerFormData) => {
    setIsSubmitting(true);
    const toastId = toast.loading('Saving tracker...');

    if (data.linkedAccountId === 'none') {
        toast.error('Please select a savings account.', { id: toastId });
        setIsSubmitting(false);
        return;
    }

    try {
      const url = editingTracker
        ? `/api/trackers/savings?id=${editingTracker.trackerId}`
        : '/api/trackers/savings';
      const method = editingTracker ? 'PUT' : 'POST';
      
      const basePayload = {
        name: data.name,
        linkedAccountId: data.linkedAccountId,
        overallTarget: data.overallTarget || null,
      };

      const payload:
        | WebAppCreateSavingsTrackerPayload
        | WebAppUpdateSavingsTrackerPayload = editingTracker
        ? { ...basePayload, trackerId: editingTracker.trackerId }
        : basePayload;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save tracker');
      }

      const savedTracker = await response.json();
      onSave(savedTracker);
      toast.success('Savings tracker saved', { id: toastId });
      onOpenChange(false);
    } catch (error) {
      toast.error((error as Error).message, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingTracker ? 'Edit Savings Tracker' : 'New Savings Tracker'}</DialogTitle>
          <DialogDescription>
            Track savings in a dedicated account. Set a target to watch your progress.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Tracker Name</Label>
            <Input id="name" {...register('name')} placeholder="e.g., Vacation Fund" disabled={isSubmitting}/>
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Linked Savings Account</Label>
             <Controller
                name="linkedAccountId"
                control={control}
                render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value} disabled={isSubmitting}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a savings account" />
                        </SelectTrigger>
                        <SelectContent>
                            {savingsAccounts.length > 0 ? (
                                savingsAccounts.map((acc) => (<SelectItem key={acc.accountId} value={acc.accountId}>{acc.name}</SelectItem>))
                            ) : (
                                <p className="p-4 text-sm text-muted-foreground">No savings accounts found.</p>
                            )}
                        </SelectContent>
                    </Select>
                )}
             />
             {errors.linkedAccountId && <p className="text-sm text-destructive">{errors.linkedAccountId.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="overallTarget">Overall Target (Optional)</Label>
            <Input id="overallTarget" type="number" step="0.01" {...register('overallTarget', { valueAsNumber: true })} placeholder="1000.00" disabled={isSubmitting}/>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Create Tracker'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 