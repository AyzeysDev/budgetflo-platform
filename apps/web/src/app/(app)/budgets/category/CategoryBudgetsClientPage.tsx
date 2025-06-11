// apps/web/src/app/(app)/budgets/category/CategoryBudgetsClientPage.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  PlusCircle,
  ListChecks,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { WebAppBudget, WebAppCategory } from '@/types/budget';
import BudgetForm from '../BudgetForm';
import { DataTable } from './data-table';
import { columns, CategoryBudgetWithDetails } from './columns';
import { MonthYearPicker } from '../MonthYearPicker';

interface CategoryBudgetsClientPageProps {
  initialCategoryBudgets: WebAppBudget[];
  budgetableCategories: WebAppCategory[];
  currentYear: number;
  currentMonth: number;
}

export default function CategoryBudgetsClientPage({
  initialCategoryBudgets,
  budgetableCategories,
  currentYear: initialYear,
  currentMonth: initialMonth,
}: CategoryBudgetsClientPageProps) {
  const [period, setPeriod] = useState({ year: initialYear, month: initialMonth });
  const [categoryBudgets, setCategoryBudgets] = useState<WebAppBudget[]>(initialCategoryBudgets);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<WebAppBudget | null>(null);
  const [budgetToDelete, setBudgetToDelete] = useState<WebAppBudget | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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

  const handleAddBudget = () => {
    setEditingBudget(null);
    setIsFormOpen(true);
  };

  const handleEditBudget = (budget: CategoryBudgetWithDetails) => {
    setEditingBudget(budget);
    setIsFormOpen(true);
  };

  const handleDeleteRequest = (budget: CategoryBudgetWithDetails) => {
    setBudgetToDelete(budget);
  };

  const onFormSaveSuccess = () => {
    fetchBudgetDataForPeriod(period.year, period.month);
    setIsFormOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (!budgetToDelete) return;
    const toastId = toast.loading(`Deleting budget...`);
    try {
      const response = await fetch(`/api/budgets/${budgetToDelete.id}`, { method: 'DELETE' });
      if (!response.ok && response.status !== 204) {
        const errorData = await response.json().catch(() => ({ error: "Failed to delete budget" }));
        throw new Error(errorData.error || "Operation failed");
      }
      toast.success(`Budget "${budgetToDelete.name}" deleted.`, { id: toastId });
      fetchBudgetDataForPeriod(period.year, period.month);
    } catch (error) {
      toast.error((error as Error).message, { id: toastId });
    } finally {
      setBudgetToDelete(null);
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

  const budgetsWithDetails = useMemo((): CategoryBudgetWithDetails[] => {
    const categoriesMap = new Map(budgetableCategories.map(c => [c.id, c]));
    return categoryBudgets.map(b => ({
      ...b,
      category: b.categoryId ? categoriesMap.get(b.categoryId) || null : null,
    }));
  }, [categoryBudgets, budgetableCategories]);

  const tableColumns = useMemo(() => columns(handleEditBudget, handleDeleteRequest), []);

  return (
    <>
      <div className="flex flex-col gap-6 md:gap-8">
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

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Budget Details</CardTitle>
                <CardDescription>All allocated category budgets for the selected month.</CardDescription>
              </div>
              <Button onClick={handleAddBudget}>
                <PlusCircle className="mr-2 h-4 w-4"/> Add Budget
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
            ) : (
              <DataTable columns={tableColumns} data={budgetsWithDetails} />
            )}
          </CardContent>
        </Card>
      </div>

      <BudgetForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        budgetToEdit={editingBudget}
        budgetableCategories={budgetableCategories}
        currentPeriod={period}
        onSaveSuccess={onFormSaveSuccess}
      />

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
