// apps/web/src/app/(app)/budgets/BudgetForm.tsx
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
} from "@/components/ui/select";
import type { WebAppBudget, WebAppCategory, WebAppCreateBudgetPayload, WebAppUpdateBudgetPayload } from '@/types/budget';
import { Loader2, DollarSign, CalendarDays, Tag, Info, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

// Schema for the budget form (category-specific)
const budgetFormSchema = z.object({
  name: z.string().min(1, "Budget name is required").max(150, "Name too long"),
  categoryId: z.string().min(1, "Category is required"),
  amount: z.preprocess(
    (val) => (typeof val === 'string' ? parseFloat(val.replace(/[^0-9.]/g, '')) : val),
    z.number().min(0.01, "Amount must be greater than 0")
  ),
  // For MVP, period is fixed to monthly based on currentPeriod prop
  // startDate and endDate will be derived from currentPeriod
  notes: z.string().max(500, "Notes too long").optional().nullable(),
});

type BudgetFormData = z.infer<typeof budgetFormSchema>;

interface BudgetFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  budgetToEdit: WebAppBudget | null; // If null, it's a new budget
  onSaveSuccess: (budget: WebAppBudget) => void;
  budgetableCategories: WebAppCategory[]; // Expense categories marked for budgeting
  currentPeriod: { year: number; month: number }; // 1-12 for month
}

