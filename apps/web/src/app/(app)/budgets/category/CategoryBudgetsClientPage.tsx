// apps/web/src/app/(app)/budgets/category/CategoryBudgetsClientPage.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  ListChecks,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  DollarSign,
  Save,
  Trash2,
  Settings2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import type { WebAppBudget, WebAppCategory, WebAppCreateBudgetPayload, WebAppUpdateBudgetPayload } from '@/types/budget';
import { MonthYearPicker } from '../MonthYearPicker';
import { IconRenderer, AvailableIconName, getContrastingTextColor } from '../../categories/categoryUtils';
import { cn } from '@/lib/utils';
import { z } from 'zod';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CategoryBudgetsClientPageProps {
  initialCategoryBudgets: WebAppBudget[];
  budgetableCategories: WebAppCategory[];
  currentYear: number;
  currentMonth: number;
}

const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return '$0.00';
  const value = Number(amount);
  if (isNaN(value)) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

// Zod schema for validating the amount input in each row
const categoryBudgetAmountSchema = z.object({
  amount: z.coerce
    .number({ invalid_type_error: "Amount must be a valid number." })
    .min(0.01, "Amount must be positive.")
});

interface CategoryBudgetRowProps {
  category: WebAppCategory;
  budget: WebAppBudget | undefined;
  onSave: (categoryId: string, amount: number) => Promise<void>;
  onDelete: (budget: WebAppBudget) => void;
  isSaving: boolean;
}

// Sub-component for managing a single category's budget inline
function CategoryBudgetRow({ category, budget, onSave, onDelete, isSaving }: CategoryBudgetRowProps) {
  const [amountInput, setAmountInput] = useState<string>(budget?.amount?.toString() || '');
  const [inputError, setInputError] = useState<string | null>(null);

  // Update input when the budget prop changes (e.g., after saving or period change)
  useEffect(() => {
    setAmountInput(budget?.amount?.toString() || '');
    setInputError(null); 
  }, [budget]);

  const handleSave = async () => {
    const parseResult = categoryBudgetAmountSchema.safeParse({ amount: amountInput });
    if (!parseResult.success) {
      setInputError(parseResult.error.errors[0]?.message || "Invalid amount.");
      return;
    }
    setInputError(null);
    await onSave(category.id, parseResult.data.amount);
  };

  const spent = budget?.spentAmount || 0;
  const budgetedAmount = budget?.amount || 0;
  const progress = budgetedAmount > 0 ? Math.min((spent / budgetedAmount) * 100, 100) : 0;
  const isBudgetSet = !!budget;
  const isDirty = amountInput !== (budget?.amount?.toString() || '');

  return (
    <div className="p-3 border rounded-lg bg-card hover:shadow-md transition-shadow flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
      <div
        className="w-9 h-9 rounded-md flex items-center justify-center shrink-0 self-start sm:self-center"
        style={{ backgroundColor: category.color || '#6B7280' }}
      >
        <IconRenderer name={category.icon as AvailableIconName} size={18} color={getContrastingTextColor(category.color)} />
      </div>
      <div className="flex-grow w-full">
        <div className="flex justify-between items-baseline mb-1">
          <span className="text-sm font-medium text-foreground">{category.name}</span>
          <span className="text-xs text-muted-foreground">{isBudgetSet ? `Set: ${formatCurrency(budgetedAmount)}` : "Not Set"}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-grow">
            <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              inputMode="decimal"
              value={amountInput}
              onChange={(e) => {
                setAmountInput(e.target.value);
                if (inputError) setInputError(null);
              }}
              placeholder="0.00"
              className={cn("pl-8 h-9 text-sm w-full", inputError && "border-destructive focus-visible:ring-destructive/50")}
              disabled={isSaving}
            />
          </div>
          <Button size="sm" onClick={handleSave} disabled={isSaving || !isDirty} className="h-9 px-3">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span className="sr-only">Save Budget</span>
          </Button>
        </div>
        {inputError && <p className="text-xs text-destructive mt-1">{inputError}</p>}
        {isBudgetSet && (
          <>
            <Progress value={progress} className="h-1.5 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">{formatCurrency(spent)} spent</p>
          </>
        )}
      </div>
      {isBudgetSet && (
        <div className="flex items-center gap-1 self-start sm:self-center">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(budget)} disabled={isSaving}>
            <Trash2 className="w-4" />
            <span className="sr-only">Delete Budget</span>
          </Button>
        </div>
      )}
    </div>
  );
}


