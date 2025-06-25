'use client';

import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { WebAppGoal, WebAppCreateGoalPayload, WebAppUpdateGoalPayload } from '@/types/goal';
import type { WebAppAccount } from '@/types/account';
import { cn } from '@/lib/utils';

const goalSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  targetAmount: z.number().min(0.01, 'Target amount must be greater than 0'),
  targetDate: z.date({
    required_error: "A target date is required.",
  }),
  description: z.string().optional(),
  linkedAccountId: z.string().optional(),
});

type GoalFormData = z.infer<typeof goalSchema>;

interface GoalFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (goal: WebAppGoal) => void;
  editingGoal: WebAppGoal | null;
  accounts: WebAppAccount[];
}

export default function GoalForm({ isOpen, onOpenChange, onSave, editingGoal, accounts }: GoalFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showWarning, setShowWarning] = React.useState(false);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
  });

  React.useEffect(() => {
    if (isOpen) {
      if (editingGoal) {
        reset({
          name: editingGoal.name,
          targetAmount: editingGoal.targetAmount,
          targetDate: new Date(editingGoal.targetDate),
          description: editingGoal.description || '',
          linkedAccountId: editingGoal.linkedAccountId || 'none',
        });
      } else {
        reset({
          name: '',
          targetAmount: 0,
          targetDate: new Date(),
          description: '',
          linkedAccountId: 'none',
        });
      }
    }
  }, [isOpen, editingGoal, reset]);

  const targetAmount = watch('targetAmount');
  const targetDate = watch('targetDate');
  const linkedAccountId = watch('linkedAccountId');
  
  // Check if switching from synced to manual
  React.useEffect(() => {
    if (editingGoal?.isSyncedWithAccount && linkedAccountId === 'none') {
      setShowWarning(true);
    } else {
      setShowWarning(false);
    }
  }, [linkedAccountId, editingGoal]);

  const suggestedContribution = React.useMemo(() => {
    if (!targetAmount || !targetDate || targetAmount <= 0) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(targetDate);
    if (target <= today) return null;

    const monthsUntilTarget = Math.max(1, Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30.44)));
    
    return Math.ceil(targetAmount / monthsUntilTarget);
  }, [targetAmount, targetDate]);

  const assetAccounts = React.useMemo(() => {
    if (!accounts) return [];
    return accounts.filter(account => ['savings', 'checking', 'investment', 'cash', 'other_asset'].includes(account.type));
  }, [accounts]);

  const onSubmit = async (data: GoalFormData) => {
    setIsSubmitting(true);
    const toastId = toast.loading(editingGoal ? "Updating goal..." : "Creating goal...");
    try {
      const url = editingGoal ? `/api/goals/${editingGoal.goalId}` : '/api/goals';
      const method = editingGoal ? 'PUT' : 'POST';
      
      // Auto-sync when account is selected (not 'none')
      const shouldSync = !!(data.linkedAccountId && data.linkedAccountId !== 'none');
      
      const payload: WebAppCreateGoalPayload | WebAppUpdateGoalPayload = {
        ...data,
        targetDate: format(data.targetDate, 'yyyy-MM-dd'),
        linkedAccountId: data.linkedAccountId === 'none' ? null : data.linkedAccountId,
        isSyncedWithAccount: shouldSync,
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save goal');
      }

      const savedGoal = await response.json();
      onSave(savedGoal);
      toast.success(editingGoal ? 'Goal updated' : 'Goal created', { id: toastId });
      onOpenChange(false);
    } catch (error) {
      toast.error((error as Error).message, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingGoal ? 'Edit Goal' : 'Create New Goal'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Goal Name</Label>
            <Input id="name" {...register('name')} placeholder="e.g., Emergency Fund" disabled={isSubmitting}/>
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetAmount">Target Amount</Label>
            <Input id="targetAmount" type="number" step="0.01" {...register('targetAmount', { valueAsNumber: true })} placeholder="0.00" disabled={isSubmitting}/>
            {errors.targetAmount && <p className="text-sm text-destructive">{errors.targetAmount.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Target Date</Label>
            <Controller
              name="targetDate"
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
            {errors.targetDate && <p className="text-sm text-destructive">{errors.targetDate.message}</p>}
            {suggestedContribution && (
              <div className="text-xs text-muted-foreground mt-2 p-2 bg-blue-50 dark:bg-blue-950/30 rounded-md border border-blue-200 dark:border-blue-800">
                <p>💡 To meet this goal, try saving ~{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(suggestedContribution)}/month.</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea id="description" {...register('description')} placeholder="What is this goal for?" disabled={isSubmitting} rows={2}/>
          </div>

           <div className="space-y-2">
             <Label htmlFor="linkedAccountId">Linked Savings Account (Optional)</Label>
             <Controller
                name="linkedAccountId"
                control={control}
                render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value} disabled={isSubmitting}>
                        <SelectTrigger><SelectValue placeholder="Select a savings account" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Manual Tracking</SelectItem>
                            {assetAccounts.map((a) => (<SelectItem key={a.accountId} value={a.accountId}>{a.name} - {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(a.balance)}</SelectItem>))}
                        </SelectContent>
                    </Select>
                )}
             />
             <p className="text-xs text-muted-foreground">
               Link to a savings account for automatic progress tracking, or choose manual tracking.
             </p>
           </div>

           {/* Auto-sync Status - Show when account is selected */}
           {linkedAccountId && linkedAccountId !== 'none' && (
             <div className="space-y-3 p-4 border rounded-lg bg-muted/50 border-border">
               <div className="space-y-2">
                 <div className="flex items-center gap-2">
                   <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                   <Label className="text-sm font-medium text-foreground">
                     Auto-Sync Enabled
                   </Label>
                 </div>
                 <p className="text-xs text-muted-foreground">
                   Goal progress will automatically match your account balance
                 </p>
               </div>
               {(() => {
                 const selectedAccount = assetAccounts.find(acc => acc.accountId === linkedAccountId);
                 return selectedAccount && (
                   <div className="text-xs bg-background p-3 rounded-lg border border-border">
                     <div className="flex items-center justify-between">
                       <span className="text-foreground font-medium">
                         Account Balance:
                       </span>
                       <span className="text-foreground font-bold">
                         {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(selectedAccount.balance)}
                       </span>
                     </div>
                     <p className="text-muted-foreground mt-1">
                       ✓ Goal will start with this amount as progress
                     </p>
                   </div>
                 );
               })()}
             </div>
           )}

           {/* Warning when switching from synced to manual */}
           {showWarning && (
             <div className="space-y-3 p-4 border rounded-lg bg-destructive/10 border-destructive/20">
               <div className="flex items-center gap-2">
                 <div className="w-2 h-2 bg-destructive rounded-full"></div>
                 <Label className="text-sm font-medium text-destructive">
                   Warning: Switching to Manual Tracking
                 </Label>
               </div>
               <p className="text-xs text-destructive/80">
                 Changing to manual tracking will reset your goal progress to $0. All previous contributions will be removed.
               </p>
             </div>
           )}

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : editingGoal ? 'Update Goal' : 'Create Goal'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 