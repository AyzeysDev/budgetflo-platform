"use client";

import React, { useEffect, useMemo } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { 
  WebAppRecurringBudget, 
  WebAppCategory, 
  WebAppCreateRecurringBudgetPayload, 
  WebAppUpdateRecurringBudgetPayload,
  RecurrenceFrequency,
  RecurrenceConfig 
} from '@/types/budget';
import { Loader2, DollarSign, CalendarDays, Tag, Save, RefreshCw, Calendar as CalendarIcon } from 'lucide-react';
import { IconRenderer, AvailableIconName } from '../categories/categoryUtils';

const recurringBudgetFormSchema = z.object({
  name: z.string().min(1, "Budget name is required").max(150, "Name too long"),
  categoryId: z.string().min(1, "Category is required"),
  amount: z.coerce
    .number({invalid_type_error: "Amount must be a valid number."})
    .min(0.01, "Amount must be greater than 0."),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as const),
  interval: z.coerce
    .number({invalid_type_error: "Interval must be a valid number."})
    .min(1, "Interval must be at least 1"),
  startDate: z.date(),
  endDate: z.date().nullable().optional(),
});

type RecurringBudgetFormData = z.infer<typeof recurringBudgetFormSchema>;

interface RecurringBudgetFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  budgetToEdit: WebAppRecurringBudget | null;
  onSaveSuccess: () => void;
  budgetableCategories: WebAppCategory[];
}

// Helper function to generate RRULE string from config
function generateRRule(config: RecurrenceConfig): string {
  const parts: string[] = [`FREQ=${config.frequency}`];
  
  if (config.interval > 1) {
    parts.push(`INTERVAL=${config.interval}`);
  }
  
  if (config.byWeekDay && config.byWeekDay.length > 0) {
    const days = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
    const byDay = config.byWeekDay.map(d => days[d]).join(',');
    parts.push(`BYDAY=${byDay}`);
  }
  
  if (config.byMonthDay) {
    parts.push(`BYMONTHDAY=${config.byMonthDay}`);
  }
  
  if (config.endDate) {
    // Format as YYYYMMDD for RRULE
    const year = config.endDate.getFullYear();
    const month = String(config.endDate.getMonth() + 1).padStart(2, '0');
    const day = String(config.endDate.getDate()).padStart(2, '0');
    parts.push(`UNTIL=${year}${month}${day}`);
  }
  
  return parts.join(';');
}

// Helper function to parse RRULE string (simplified)
function parseRRule(rrule: string): Partial<RecurringBudgetFormData> {
  const parts = rrule.split(';');
  const config: Partial<RecurringBudgetFormData> = {
    frequency: 'MONTHLY',
    interval: 1,
  };
  
  for (const part of parts) {
    const [key, value] = part.split('=');
    switch (key) {
      case 'FREQ':
        config.frequency = value as RecurrenceFrequency;
        break;
      case 'INTERVAL':
        config.interval = parseInt(value);
        break;
      case 'UNTIL':
        // Parse YYYYMMDD format
        const year = parseInt(value.substring(0, 4));
        const month = parseInt(value.substring(4, 6)) - 1;
        const day = parseInt(value.substring(6, 8));
        config.endDate = new Date(year, month, day);
        break;
    }
  }
  
  return config;
}

