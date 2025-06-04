// apps/web/src/app/(app)/budgets/BudgetsClientPage.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  DollarSign,
  PlusCircle,
  Edit3,
  Trash2,
  ListFilter,
  AlertCircle,
  Info,
  WalletCards,
  Loader2,
  Settings2,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress"; // Using ShadCN progress
import { toast } from "sonner";
import type { WebAppBudget, WebAppCategory, WebAppSetOverallBudgetPayload } from '@/types/budget';
import BudgetForm from './BudgetForm'; // We will create this next
import { IconRenderer } from '../categories/categoryUtils'; // Assuming this path is correct
import { cn } from '@/lib/utils';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';


interface BudgetsClientPageProps {
  initialOverallBudget: WebAppBudget | null;
  initialCategoryBudgets: WebAppBudget[];
  budgetableCategories: WebAppCategory[]; // Categories marked with includeInBudget: true and type: 'expense'
  currentYear: number;
  currentMonth: number; // 1-12
}

const overallBudgetFormSchema = z.object({
  amount: z.preprocess(
    (val) => (typeof val === 'string' ? parseFloat(val.replace(/[^0-9.]/g, '')) : val),
    z.number().min(0.01, "Amount must be greater than 0.")
  ),
  notes: z.string().max(250, "Notes too long").optional().nullable(),
});
type OverallBudgetFormData = z.infer<typeof overallBudgetFormSchema>;


