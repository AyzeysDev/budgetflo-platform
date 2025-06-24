// apps/web/src/app/(app)/budgets/BudgetForm.tsx
"use client";

import React, { useState } from 'react';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Loader2, DollarSign, CalendarDays, Tag, Info, Save, CalendarIcon, Repeat } from 'lucide-react';
import { IconRenderer, AvailableIconName } from '../categories/categoryUtils';
import { format } from 'date-fns';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import type { WebAppBudget, WebAppCategory, WebAppCreateBudgetPayload, WebAppUpdateBudgetPayload } from '@/types/budget';

const budgetFormSchema = z.object({
  name: z.string().min(1, "Budget name is required").max(150, "Budget name must be less than 150 characters"),
  categoryId: z.string().nullable(),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  period: z.enum(['monthly', 'yearly', 'custom']),
  startDate: z.date({
    required_error: "Start date is required",
  }),
  endDate: z.date({
    required_error: "End date is required",
  }),
  notes: z.string().nullable().optional(),
  isRecurring: z.boolean(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
  interval: z.coerce.number().min(1),
  recurringEndDate: z.date().nullable().optional(),
}).refine((data) => data.endDate >= data.startDate, {
  message: "End date must be after start date",
  path: ["endDate"],
});

type BudgetFormData = z.infer<typeof budgetFormSchema>;

interface BudgetFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  budgetToEdit?: WebAppBudget | null;
  onSaveSuccess: () => void;
  budgetableCategories: WebAppCategory[];
}

// Helper function to generate RRULE string
function generateRRule(frequency: string, interval: number, endDate?: Date | null): string {
  const parts: string[] = [`FREQ=${frequency}`];
  
  if (interval > 1) {
    parts.push(`INTERVAL=${interval}`);
  }
  
  if (endDate) {
    // Format as YYYYMMDD for RRULE
    const year = endDate.getFullYear();
    const month = String(endDate.getMonth() + 1).padStart(2, '0');
    const day = String(endDate.getDate()).padStart(2, '0');
    parts.push(`UNTIL=${year}${month}${day}`);
  }
  
  return parts.join(';');
}

