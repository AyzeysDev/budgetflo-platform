// apps/web/src/app/(app)/transactions/TransactionForm.tsx
"use client";

import React, { useEffect, useMemo } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel
} from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { WebAppTransaction, WebAppCreateTransactionPayload, WebAppUpdateTransactionPayload } from '@/types/transaction';
import { WebAppAccount } from '@/types/account';
import { WebAppCategory } from '@/types/budget';
import { WebAppGoal } from '@/types/goal';
import { WebAppLoanTracker } from '@/types/tracker';
import { Loader2, CalendarIcon, ArrowLeftRight, Tag, Landmark, FileText, DollarSign, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IconRenderer, AvailableIconName } from '../categories/categoryUtils';
import useSWR, { mutate } from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

const transactionFormSchema = z.object({
  date: z.date({ required_error: "A transaction date is required." }),
  amount: z.coerce.number({ invalid_type_error: "Amount must be a number." }).min(0.01, "Amount must be greater than 0."),
  type: z.enum(['income', 'expense']),
  accountId: z.string().min(1, "An account is required."),
  categoryId: z.string({ required_error: "A category is required."}).min(1, "A category is required."),
  linkedEntity: z.string().optional().nullable(),
});

type TransactionFormData = z.infer<typeof transactionFormSchema>;

interface TransactionFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  transactionToEdit?: WebAppTransaction | null;
  accounts: WebAppAccount[];
  categories: WebAppCategory[];
  // Replaced with a more generic callback
  onFormSubmitSuccess: () => void;
  // Pre-fill data for creating from other contexts (e.g., goals)
  prefillData?: Partial<WebAppCreateTransactionPayload>;
}

