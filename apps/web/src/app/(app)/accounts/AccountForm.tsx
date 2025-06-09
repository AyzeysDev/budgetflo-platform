// apps/web/src/app/(app)/accounts/AccountForm.tsx
"use client";

import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel
} from "@/components/ui/select";
import { 
    WebAppAccount, 
    WebAppAccountType, 
    WebAppCreateAccountPayload, 
    WebAppUpdateAccountPayload,
    ASSET_TYPES,
    LIABILITY_TYPES
} from '@/types/account';
import { Loader2, DollarSign, Building, Hash, Wallet } from 'lucide-react';

const allAccountTypes: [WebAppAccountType, ...WebAppAccountType[]] = [...ASSET_TYPES, ...LIABILITY_TYPES];

const accountTypeLabels: Record<WebAppAccountType, string> = {
    // Assets
    checking: 'Checking Account',
    savings: 'Savings Account',
    cash: 'Cash',
    investment: 'Investment Account',
    property: 'Property',
    other_asset: 'Other Asset',
    // Liabilities
    credit_card: 'Credit Card',
    home_loan: 'Home Loan / Mortgage',
    personal_loan: 'Personal Loan',
    car_loan: 'Car Loan',
    student_loan: 'Student Loan',
    line_of_credit: 'Line of Credit',
    other_liability: 'Other Liability',
};

const accountFormSchema = z.object({
  name: z.string().min(1, "Account name is required.").max(100, "Name must be 100 characters or less."),
  type: z.enum(allAccountTypes, { required_error: "Account type is required." }),
  balance: z.coerce.number({ invalid_type_error: "Balance must be a valid number." }),
  institution: z.string().max(100).optional().nullable(),
  accountNumber: z.string().max(50).optional().nullable(),
});

type AccountFormData = z.infer<typeof accountFormSchema>;

interface AccountFormProps {
  triggerButton: React.ReactElement;
  accountToEdit?: WebAppAccount | null;
  onSaveSuccess: (account: WebAppAccount) => void;
}

export default function AccountForm({
  triggerButton,
  accountToEdit,
  onSaveSuccess,
}: AccountFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty, isValid },
  } = useForm<AccountFormData>({
    resolver: zodResolver(accountFormSchema),
    mode: 'onChange',
  });
  
  const handleOpenChange = (open: boolean) => {
    if (open) {
        if (accountToEdit) {
            reset({
              name: accountToEdit.name,
              type: accountToEdit.type,
              balance: accountToEdit.balance,
              institution: accountToEdit.institution,
              accountNumber: accountToEdit.accountNumber,
            });
        } else {
            reset({
              name: '',
              type: 'checking',
              balance: 0,
              institution: '',
              accountNumber: '',
            });
        }
    }
    setIsOpen(open);
  }

  const onSubmit = async (data: AccountFormData) => {
    const payload: WebAppCreateAccountPayload | WebAppUpdateAccountPayload = {
      ...data,
      balance: Number(data.balance),
    };

    const url = accountToEdit
      ? `/api/accounts/${accountToEdit.accountId}`
      : '/api/accounts';
    const method = accountToEdit ? 'PUT' : 'POST';
    const toastId = `account-form-toast-${accountToEdit?.accountId || 'new'}`;

    toast.loading(accountToEdit ? "Updating account..." : "Creating account...", { id: toastId });

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      toast.dismiss(toastId);
      if (!response.ok) throw new Error(result.error || "Failed to save account.");

      toast.success(`Account "${result.data.name}" saved successfully!`);
      onSaveSuccess(result.data);
      setIsOpen(false);
    } catch (error) {
      toast.error((error as Error).message, { id: toastId });
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        {triggerButton}
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="grid gap-6">
          <div className="space-y-1">
            <h4 className="font-medium leading-none flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary" />
                {accountToEdit ? 'Edit Account' : 'Add New Account'}
            </h4>
            <p className="text-sm text-muted-foreground">
              Enter the details for your financial account.
            </p>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
                <Label htmlFor="name">Account Name</Label>
                <Input id="name" {...register('name')} placeholder="e.g., Everyday Savings" disabled={isSubmitting} />
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
            </div>

            <div>
                <Label htmlFor="type">Account Type</Label>
                <Controller
                name="type"
                control={control}
                render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                    <SelectTrigger id="type">
                        <SelectValue placeholder="Select an account type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                        <SelectLabel>Assets</SelectLabel>
                        {ASSET_TYPES.map(type => (
                            <SelectItem key={type} value={type}>{accountTypeLabels[type]}</SelectItem>
                        ))}
                        </SelectGroup>
                        <SelectGroup>
                        <SelectLabel>Liabilities</SelectLabel>
                        {LIABILITY_TYPES.map(type => (
                            <SelectItem key={type} value={type}>{accountTypeLabels[type]}</SelectItem>
                        ))}
                        </SelectGroup>
                    </SelectContent>
                    </Select>
                )}
                />
                {errors.type && <p className="text-xs text-destructive mt-1">{errors.type.message}</p>}
            </div>
            
            <div>
                <Label htmlFor="balance">Current Balance</Label>
                <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="balance" type="number" step="0.01" {...register('balance')} placeholder="0.00" className="pl-8" disabled={isSubmitting} />
                </div>
                {errors.balance && <p className="text-xs text-destructive mt-1">{errors.balance.message}</p>}
            </div>

            <div>
                <Label htmlFor="institution" className="flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-muted-foreground"/> Institution (Optional)
                </Label>
                <Input id="institution" {...register('institution')} placeholder="e.g., Bank of America" disabled={isSubmitting} />
            </div>

            <div>
                <Label htmlFor="accountNumber" className="flex items-center gap-1.5">
                    <Hash className="w-4 h-4 text-muted-foreground"/> Account Number (Optional)
                </Label>
                <Input id="accountNumber" {...register('accountNumber')} placeholder="e.g., Last 4 digits" disabled={isSubmitting} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isSubmitting}>
                Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || !isDirty || !isValid}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {accountToEdit ? 'Save Changes' : 'Create'}
                </Button>
            </div>
          </form>
        </div>
      </PopoverContent>
    </Popover>
  );
}
