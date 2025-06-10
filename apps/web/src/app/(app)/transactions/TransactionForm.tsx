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
import { Loader2, CalendarIcon, ArrowLeftRight, Tag, Landmark, FileText, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IconRenderer, AvailableIconName } from '../categories/categoryUtils';

const transactionFormSchema = z.object({
  date: z.date({ required_error: "A transaction date is required." }),
  amount: z.coerce.number({ invalid_type_error: "Amount must be a number." }).min(0.01, "Amount must be greater than 0."),
  type: z.enum(['income', 'expense']),
  accountId: z.string().min(1, "An account is required."),
  categoryId: z.string().optional().nullable(),
  notes: z.string().max(280, "Notes can be up to 280 characters.").optional().nullable(),
}).refine(data => data.type !== 'expense' || !!data.categoryId, {
  message: "Category is required for expenses.",
  path: ["categoryId"],
});

type TransactionFormData = z.infer<typeof transactionFormSchema>;

interface TransactionFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  transactionToEdit?: WebAppTransaction | null;
  accounts: WebAppAccount[];
  categories: WebAppCategory[];
  onSaveSuccess: () => void; // Callback to trigger refetch
}

export default function TransactionForm({
  isOpen,
  onOpenChange,
  transactionToEdit,
  accounts,
  categories,
  onSaveSuccess,
}: TransactionFormProps) {
  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting, isValid, isDirty },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionFormSchema),
    mode: 'onChange',
  });

  const watchedType = watch('type');

  useEffect(() => {
    if (isOpen) {
      if (transactionToEdit) {
        reset({
          date: new Date(transactionToEdit.date),
          amount: transactionToEdit.amount,
          type: transactionToEdit.type,
          accountId: transactionToEdit.accountId,
          categoryId: transactionToEdit.categoryId,
          notes: transactionToEdit.notes,
        });
      } else {
        reset({
          date: new Date(),
          amount: undefined,
          type: 'expense',
          accountId: accounts[0]?.accountId || '',
          categoryId: categories.find(c => c.type === 'expense')?.id || '',
          notes: '',
        });
      }
    }
  }, [isOpen, transactionToEdit, accounts, categories, reset]);

  const expenseCategories = useMemo(() => categories.filter(c => c.type === 'expense'), [categories]);
  const incomeCategories = useMemo(() => categories.filter(c => c.type === 'income'), [categories]);

  const onSubmitHandler: SubmitHandler<TransactionFormData> = async (data) => {
    const payload: WebAppCreateTransactionPayload | WebAppUpdateTransactionPayload = {
      ...data,
      date: data.date.toISOString(),
      amount: Number(data.amount),
      // Ensure categoryId is null for income if not provided
      categoryId: data.type === 'income' ? (data.categoryId || null) : data.categoryId,
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
      onSaveSuccess();
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
            Log a new income or expense to keep your finances up to date.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmitHandler)} className="px-6 pb-6 space-y-4">
          
          <div className="grid grid-cols-2 gap-4">
            {/* Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="amount" type="number" step="0.01" {...register('amount')} placeholder="0.00" className="pl-8" />
              </div>
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label htmlFor="date">Date</Label>
              <Controller
                name="date"
                control={control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? new Date(field.value).toLocaleDateString() : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
            </div>
          </div>
          
          {/* Type Toggle */}
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <div className="grid grid-cols-2 gap-2 rounded-md bg-muted p-1">
                <Button type="button" variant={field.value === 'expense' ? 'destructive' : 'ghost'} onClick={() => field.onChange('expense')} size="sm">Expense</Button>
                <Button type="button" variant={field.value === 'income' ? 'default' : 'ghost'} onClick={() => field.onChange('income')} size="sm">Income</Button>
              </div>
            )}
          />

          {/* Account */}
          <div className="space-y-1.5">
            <Label htmlFor="accountId" className="flex items-center gap-1.5"><Landmark className="w-4 h-4 text-muted-foreground"/> Account</Label>
            <Controller name="accountId" control={control} render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger id="accountId"><SelectValue placeholder="Select account..." /></SelectTrigger>
                <SelectContent>
                  {accounts.map(acc => <SelectItem key={acc.accountId} value={acc.accountId}>{acc.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )} />
            {errors.accountId && <p className="text-xs text-destructive">{errors.accountId.message}</p>}
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label htmlFor="categoryId" className="flex items-center gap-1.5"><Tag className="w-4 h-4 text-muted-foreground"/> Category</Label>
            <Controller name="categoryId" control={control} render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value || ''} disabled={watchedType === 'expense' && expenseCategories.length === 0}>
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
          
          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="flex items-center gap-1.5"><FileText className="w-4 h-4 text-muted-foreground"/> Notes (Optional)</Label>
            <Textarea id="notes" {...register('notes')} placeholder="Add a note..." />
            {errors.notes && <p className="text-xs text-destructive">{errors.notes.message}</p>}
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting || !isDirty || !isValid}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {transactionToEdit ? 'Save Changes' : 'Add Transaction'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