export default function BudgetsClientPage({
  initialOverallBudget,
  initialCategoryBudgets,
  budgetableCategories,
  currentYear,
  currentMonth,
}: BudgetsClientPageProps) {
  const [overallBudget, setOverallBudget] = useState<WebAppBudget | null>(initialOverallBudget);
  const [categoryBudgets, setCategoryBudgets] = useState<WebAppBudget[]>(initialCategoryBudgets);
  const [showCategoryBudgets, setShowCategoryBudgets] = useState(false);
  const [isSubmittingOverall, setIsSubmittingOverall] = useState(false);
  const [isBudgetFormModalOpen, setIsBudgetFormModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<WebAppBudget | null>(null); // For category budgets
  const [budgetToDelete, setBudgetToDelete] = useState<WebAppBudget | null>(null);
  const [isLoading, setIsLoading] = useState(false); // General loading for category budgets

  const {
    control: overallControl,
    register: overallRegister,
    handleSubmit: handleOverallSubmit,
    reset: resetOverallForm,
    formState: { errors: overallErrors, isDirty: isOverallDirty },
    setValue: setOverallValue,
  } = useForm<OverallBudgetFormData>({
    resolver: zodResolver(overallBudgetFormSchema),
    defaultValues: {
      amount: initialOverallBudget?.amount || 0,
      notes: initialOverallBudget?.notes || '',
    },
  });

  useEffect(() => {
    setOverallBudget(initialOverallBudget);
    setCategoryBudgets(initialCategoryBudgets.sort((a, b) => a.name.localeCompare(b.name)));
    resetOverallForm({
      amount: initialOverallBudget?.amount || 0,
      notes: initialOverallBudget?.notes || '',
    });
  }, [initialOverallBudget, initialCategoryBudgets, resetOverallForm]);

  const selectedPeriodDisplay = useMemo(() => {
    const date = new Date(currentYear, currentMonth - 1, 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  }, [currentYear, currentMonth]);

  const fetchBudgetsForPeriod = useCallback(async (year: number, month: number) => {
    setIsLoading(true);
    const toastId = toast.loading(`Fetching budgets for ${new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}...`);
    try {
      const [overallRes, categoryBudgetsRes] = await Promise.all([
        fetch(`/api/budgets/overall?period=monthly&year=${year}&month=${month}`),
        fetch(`/api/budgets?isOverall=false&period=monthly&year=${year}&month=${month}`)
      ]);

      let newOverallBudget: WebAppBudget | null = null;
      if (overallRes.ok) {
        const result = await overallRes.json();
        newOverallBudget = result.data;
      } else if (overallRes.status !== 404) {
        toast.error("Failed to fetch overall budget.");
      }
      setOverallBudget(newOverallBudget);
      resetOverallForm({ amount: newOverallBudget?.amount || 0, notes: newOverallBudget?.notes || '' });


      let newCategoryBudgets: WebAppBudget[] = [];
      if (categoryBudgetsRes.ok) {
        const result = await categoryBudgetsRes.json();
        newCategoryBudgets = result.data || [];
      } else {
        toast.error("Failed to fetch category budgets.");
      }
      setCategoryBudgets(newCategoryBudgets.sort((a, b) => a.name.localeCompare(b.name)));
      toast.success("Budgets updated.", { id: toastId });

    } catch (error) {
      toast.error("Error fetching budget data.", { id: toastId });
      console.error("Error fetching budgets:", error);
    } finally {
      setIsLoading(false);
    }
  }, [resetOverallForm]);


  const onOverallBudgetSubmit = async (data: OverallBudgetFormData) => {
    setIsSubmittingOverall(true);
    const toastId = toast.loading("Saving overall budget...");

    const payload: WebAppSetOverallBudgetPayload = {
      amount: data.amount,
      period: 'monthly', // Assuming monthly for this UI
      year: currentYear,
      month: currentMonth,
      notes: data.notes,
    };

    try {
      const response = await fetch('/api/budgets/overall', {
        method: 'POST', // Backend handles create/update
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to save overall budget");

      setOverallBudget(result.data as WebAppBudget);
      resetOverallForm({ amount: result.data.amount, notes: result.data.notes || '' });
      toast.success("Overall budget saved!", { id: toastId });
    } catch (error) {
      toast.error((error as Error).message, { id: toastId });
    } finally {
      setIsSubmittingOverall(false);
    }
  };

  const handleAddCategoryBudget = () => {
    setEditingBudget(null);
    setIsBudgetFormModalOpen(true);
  };

  const handleEditCategoryBudget = (budget: WebAppBudget) => {
    setEditingBudget(budget);
    setIsBudgetFormModalOpen(true);
  };

  const handleDeleteBudget = async () => {
    if (!budgetToDelete) return;
    const toastId = toast.loading(`Deleting budget: ${budgetToDelete.name}...`);
    try {
      const response = await fetch(`/api/budgets/${budgetToDelete.id}`, { method: 'DELETE' });
      if (!response.ok && response.status !== 204) {
        const errorData = await response.json().catch(() => ({ error: "Failed to delete budget" }));
        throw new Error(errorData.error || "Operation failed");
      }
      toast.success(`Budget "${budgetToDelete.name}" deleted.`, { id: toastId });
      setCategoryBudgets(prev => prev.filter(b => b.id !== budgetToDelete.id));
    } catch (error) {
      toast.error((error as Error).message, { id: toastId });
    } finally {
      setBudgetToDelete(null);
    }
  };

  const onBudgetFormSaveSuccess = (savedBudget: WebAppBudget) => {
    if (editingBudget) {
      setCategoryBudgets(prev => prev.map(b => b.id === savedBudget.id ? savedBudget : b).sort((a,b) => a.name.localeCompare(b.name)));
    } else {
      setCategoryBudgets(prev => [...prev, savedBudget].sort((a,b) => a.name.localeCompare(b.name)));
    }
    setIsBudgetFormModalOpen(false);
    setEditingBudget(null);
  };

  const totalCategoryBudgetedAmount = useMemo(() => {
    return categoryBudgets.reduce((sum, budget) => sum + budget.amount, 0);
  }, [categoryBudgets]);

  const budgetComparison = useMemo(() => {
    if (!overallBudget || totalCategoryBudgetedAmount === 0) return null;
    const difference = overallBudget.amount - totalCategoryBudgetedAmount;
    if (difference === 0) {
      return { message: "Category budgets perfectly match your overall budget.", type: "success" as const };
    } else if (difference > 0) {
      return { message: `You have $${difference.toFixed(2)} unallocated from your overall budget.`, type: "info" as const };
    } else {
      return { message: `Category budgets exceed your overall budget by $${Math.abs(difference).toFixed(2)}.`, type: "warning" as const };
    }
  }, [overallBudget, totalCategoryBudgetedAmount]);

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '$0.00';
    // Placeholder, use user's currency preference from profile eventually
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <>
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight flex items-center">
            <WalletCards className="mr-3 h-8 w-8 text-primary" /> Manage Budgets
          </h1>
          <p className="text-md text-muted-foreground mt-1">
            Set your financial limits for <span className="font-semibold text-primary">{selectedPeriodDisplay}</span>.
          </p>
        </div>
        {/* Period Selector (Future enhancement) */}
      </div>

      {/* Overall Budget Card */}
      <Card className="mb-6 md:mb-8 shadow-lg border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <DollarSign className="h-6 w-6 text-primary" />
            Overall Monthly Budget
          </CardTitle>
          <CardDescription>
            Set your total spending limit for {selectedPeriodDisplay}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleOverallSubmit(onOverallBudgetSubmit)} className="space-y-4">
            <div className="flex flex-col sm:flex-row items-end gap-4">
              <div className="flex-grow space-y-1.5 w-full sm:w-auto">
                <Label htmlFor="overallAmount">Total Amount</Label>
                <Controller
                  name="amount"
                  control={overallControl}
                  render={({ field }) => (
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="overallAmount"
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        value={field.value || ''}
                        placeholder="e.g., 2500.00"
                        className="pl-9 h-11 text-lg border-border focus:border-primary focus:ring-1 focus:ring-primary"
                        disabled={isSubmittingOverall}
                      />
                    </div>
                  )}
                />
                {overallErrors.amount && <p className="text-sm text-destructive">{overallErrors.amount.message}</p>}
              </div>
              <Button type="submit" size="lg" className="h-11 w-full sm:w-auto" disabled={isSubmittingOverall || !isOverallDirty}>
                {isSubmittingOverall ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                {overallBudget ? 'Update Overall' : 'Set Overall'}
              </Button>
            </div>
             <div className="space-y-1.5">
                <Label htmlFor="overallNotes">Notes (Optional)</Label>
                <Input
                    id="overallNotes"
                    {...overallRegister('notes')}
                    placeholder="e.g., Based on last month's average spending"
                    className="h-10 border-border focus:border-primary focus:ring-1 focus:ring-primary"
                    disabled={isSubmittingOverall}
                />
                {overallErrors.notes && <p className="text-sm text-destructive">{overallErrors.notes.message}</p>}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Toggle for Category Budgets */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Switch
            id="show-category-budgets"
            checked={showCategoryBudgets}
            onCheckedChange={setShowCategoryBudgets}
            aria-label="Toggle category budgets"
          />
          <Label htmlFor="show-category-budgets" className="text-md font-medium">
            Manage Category Budgets
          </Label>
        </div>
        {showCategoryBudgets && (
          <Button onClick={handleAddCategoryBudget} size="sm" variant="outline">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Category Budget
          </Button>
        )}
      </div>

      {/* Category Budgets Section (Conditional) */}
      {showCategoryBudgets && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <ListFilter className="h-6 w-6 text-primary" />
              Category Budgets for {selectedPeriodDisplay}
            </CardTitle>
            <CardDescription>
              Allocate specific amounts to your spending categories.
              These are for categories youve marked as Include in Budget.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {budgetComparison && (
              <div className={cn(
                "mb-4 p-3 rounded-md text-sm flex items-center gap-2 border",
                budgetComparison.type === 'success' && "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300",
                budgetComparison.type === 'info' && "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300",
                budgetComparison.type === 'warning' && "bg-yellow-50 border-yellow-300 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-300"
              )}>
                {budgetComparison.type === 'success' && <CheckCircle2 className="h-4 w-4" />}
                {budgetComparison.type === 'info' && <Info className="h-4 w-4" />}
                {budgetComparison.type === 'warning' && <AlertCircle className="h-4 w-4" />}
                {budgetComparison.message}
              </div>
            )}

            {isLoading && <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>}

            {!isLoading && budgetableCategories.length === 0 && (
              <div className="text-center py-10 text-muted-foreground">
                <Settings2 className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p className="mb-2 font-medium">No categories are marked for budgeting.</p>
                <p className="text-sm">Go to the Categories page and enable Include in Budget for the ones you want to manage here.</p>
              </div>
            )}

            {!isLoading && budgetableCategories.length > 0 && (
              <div className="space-y-4">
                {budgetableCategories.map(category => {
                  const budget = categoryBudgets.find(b => b.categoryId === category.id);
                  const spent = budget?.spentAmount || 0;
                  const budgetedAmount = budget?.amount || 0;
                  const progress = budgetedAmount > 0 ? Math.min((spent / budgetedAmount) * 100, 100) : 0;

                  return (
                    <div key={category.id} className="p-4 border rounded-lg bg-card hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-md flex items-center justify-center text-sm"
                            style={{ backgroundColor: category.color || '#6B7280' }}
                          >
                            <IconRenderer name={category.icon as AvailableIconName} size={16} color={getContrastingTextColor(category.color)} />
                          </div>
                          <span className="font-medium text-foreground">{category.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditCategoryBudget(budget || { categoryId: category.id, name: category.name } as WebAppBudget)}>
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          {budget && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setBudgetToDelete(budget)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      {budget ? (
                        <>
                          <div className="text-xs text-muted-foreground mb-1">
                            Budgeted: {formatCurrency(budgetedAmount)} | Spent: {formatCurrency(spent)}
                          </div>
                          <Progress value={progress} className="h-2" />
                           {budget.notes && <p className="text-xs text-muted-foreground mt-1.5 italic">Note: {budget.notes}</p>}
                        </>
                      ) : (
                        <div className="text-center py-2">
                          <p className="text-xs text-muted-foreground mb-1">No budget set for this category.</p>
                          <Button size="sm" variant="outline" onClick={() => handleEditCategoryBudget({ categoryId: category.id, name: category.name } as WebAppBudget)}>
                             <PlusCircle className="mr-1 h-3 w-3" /> Set Budget
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
           {showCategoryBudgets && budgetableCategories.length > 0 && (
             <CardFooter className="pt-6 border-t">
                 <p className="text-sm text-muted-foreground">
                    Total of Category Budgets: <span className="font-semibold text-foreground">{formatCurrency(totalCategoryBudgetedAmount)}</span>
                 </p>
             </CardFooter>
           )}
        </Card>
      )}

      {/* Budget Form Modal (for category budgets) */}
      <BudgetForm
        isOpen={isBudgetFormModalOpen}
        onOpenChange={setIsBudgetFormModalOpen}
        budgetToEdit={editingBudget}
        onSaveSuccess={onBudgetFormSaveSuccess}
        budgetableCategories={budgetableCategories.filter(cat => cat.type === 'expense')} // Pass only expense categories for now
        currentPeriod={{ year: currentYear, month: currentMonth }}
      />

      {/* Delete Confirmation Modal */}
      {budgetToDelete && (
        <Dialog open={!!budgetToDelete} onOpenChange={() => setBudgetToDelete(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
               <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-destructive/10 flex items-center justify-center">
                <AlertTriangleIcon className="h-6 w-6 text-destructive"/>
              </div>
              <DialogTitle className="text-lg font-semibold text-center">Delete Budget</DialogTitle>
              <DialogDescription className="text-center">
                Are you sure you want to delete the budget for <span className="font-medium">&quot;{budgetToDelete.name}&quot;</span>?
                This will remove the limit of {formatCurrency(budgetToDelete.amount)}.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-3">
              <Button variant="outline" onClick={() => setBudgetToDelete(null)} className="h-9 px-4 text-sm">Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteBudget} className="h-9 px-4 text-sm">Delete Budget</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