export default function RecurringBudgetForm({
  isOpen,
  onOpenChange,
  budgetToEdit,
  onSaveSuccess,
  budgetableCategories,
}: RecurringBudgetFormProps) {
  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting, isDirty, isValid },
  } = useForm<RecurringBudgetFormData>({
    resolver: zodResolver(recurringBudgetFormSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      categoryId: '',
      amount: undefined,
      frequency: 'MONTHLY',
      interval: 1,
      startDate: new Date(),
      endDate: null,
    },
  });

  const watchedCategoryId = watch('categoryId');
  const watchedFrequency = watch('frequency');
  const watchedInterval = watch('interval');

  const selectedCategory = useMemo(() => {
    return budgetableCategories.find(cat => cat.id === watchedCategoryId);
  }, [watchedCategoryId, budgetableCategories]);

  const frequencyText = useMemo(() => {
    const freq = watchedFrequency.toLowerCase();
    const interval = watchedInterval || 1;
    if (interval === 1) {
      return freq === 'daily' ? 'day' : freq.replace('ly', '');
    }
    return `${interval} ${freq === 'daily' ? 'days' : freq.replace('ly', 's')}`;
  }, [watchedFrequency, watchedInterval]);

  useEffect(() => {
    if (isOpen) {
      if (budgetToEdit) {
        const parsedRule = parseRRule(budgetToEdit.recurrenceRule);
        reset({
          name: budgetToEdit.name,
          categoryId: budgetToEdit.categoryId ?? '',
          amount: budgetToEdit.amount,
          frequency: parsedRule.frequency || 'MONTHLY',
          interval: parsedRule.interval || 1,
          startDate: new Date(budgetToEdit.startDate),
          endDate: budgetToEdit.endDate ? new Date(budgetToEdit.endDate) : null,
        });
      } else {
        const defaultCategory = budgetableCategories.length > 0 ? budgetableCategories[0] : null;
        reset({
          name: defaultCategory ? `${defaultCategory.name} Budget` : 'New Budget',
          categoryId: defaultCategory?.id || '',
          amount: undefined,
          frequency: 'MONTHLY',
          interval: 1,
          startDate: new Date(),
          endDate: null,
        });
      }
    }
  }, [budgetToEdit, isOpen, reset, budgetableCategories]);

  useEffect(() => {
    if (isOpen && !budgetToEdit && selectedCategory) {
      setValue('name', `${selectedCategory.name} Budget`, { shouldDirty: true, shouldValidate: true });
    }
  }, [watchedCategoryId, selectedCategory, budgetToEdit, isOpen, setValue]);

  const onSubmitHandler: SubmitHandler<RecurringBudgetFormData> = async (data) => {
    const config: RecurrenceConfig = {
      frequency: data.frequency,
      interval: data.interval,
      endDate: data.endDate,
    };
    
    const rrule = generateRRule(config);
    
    const apiPayload: WebAppCreateRecurringBudgetPayload | WebAppUpdateRecurringBudgetPayload = {
      name: data.name,
      categoryId: data.categoryId,
      amount: data.amount,
      recurrenceRule: rrule,
      startDate: data.startDate.toISOString(),
      endDate: data.endDate ? data.endDate.toISOString() : null,
    };

    const urlBase = `/api/budgets`;
    const url = budgetToEdit ? `${urlBase}/${budgetToEdit.id}` : urlBase;
    const method = budgetToEdit ? 'PUT' : 'POST';

    const toastId = `recurring-budget-form-${budgetToEdit?.id || 'new'}`;
    toast.loading(budgetToEdit ? "Updating recurring budget..." : "Creating recurring budget...", { id: toastId });

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload),
      });
      const result = await response.json();

      toast.dismiss(toastId);
      if (!response.ok) {
        throw new Error(result.error || result.errors?.[0]?.msg || "Failed to save recurring budget");
      }
      toast.success(`Recurring budget "${result.data.name}" ${budgetToEdit ? 'updated' : 'created'}!`);
      onSaveSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error((error as Error).message, { id: toastId });
      console.error("Recurring budget form error:", error);
    }
  };
  
  const handleDialogClose = () => {
    if (!isSubmitting) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-lg p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-xl font-semibold">
            {budgetToEdit ? 'Edit Recurring Budget' : 'Create Recurring Budget'}
          </DialogTitle>
          <DialogDescription>
            Set up a budget that automatically repeats on a schedule.
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
                    if (!budgetToEdit) {
                      const cat = budgetableCategories.find(c => c.id === value);
                      if (cat) {
                        setValue('name', `${cat.name} Budget`, { shouldDirty: true, shouldValidate: true });
                      }
                    }
                  }}
                  value={field.value}
                  disabled={isSubmitting || !!budgetToEdit}
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
            {budgetToEdit && <p className="text-xs text-muted-foreground mt-1">Category cannot be changed when editing.</p>}
          </div>

          <div>
            <Label htmlFor="name" className="mb-1.5">Budget Name</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="e.g., Monthly Groceries"
              className="h-10"
              disabled={isSubmitting}
            />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <Label htmlFor="amount" className="flex items-center gap-1.5 mb-1.5">
              <DollarSign className="w-4 h-4 text-muted-foreground" /> Budget Amount
            </Label>
            <Controller
              name="amount"
              control={control}
              render={({ field }) => (
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="amount"
                    type="text"
                    inputMode="decimal"
                    step="0.01"
                    {...field}
                    onChange={(e) => {
                      const val = e.target.value;
                      field.onChange(val);
                    }}
                    value={field.value === undefined ? '' : String(field.value)}
                    placeholder="0.00"
                    className="pl-9 h-10"
                    disabled={isSubmitting}
                  />
                </div>
              )}
            />
            {errors.amount && <p className="text-xs text-destructive mt-1">{errors.amount.message}</p>}
          </div>

          <div className="space-y-3">
            <Label className="flex items-center gap-1.5">
              <RefreshCw className="w-4 h-4 text-muted-foreground" /> Recurrence
            </Label>
            
            <div className="flex gap-3">
              <div className="flex-1">
                <Label htmlFor="interval" className="text-xs text-muted-foreground mb-1">Repeat every</Label>
                <Input
                  id="interval"
                  type="number"
                  min="1"
                  {...register('interval')}
                  className="h-10"
                  disabled={isSubmitting}
                />
              </div>
              
              <div className="flex-1">
                <Label htmlFor="frequency" className="text-xs text-muted-foreground mb-1">Frequency</Label>
                <Controller
                  name="frequency"
                  control={control}
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger id="frequency" className="h-10">
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
            
            <p className="text-sm text-muted-foreground">
              Repeats every {frequencyText}
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor="startDate" className="flex items-center gap-1.5 mb-1.5">
                <CalendarDays className="w-4 h-4 text-muted-foreground" /> Start Date
              </Label>
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
                          "w-full justify-start text-left font-normal h-10",
                          !field.value && "text-muted-foreground"
                        )}
                        disabled={isSubmitting}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(field.value, 'PPP') : 'Select start date'}
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
              {errors.startDate && <p className="text-xs text-destructive mt-1">{errors.startDate.message}</p>}
            </div>

            <div>
              <Label htmlFor="endDate" className="flex items-center gap-1.5 mb-1.5">
                <CalendarDays className="w-4 h-4 text-muted-foreground" /> End Date (Optional)
              </Label>
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
                          "w-full justify-start text-left font-normal h-10",
                          !field.value && "text-muted-foreground"
                        )}
                        disabled={isSubmitting}
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
              <p className="text-xs text-muted-foreground mt-1">Leave empty for budgets that continue indefinitely</p>
            </div>
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