export default function BudgetForm({
  isOpen,
  onOpenChange,
  budgetToEdit,
  onSaveSuccess,
  budgetableCategories,
}: BudgetFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<BudgetFormData>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: {
      name: budgetToEdit?.name || '',
      categoryId: budgetToEdit?.categoryId || null,
      amount: budgetToEdit?.amount || undefined,
      period: (budgetToEdit?.period as 'monthly' | 'yearly' | 'custom') || 'monthly',
      startDate: budgetToEdit?.startDate ? new Date(budgetToEdit.startDate) : new Date(),
      endDate: budgetToEdit?.endDate ? new Date(budgetToEdit.endDate) : new Date(),
      notes: budgetToEdit?.notes || '',
      isRecurring: false,
      frequency: 'MONTHLY',
      interval: 1,
      recurringEndDate: null,
    },
  });

  const isRecurring = watch('isRecurring');
  const selectedCategoryId = watch('categoryId');

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      reset();
    }
    onOpenChange(open);
  };

  const onSubmit: SubmitHandler<BudgetFormData> = async (data) => {
    setIsSubmitting(true);
    const toastId = toast.loading(budgetToEdit ? "Updating budget..." : "Creating budget...");

    try {
      const payload: WebAppCreateBudgetPayload = {
        name: data.name,
        categoryId: data.categoryId,
        amount: data.amount,
        period: data.period,
        startDate: data.startDate.toISOString(),
        endDate: data.endDate.toISOString(),
        isOverall: false,
        notes: data.notes || null,
        isRecurring: data.isRecurring,
        recurrenceRule: data.isRecurring 
          ? generateRRule(data.frequency, data.interval, data.recurringEndDate)
          : undefined,
      };

      const url = budgetToEdit ? `/api/budgets/${budgetToEdit.id}` : '/api/budgets';
      const method = budgetToEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || `Failed to ${budgetToEdit ? 'update' : 'create'} budget`);
      }

      toast.success(
        budgetToEdit 
          ? "Budget updated successfully!" 
          : `Budget created successfully!${data.isRecurring ? ' It will repeat according to your schedule.' : ''}`,
        { id: toastId }
      );

      onSaveSuccess();
      handleOpenChange(false);
    } catch (error) {
      toast.error((error as Error).message, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{budgetToEdit ? 'Edit Budget' : 'Create New Budget'}</DialogTitle>
          <DialogDescription>
            {budgetToEdit 
              ? 'Update your budget details.' 
              : 'Set up a new budget for a category. You can make it recurring to apply automatically.'}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Budget Name */}
          <div>
            <Label htmlFor="name">Budget Name</Label>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <Input
                  id="name"
                  placeholder="e.g., Monthly Groceries"
                  {...field}
                  className={cn(errors.name && "border-destructive")}
                />
              )}
            />
            {errors.name && (
              <p className="text-xs text-destructive mt-1">{errors.name.message}</p>
            )}
          </div>

          {/* Category Selection */}
          <div>
            <Label htmlFor="category">Category</Label>
            <Controller
              name="categoryId"
              control={control}
              render={({ field }) => (
                <Select
                  onValueChange={field.onChange}
                  value={field.value || undefined}
                >
                  <SelectTrigger id="category" className={cn(errors.categoryId && "border-destructive")}>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {budgetableCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center gap-2">
                          <IconRenderer name={category.icon as AvailableIconName} size={16} color={category.color || undefined} />
                          {category.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.categoryId && (
              <p className="text-xs text-destructive mt-1">{errors.categoryId.message}</p>
            )}
          </div>

          {/* Amount */}
          <div>
            <Label htmlFor="amount">Amount</Label>
            <Controller
              name="amount"
              control={control}
              render={({ field }) => (
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    className={cn("pl-9", errors.amount && "border-destructive")}
                  />
                </div>
              )}
            />
            {errors.amount && (
              <p className="text-xs text-destructive mt-1">{errors.amount.message}</p>
            )}
          </div>

          {/* Period and Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Controller
                name="startDate"
                control={control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="startDate"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !field.value && "text-muted-foreground",
                          errors.startDate && "border-destructive"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.startDate && (
                <p className="text-xs text-destructive mt-1">{errors.startDate.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Controller
                name="endDate"
                control={control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="endDate"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !field.value && "text-muted-foreground",
                          errors.endDate && "border-destructive"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
              {errors.endDate && (
                <p className="text-xs text-destructive mt-1">{errors.endDate.message}</p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <Textarea
                  id="notes"
                  placeholder="Add any notes about this budget"
                  className="resize-none"
                  {...field}
                  value={field.value || ''}
                />
              )}
            />
          </div>

          {/* Recurring Toggle */}
          {!budgetToEdit && (
            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="recurring" className="flex items-center gap-2 cursor-pointer">
                  <Repeat className="h-4 w-4 text-muted-foreground" />
                  <span>Make this budget recurring</span>
                </Label>
                <Controller
                  name="isRecurring"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      id="recurring"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Automatically create this budget for future periods
              </p>

              {/* Recurrence Options */}
              {isRecurring && (
                <div className="mt-4 space-y-3 p-4 bg-muted/30 rounded-lg">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="interval" className="text-xs">Repeat every</Label>
                      <Controller
                        name="interval"
                        control={control}
                        render={({ field }) => (
                          <Input
                            id="interval"
                            type="number"
                            min="1"
                            {...field}
                          />
                        )}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="frequency" className="text-xs">Frequency</Label>
                      <Controller
                        name="frequency"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger id="frequency">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="DAILY">Day(s)</SelectItem>
                              <SelectItem value="WEEKLY">Week(s)</SelectItem>
                              <SelectItem value="MONTHLY">Month(s)</SelectItem>
                              <SelectItem value="YEARLY">Year(s)</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="recurringEndDate" className="text-xs">End Date (Optional)</Label>
                    <Controller
                      name="recurringEndDate"
                      control={control}
                      render={({ field }) => (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              id="recurringEndDate"
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(field.value, 'PPP') : 'No end date'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value || undefined}
                              onSelect={(date) => field.onChange(date || null)}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {budgetToEdit ? 'Update Budget' : 'Create Budget'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