export default function CategoryBudgetsClientPage({
  initialCategoryBudgets,
  budgetableCategories,
  currentYear: initialYear,
  currentMonth: initialMonth,
}: CategoryBudgetsClientPageProps) {
  const [period, setPeriod] = useState({ year: initialYear, month: initialMonth });
  const [categoryBudgets, setCategoryBudgets] = useState<WebAppBudget[]>(initialCategoryBudgets);
  const [budgetToDelete, setBudgetToDelete] = useState<WebAppBudget | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingCategory, setIsSavingCategory] = useState<string | null>(null);

  const isInitialMount = useRef(true);

  const fetchBudgetDataForPeriod = useCallback(async (year: number, month: number) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/budgets?isOverall=false&period=monthly&year=${year}&month=${month}`);
      if (!res.ok) throw new Error('Failed to fetch category budgets');
      const result = await res.json();
      setCategoryBudgets((result.data as WebAppBudget[] || []));
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    fetchBudgetDataForPeriod(period.year, period.month);
  }, [period, fetchBudgetDataForPeriod]);

  const handleSaveCategoryBudget = async (categoryId: string, amount: number) => {
    setIsSavingCategory(categoryId);
    const existingBudget = categoryBudgets.find(b => b.categoryId === categoryId);
    const category = budgetableCategories.find(c => c.id === categoryId);
    if (!category) {
        toast.error("Category not found.");
        setIsSavingCategory(null);
        return;
    }

    const toastId = toast.loading(`${existingBudget ? 'Updating' : 'Creating'} budget for ${category.name}...`);
    
    const budgetName = `${category.name} Budget - ${selectedPeriodDisplay}`;
    
    const payload: WebAppCreateBudgetPayload | WebAppUpdateBudgetPayload = existingBudget
        ? { amount } 
        : {
            name: budgetName,
            categoryId,
            amount,
            period: 'monthly',
            startDate: new Date(period.year, period.month - 1, 1).toISOString(),
            endDate: new Date(period.year, period.month, 0, 23, 59, 59, 999).toISOString(),
            isOverall: false,
        };

    const url = existingBudget ? `/api/budgets/${existingBudget.id}` : `/api/budgets`;
    const method = existingBudget ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json();
      toast.dismiss(toastId);
      if (!response.ok) throw new Error(result.error || "Failed to save budget");
      
      toast.success(`Budget for ${category.name} saved!`);
      fetchBudgetDataForPeriod(period.year, period.month);
    } catch (error) {
      toast.error((error as Error).message, { id: toastId });
    } finally {
      setIsSavingCategory(null);
    }
  };
  
  const handleDeleteConfirm = async () => {
    if (!budgetToDelete) return;
    const toastId = toast.loading(`Deleting budget...`);
    setIsSavingCategory(budgetToDelete.categoryId);
    try {
      const response = await fetch(`/api/budgets/${budgetToDelete.id}`, { method: 'DELETE' });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({error: 'Failed to delete budget.'}));
        throw new Error(errorData.error || 'Operation failed');
      }

      toast.success(`Budget "${budgetToDelete.name}" deleted successfully.`, { id: toastId });
      fetchBudgetDataForPeriod(period.year, period.month);
    } catch (error) {
      toast.error((error as Error).message, { id: toastId });
    } finally {
      setBudgetToDelete(null);
      setIsSavingCategory(null);
    }
  };

  const changeMonth = (direction: 'next' | 'prev') => {
    setPeriod(current => {
        let newMonth = direction === 'next' ? current.month + 1 : current.month - 1;
        let newYear = current.year;
        if (newMonth > 12) { newMonth = 1; newYear++; }
        if (newMonth < 1) { newMonth = 12; newYear--; }
        return { year: newYear, month: newMonth };
    });
  };

  const selectedPeriodDisplay = useMemo(() => {
    const date = new Date(period.year, period.month - 1, 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  }, [period]);

  const totalCategoryBudgeted = useMemo(() => {
    return categoryBudgets.reduce((sum, b) => sum + b.amount, 0);
  }, [categoryBudgets]);

  const totalSpent = useMemo(() => {
    return categoryBudgets.reduce((sum, b) => sum + b.spentAmount, 0);
  }, [categoryBudgets]);

  return (
    <>
      <div className="flex flex-col gap-6 md:gap-8 h-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <Button variant="ghost" className="mb-2 -ml-4" asChild>
              <Link href="/budgets">
                <ArrowLeft className="mr-2 h-4 w-4"/> Back to Budget Center
              </Link>
            </Button>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight flex items-center">
              <ListChecks className="mr-3 h-8 w-8 text-primary" /> Category Budgets
            </h1>
            <p className="text-md text-muted-foreground mt-1">
              Manage your spending limits for <span className="font-semibold text-primary">{selectedPeriodDisplay}</span>.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => changeMonth('prev')} disabled={isLoading}><ChevronLeft className="h-4 w-4" /></Button>
            <MonthYearPicker currentPeriod={period} onPeriodChange={setPeriod} disabled={isLoading} />
            <Button variant="outline" size="icon" onClick={() => changeMonth('next')} disabled={isLoading}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
        
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 flex-1 min-h-0">
            <div className="lg:col-span-2 flex flex-col min-h-0">
                <ScrollArea className="flex-1 -mr-4 pr-4">
                  <div className="space-y-4 pb-6">
                      {budgetableCategories.length > 0 ? (
                        budgetableCategories.map(category => (
                            <CategoryBudgetRow
                                key={category.id}
                                category={category}
                                budget={categoryBudgets.find(b => b.categoryId === category.id)}
                                onSave={handleSaveCategoryBudget}
                                onDelete={setBudgetToDelete}
                                isSaving={isSavingCategory === category.id}
                            />
                        ))
                      ) : (
                        <Card className="flex flex-col items-center justify-center p-8 text-center border-dashed h-full">
                            <Settings2 className="h-12 w-12 text-muted-foreground mb-4" />
                            <CardTitle className="text-lg font-medium">No Budgetable Categories</CardTitle>
                            <CardDescription className="mt-1">
                                Go to the <Link href="/categories" className="underline text-primary">Categories</Link> page and ensure your expense categories are marked as &quot;Include in Budget&quot;.
                            </CardDescription>
                        </Card>
                      )}
                  </div>
                </ScrollArea>
            </div>

            <div className="lg:col-span-1">
                <Card className="top-20">
                    <CardHeader>
                        <CardTitle>Summary</CardTitle>
                        <CardDescription>Total for all category budgets this month.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Total Budgeted</p>
                            <p className="text-2xl font-bold text-primary">{formatCurrency(totalCategoryBudgeted)}</p>
                        </div>
                         <div>
                            <p className="text-sm font-medium text-muted-foreground">Total Spent</p>
                            <p className="text-2xl font-semibold text-foreground">{formatCurrency(totalSpent)}</p>
                        </div>
                        <div>
                           <Progress value={totalCategoryBudgeted > 0 ? (totalSpent / totalCategoryBudgeted) * 100 : 0} className="h-2"/>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
      </div>

      {budgetToDelete && (
        <Dialog open={!!budgetToDelete} onOpenChange={() => setBudgetToDelete(null)}>
          <DialogContent>
            <DialogHeader>
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-destructive"/>
              </div>
              <DialogTitle>Delete Budget</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete the budget for &quot;{budgetToDelete.name}&quot;? This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBudgetToDelete(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteConfirm}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