export default function TransactionForm({
  isOpen,
  onOpenChange,
  transactionToEdit,
  accounts,
  categories,
  onFormSubmitSuccess,
  prefillData,
}: TransactionFormProps) {
  const { data: goals, isLoading: isLoadingGoals } = useSWR<WebAppGoal[]>('/api/goals?isActive=true', fetcher);
  const { data: loans, isLoading: isLoadingLoans } = useSWR<WebAppLoanTracker[]>('/api/trackers/loans?isActive=true', fetcher);
  
  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting, isValid, isDirty },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionFormSchema),
    mode: 'onChange',
  });

  const watchedType = watch('type');

  // When the type toggles, reset the selected category to prevent mismatches
  useEffect(() => {
    setValue("categoryId", "");
  }, [watchedType, setValue]);

  useEffect(() => {
    if (isOpen) {
      const linkedEntityValue = transactionToEdit?.linkedGoalId ? `goal_${transactionToEdit.linkedGoalId}` 
                              : transactionToEdit?.linkedLoanTrackerId ? `loan_${transactionToEdit.linkedLoanTrackerId}`
                              : 'none';
      if (transactionToEdit) {
        reset({
          date: new Date(transactionToEdit.date),
          amount: transactionToEdit.amount,
          type: transactionToEdit.type,
          accountId: transactionToEdit.accountId,
          categoryId: transactionToEdit.categoryId,
          linkedEntity: linkedEntityValue
        });
      } else {
        reset({
          date: prefillData?.date ? new Date(prefillData.date) : new Date(),
          amount: prefillData?.amount,
          type: prefillData?.type || 'expense',
          accountId: prefillData?.accountId || accounts[0]?.accountId || '',
          categoryId: prefillData?.categoryId || '', // Do not pre-select a category
          description: prefillData?.description || '',
          linkedEntity: prefillData?.linkedGoalId ? `goal_${prefillData.linkedGoalId}` : prefillData?.linkedLoanTrackerId ? `loan_${prefillData.linkedLoanTrackerId}` : 'none',
        });
      }
    }
  }, [isOpen, transactionToEdit, accounts, categories, reset, prefillData]);

  const expenseCategories = useMemo(() => categories.filter(c => c.type === 'expense'), [categories]);
  const incomeCategories = useMemo(() => categories.filter(c => c.type === 'income'), [categories]);

  const onSubmitHandler: SubmitHandler<TransactionFormData> = async (data) => {
    const { linkedEntity, ...restOfData } = data;
    let linkedGoalId: string | undefined;
    let linkedLoanTrackerId: string | undefined;
    let source: WebAppCreateTransactionPayload['source'] = 'user_manual';

    if(linkedEntity && linkedEntity !== 'none') {
      const [type, id] = linkedEntity.split('_');
      if (type === 'goal') {
        linkedGoalId = id;
        source = 'goal_contribution';
      } else if (type === 'loan') {
        linkedLoanTrackerId = id;
        source = 'loan_payment';
      }
    }

    const payload: WebAppCreateTransactionPayload | WebAppUpdateTransactionPayload = {
      ...restOfData,
      date: data.date.toISOString(),
      amount: Number(data.amount),
      description: '',
      categoryId: data.type === 'income' ? (data.categoryId || null) : data.categoryId,
      linkedGoalId,
      linkedLoanTrackerId,
      source,
    };
    
    const url = transactionToEdit
      ? `/api/transactions/${transactionToEdit.transactionId}`
      : '/api/transactions';
    const method = transactionToEdit ? 'PUT' : 'POST';

    const toastId = `transaction-form-toast-${transactionToEdit?.transactionId || 'new'}`;
    toast.loading(transactionToEdit ? "Updating transaction..." : "Creating transaction...", { id: toastId });

    try {
      const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json();
      toast.dismiss(toastId);

      if (!response.ok) throw new Error(result.error || "Failed to save transaction.");

      toast.success(`Transaction saved successfully!`);
      
      // Comprehensive re-validation
      mutate('/api/transactions');
      mutate('/api/accounts');
      mutate('/api/budgets/overall');
      mutate('/api/goals');
      mutate('/api/trackers/loans');
      mutate('/api/trackers/savings');
      
      onFormSubmitSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error((error as Error).message, { id: toastId });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-primary" />
            {transactionToEdit ? 'Edit Transaction' : 'Add Transaction'}
          </DialogTitle>
          <DialogDescription>
            Log a new income or expense. Link it to a goal or loan to keep everything in sync.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmitHandler)} className="px-6 pb-6 space-y-4 max-h-[80vh] overflow-y-auto">
          
          <div className="grid grid-cols-2 gap-4">
            {/* Amount and Date */}
            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount</Label>
              <div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="amount" type="number" step="0.01" {...register('amount')} placeholder="0.00" className="pl-8" /></div>
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="date">Date</Label>
              <Controller name="date" control={control} render={({ field }) => (
                  <Popover><PopoverTrigger asChild><Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? new Date(field.value).toLocaleDateString() : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover>
              )} />
              {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
            </div>
          </div>
          
          {/* Type Toggle */}
          <Controller name="type" control={control} render={({ field }) => (
              <div className="grid grid-cols-2 gap-2 rounded-md bg-muted p-1">
                <Button type="button" variant={field.value === 'expense' ? 'destructive' : 'ghost'} onClick={() => field.onChange('expense')} size="sm" disabled={!!prefillData?.type}>Expense</Button>
                <Button type="button" variant={field.value === 'income' ? 'default' : 'ghost'} onClick={() => field.onChange('income')} size="sm" disabled={!!prefillData?.type}>Income</Button>
              </div>
          )} />

          {/* Account */}
          <div className="space-y-1.5">
            <Label htmlFor="accountId" className="flex items-center gap-1.5"><Landmark className="w-4 h-4 text-muted-foreground"/> Account</Label>
            <Controller name="accountId" control={control} render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}><SelectTrigger id="accountId"><SelectValue placeholder="Select account..." /></SelectTrigger><SelectContent>{accounts.map(acc => <SelectItem key={acc.accountId} value={acc.accountId}>{acc.name}</SelectItem>)}</SelectContent></Select>
            )} />
            {errors.accountId && <p className="text-xs text-destructive">{errors.accountId.message}</p>}
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label htmlFor="categoryId" className="flex items-center gap-1.5"><Tag className="w-4 h-4 text-muted-foreground"/> Category</Label>
            <Controller name="categoryId" control={control} render={({ field }) => (
              <Select 
                onValueChange={field.onChange} 
                value={field.value || ''} 
                disabled={(watchedType === 'expense' && expenseCategories.length === 0) || (watchedType === 'income' && incomeCategories.length === 0)}>
                <SelectTrigger id="categoryId"><SelectValue placeholder="Select category..." /></SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>{watchedType === 'expense' ? 'Expenses' : 'Income'}</SelectLabel>
                    {(watchedType === 'expense' ? expenseCategories : incomeCategories).map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <div className="flex items-center gap-2">
                          <IconRenderer name={cat.icon as AvailableIconName} size={14} color={cat.color || undefined} />
                          {cat.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )} />
            {errors.categoryId && <p className="text-xs text-destructive">{errors.categoryId.message}</p>}
          </div>

          {/* Link to Goal/Loan */}
          <div className="space-y-1.5">
            <Label htmlFor="linkedEntity" className="flex items-center gap-1.5"><Link2 className="w-4 h-4 text-muted-foreground"/> Link to (Optional)</Label>
            <Controller name="linkedEntity" control={control} render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value || ''} disabled={isLoadingGoals || isLoadingLoans || !!prefillData?.linkedGoalId || !!prefillData?.linkedLoanTrackerId}>
                <SelectTrigger id="linkedEntity"><SelectValue placeholder="Link to a goal or loan..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {goals && goals.length > 0 && <SelectGroup><SelectLabel>Goals</SelectLabel>{goals.map(g => <SelectItem key={g.goalId} value={`goal_${g.goalId}`}>{g.name}</SelectItem>)}</SelectGroup>}
                  {loans && loans.length > 0 && <SelectGroup><SelectLabel>Loans</SelectLabel>{loans.map(l => <SelectItem key={l.trackerId} value={`loan_${l.trackerId}`}>{l.name}</SelectItem>)}</SelectGroup>}
                </SelectContent>
              </Select>
            )} />
          </div>
          
          <DialogFooter className="pt-4 sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pb-6 -mx-6 px-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || !isValid}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {transactionToEdit ? 'Save Changes' : 'Add Transaction'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