export default function BudgetForm({
  isOpen,
  onOpenChange,
  budgetToEdit,
  onSaveSuccess,
  budgetableCategories,
  currentPeriod,
}: BudgetFormProps) {
  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting, isDirty, isValid },
  } = useForm<BudgetFormData>({
    resolver: zodResolver(budgetFormSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      categoryId: '',
      amount: 0,
      notes: '',
    },
  });

  const watchedCategoryId = watch('categoryId');

  const selectedCategoryForName = useMemo(() => {
    return budgetableCategories.find(cat => cat.id === watchedCategoryId);
  }, [watchedCategoryId, budgetableCategories]);

  useEffect(() => {
    if (isOpen) {
      if (budgetToEdit) {
        // Editing existing budget
        const categoryName = budgetableCategories.find(c => c.id === budgetToEdit.categoryId)?.name || budgetToEdit.name;
        reset({
          name: budgetToEdit.name || categoryName || `Budget for ${selectedPeriodDisplay}`,
          categoryId: budgetToEdit.categoryId || '',
          amount: budgetToEdit.amount,
          notes: budgetToEdit.notes || '',
        });
      } else if (selectedCategoryForName) {
        // New budget, but category selected (might happen if form re-opens with a category pre-selected)
         reset({
          name: `${selectedCategoryForName.name} Budget - ${selectedPeriodDisplay}`,
          categoryId: selectedCategoryForName.id,
          amount: 0,
          notes: '',
        });
      } else {
        // New budget, no category pre-selected
        reset({
          name: `New Budget - ${selectedPeriodDisplay}`,
          categoryId: '',
          amount: 0,
          notes: '',
        });
      }
    }
  }, [budgetToEdit, isOpen, reset, budgetableCategories, selectedCategoryForName, currentPeriod]);

  // Auto-update budget name when category changes for a new budget
  useEffect(() => {
    if (isOpen && !budgetToEdit && selectedCategoryForName) {
      setValue('name', `${selectedCategoryForName.name} Budget - ${selectedPeriodDisplay}`, { shouldDirty: true, shouldValidate: true });
    } else if (isOpen && !budgetToEdit && !selectedCategoryForName && !watch('name').includes(selectedPeriodDisplay)) {
      // If category is deselected for a new budget, reset name or set a generic one
      setValue('name', `New Budget - ${selectedPeriodDisplay}`, { shouldDirty: true, shouldValidate: true });
    }
  }, [watchedCategoryId, selectedCategoryForName, budgetToEdit, isOpen, setValue, currentPeriod]);


  const selectedPeriodDisplay = useMemo(() => {
    const date = new Date(currentPeriod.year, currentPeriod.month - 1, 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  }, [currentPeriod]);


  const onSubmitHandler: SubmitHandler<BudgetFormData> = async (data) => {
    const startDate = new Date(currentPeriod.year, currentPeriod.month - 1, 1).toISOString();
    const endDate = new Date(currentPeriod.year, currentPeriod.month, 0, 23, 59, 59, 999).toISOString(); // Last day of month

    const apiPayload: WebAppCreateBudgetPayload | WebAppUpdateBudgetPayload = {
      ...data,
      period: 'monthly', // Fixed for this form version
      startDate,
      endDate,
      isRecurring: false, // Default for now, can be a form field later
      isOverall: false, // This form is for category-specific budgets
    };

    const urlBase = `/api/budgets`;
    const url = budgetToEdit ? `${urlBase}/${budgetToEdit.id}` : urlBase;
    const method = budgetToEdit ? 'PUT' : 'POST';

    const toastId = `budget-form-${budgetToEdit?.id || 'new'}`;
    toast.loading(budgetToEdit ? "Updating budget..." : "Creating budget...", { id: toastId });

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.errors?.[0]?.msg || "Failed to save budget");
      }
      toast.success(`Budget "${result.data.name}" ${budgetToEdit ? 'updated' : 'created'}!`, { id: toastId });
      onSaveSuccess(result.data as WebAppBudget);
      onOpenChange(false);
    } catch (error) {
      toast.error((error as Error).message, { id: toastId });
      console.error("Budget form error:", error);
    }
  };
  
  const handleDialogClose = () => {
    if (!isSubmitting) {
        onOpenChange(false); // This will trigger the reset in useEffect
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-lg p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-xl font-semibold">
            {budgetToEdit ? 'Edit Category Budget' : 'Create New Category Budget'}
          </DialogTitle>
          <DialogDescription>
            Set a specific budget for a category for {selectedPeriodDisplay}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmitHandler)} className="p-6 space-y-5">
          <div>
            <Label htmlFor="categoryId" className="flex items-center gap-1.5 mb-1.5">
              <Tag className="w-4 h-4 text-muted-foreground" /> Category
            </Label>
            <Controller
              name="categoryId"
              control={control}
              render={({ field }) => (
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    // Auto-update name if it's a new budget
                    if (!budgetToEdit) {
                      const cat = budgetableCategories.find(c => c.id === value);
                      if (cat) {
                        setValue('name', `${cat.name} Budget - ${selectedPeriodDisplay}`, { shouldDirty: true, shouldValidate: true });
                      }
                    }
                  }}
                  value={field.value}
                  disabled={isSubmitting || !!budgetToEdit} // Disable if editing, category shouldn't change
                >
                  <SelectTrigger id="categoryId" className="h-10">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {budgetableCategories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <div className="flex items-center gap-2">
                          <IconRenderer name={cat.icon as AvailableIconName} size={16} color={cat.color || undefined} />
                          {cat.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.categoryId && <p className="text-xs text-destructive mt-1">{errors.categoryId.message}</p>}
            {budgetToEdit && <p className="text-xs text-muted-foreground mt-1">Category cannot be changed when editing a budget.</p>}
          </div>

          <div>
            <Label htmlFor="name" className="flex items-center gap-1.5 mb-1.5">
              <Info className="w-4 h-4 text-muted-foreground" /> Budget Name
            </Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="e.g., Groceries - June 2025"
              className="h-10"
              disabled={isSubmitting}
            />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <Label htmlFor="amount" className="flex items-center gap-1.5 mb-1.5">
              <DollarSign className="w-4 h-4 text-muted-foreground" /> Budgeted Amount
            </Label>
             <Controller
                name="amount"
                control={control}
                render={({ field }) => (
                    <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            value={field.value || ''}
                            placeholder="0.00"
                            className="pl-9 h-10"
                            disabled={isSubmitting}
                        />
                    </div>
                )}
            />
            {errors.amount && <p className="text-xs text-destructive mt-1">{errors.amount.message}</p>}
          </div>
          
          <div>
            <Label htmlFor="periodDisplay" className="flex items-center gap-1.5 mb-1.5">
                <CalendarDays className="w-4 h-4 text-muted-foreground" /> Period
            </Label>
            <Input
                id="periodDisplay"
                value={selectedPeriodDisplay}
                readOnly
                disabled
                className="h-10 bg-muted/50 cursor-not-allowed border-dashed"
            />
          </div>

          <div>
            <Label htmlFor="notes" className="flex items-center gap-1.5 mb-1.5">
              <Info className="w-4 h-4 text-muted-foreground" /> Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Any specific details for this budget..."
              rows={3}
              disabled={isSubmitting}
            />
            {errors.notes && <p className="text-xs text-destructive mt-1">{errors.notes.message}</p>}
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={handleDialogClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !isDirty || !isValid}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              {budgetToEdit ? 'Save Changes' : 'Create Budget'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
