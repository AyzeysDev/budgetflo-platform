"use client";

import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
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
  DialogClose
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { WebAppAccount } from '@/types/account';
import { WebAppTransferPayload } from '@/types/transaction';
import { Loader2, ArrowRightLeft, DollarSign, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const transferFormSchema = z.object({
  fromAccountId: z.string({ required_error: "Source account is required." }),
  toAccountId: z.string({ required_error: "Destination account is required." }),
  amount: z.coerce.number().gt(0, "Amount must be greater than zero."),
  date: z.date({ required_error: "A date is required." }),
  description: z.string().min(1, "Description is required.").max(150, "Description must be 150 characters or less."),
}).refine(data => data.fromAccountId !== data.toAccountId, {
  message: "Source and destination accounts cannot be the same.",
  path: ["toAccountId"],
});

type TransferFormData = z.infer<typeof transferFormSchema>;

interface TransferFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: WebAppAccount[];
  onSaveSuccess: () => void;
}

export default function TransferForm({
  isOpen,
  onOpenChange,
  accounts,
  onSaveSuccess,
}: TransferFormProps) {
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isValid, isDirty },
  } = useForm<TransferFormData>({
    resolver: zodResolver(transferFormSchema),
    mode: 'onChange',
  });
  
  useEffect(() => {
    if (isOpen) {
        reset({
            fromAccountId: undefined,
            toAccountId: undefined,
            amount: 0,
            date: new Date(),
            description: '',
        });
    }
  }, [isOpen, reset]);

  const onSubmit = async (data: TransferFormData) => {
    const payload: WebAppTransferPayload = {
      ...data,
      date: format(data.date, 'yyyy-MM-dd'),
    };

    const toastId = `transfer-form-toast`;
    toast.loading("Processing transfer...", { id: toastId });

    try {
      const response = await fetch('/api/transactions/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok) throw new Error(result.error || result.errors?.[0]?.msg || "Failed to process transfer.");
      
      toast.success("Transfer completed successfully!", { id: toastId });
      onSaveSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error((error as Error).message, { id: toastId });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="pr-6">
            <DialogTitle className="flex items-center gap-2 text-lg">
                <ArrowRightLeft className="w-5 h-5 text-primary" />
                Transfer Between Accounts
            </DialogTitle>
            <DialogDescription>
              Move funds from one of your accounts to another.
            </DialogDescription>
        </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 pt-4">

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label htmlFor="fromAccountId">From</Label>
                    <Controller
                        name="fromAccountId"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                            <SelectTrigger id="fromAccountId"><SelectValue placeholder="Select account" /></SelectTrigger>
                            <SelectContent>{accounts.map(acc => <SelectItem key={acc.accountId} value={acc.accountId}>{acc.name}</SelectItem>)}</SelectContent>
                            </Select>
                        )}
                    />
                    {errors.fromAccountId && <p className="text-xs text-destructive mt-1">{errors.fromAccountId.message}</p>}
                </div>
                <div className="space-y-1.5">
                    <Label htmlFor="toAccountId">To</Label>
                    <Controller
                        name="toAccountId"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                            <SelectTrigger id="toAccountId"><SelectValue placeholder="Select account" /></SelectTrigger>
                            <SelectContent>{accounts.map(acc => <SelectItem key={acc.accountId} value={acc.accountId}>{acc.name}</SelectItem>)}</SelectContent>
                            </Select>
                        )}
                    />
                    {errors.toAccountId && <p className="text-xs text-destructive mt-1">{errors.toAccountId.message}</p>}
                </div>
            </div>

            <div className="space-y-1.5">
                <Label htmlFor="amount">Amount</Label>
                <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="amount" type="number" step="0.01" {...register('amount')} placeholder="0.00" className="pl-8" disabled={isSubmitting} />
                </div>
                {errors.amount && <p className="text-xs text-destructive mt-1">{errors.amount.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="date">Date of Transfer</Label>
                <Controller
                    name="date"
                    control={control}
                    render={({ field }) => (
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                )}
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
              {errors.date && <p className="text-xs text-destructive mt-1">{errors.date.message}</p>}
            </div>

            <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" {...register('description')} placeholder="e.g., Monthly savings transfer" disabled={isSubmitting} />
                {errors.description && <p className="text-xs text-destructive mt-1">{errors.description.message}</p>}
            </div>

            <DialogFooter className="pt-4">
                <DialogClose asChild>
                    <Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={isSubmitting || !isValid || !isDirty}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Transfer
                </Button>
            </DialogFooter>
          </form>
      </DialogContent>
    </Dialog>
  );
} 