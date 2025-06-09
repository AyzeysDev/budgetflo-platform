// apps/web/src/app/(app)/budgets/BudgetsClientPage.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  DollarSign,
  Trash2,
  AlertCircle,
  Info,
  WalletCards,
  Loader2,
  Settings2,
  CheckCircle2,
  Save,
  ChevronDown,
  ChevronUp,
  BarChartBig,
  ListChecks,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import type { WebAppBudget, WebAppCategory, WebAppSetOverallBudgetPayload, WebAppCreateBudgetPayload, WebAppUpdateBudgetPayload } from '@/types/budget';
import { IconRenderer, getContrastingTextColor, AvailableIconName } from '../categories/categoryUtils';
import { cn } from '@/lib/utils';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  Legend as RechartsLegend,
  PolarAngleAxis,
  RadarChart,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  Tooltip as RechartsTooltip,
  Cell
} from 'recharts';
import BudgetForm from './BudgetForm';
import { MonthYearPicker } from './MonthYearPicker';

interface BudgetsClientPageProps {
  initialOverallBudget: WebAppBudget | null;
  initialCategoryBudgets: WebAppBudget[];
  budgetableCategories: WebAppCategory[];
  currentYear: number;
  currentMonth: number; // 1-12
}

const overallBudgetFormSchema = z.object({
  amount: z.coerce
    .number({
        required_error: "Budget amount is required.",
        invalid_type_error: "Budget amount must be a valid number."
    })
    .min(0.01, "Amount must be greater than 0."),
});
type OverallBudgetFormData = z.infer<typeof overallBudgetFormSchema>;

const categoryBudgetAmountSchema = z.object({
  amount: z.coerce
    .number({
        required_error: "Amount is required.",
        invalid_type_error: "Amount must be a valid number."
    })
    .min(0.01, "Amount must be positive.")
});

const formatCurrency = (amount: number | null | undefined, withPlusSign = false): string => {
  if (amount === null || amount === undefined) return '$0.00';
  const value = Number(amount);
  if (isNaN(value)) return '$0.00';
  const formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  return withPlusSign && value > 0 ? `+${formatted}` : formatted;
};

interface CategoryBudgetRowProps {
  category: WebAppCategory;
  budget: WebAppBudget | undefined;
  onSave: (categoryId: string, amount: number) => Promise<void>;
  onDelete: (budget: WebAppBudget) => void;
  isSaving: boolean;
  onEdit: (budget: WebAppBudget) => void;
}

function CategoryBudgetRow({ category, budget, onSave, onDelete, isSaving, onEdit }: CategoryBudgetRowProps) {
  const [amountInput, setAmountInput] = useState<string>(budget?.amount?.toString() || '');
  const [inputError, setInputError] = useState<string | null>(null);

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
          <span className="text-xs text-muted-foreground">{budget ? `Set: ${formatCurrency(budgetedAmount)}` : "Not Set"}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-grow">
            <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              inputMode="decimal"
              step="0.01"
              value={amountInput}
              onChange={(e) => {
                setAmountInput(e.target.value);
                setInputError(null);
              }}
              placeholder="0.00"
              className={cn("pl-8 h-9 text-sm w-full", inputError && "border-destructive focus-visible:ring-destructive/50")}
              disabled={isSaving}
            />
          </div>
          <Button size="sm" onClick={handleSave} disabled={isSaving || (isBudgetSet && amountInput === (budget?.amount?.toString() || ''))} className="h-9 px-3">
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span className="sr-only">Save Budget</span>
          </Button>
        </div>
        {inputError && <p className="text-xs text-destructive mt-1">{inputError}</p>}
        {budget && (
            <>
            <Progress value={progress} className="h-1.5 mt-2" />
            <p className="text-xs text-muted-foreground mt-1">{formatCurrency(spent)} spent</p>
            </>
        )}
      </div>
      {budget && (
        <div className="flex items-center gap-1 self-start sm:self-center">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => onEdit(budget)} disabled={isSaving}>
                <Settings2 className="h-4 w-4" />
                <span className="sr-only">Edit Budget Details</span>
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onDelete(budget)} disabled={isSaving}>
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Delete Budget</span>
            </Button>
        </div>
      )}
    </div>
  );
}


export default function BudgetsClientPage({
  initialOverallBudget,
  initialCategoryBudgets,
  budgetableCategories,
  currentYear: initialYear,
  currentMonth: initialMonth,
}: BudgetsClientPageProps) {
  const [period, setPeriod] = useState({ year: initialYear, month: initialMonth });
  const [overallBudget, setOverallBudget] = useState<WebAppBudget | null>(initialOverallBudget);
  const [categoryBudgets, setCategoryBudgets] = useState<WebAppBudget[]>(initialCategoryBudgets);
  const [isSubmittingOverall, setIsSubmittingOverall] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState<WebAppBudget | null>(null);
  const [isSavingCategoryBudget, setIsSavingCategoryBudget] = useState<string | null>(null);
  const [isLoadingPageData, setIsLoadingPageData] = useState(false);
  const [isBudgetFormOpen, setIsBudgetFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<WebAppBudget | null>(null);
  
  const isInitialMount = useRef(true);

  const {
    control: overallControl,
    handleSubmit: handleOverallSubmit,
    reset: resetOverallForm,
    formState: { errors: overallErrors, isDirty: isOverallDirty },
  } = useForm<OverallBudgetFormData>({
    resolver: zodResolver(overallBudgetFormSchema),
    defaultValues: {
      amount: initialOverallBudget?.amount ?? undefined,
    },
  });

  const fetchBudgetDataForPeriod = useCallback(async (year: number, month: number) => {
    setIsLoadingPageData(true);
    try {
        const [overallRes, categoryRes] = await Promise.all([
            fetch(`/api/budgets/overall?period=monthly&year=${year}&month=${month}`),
            fetch(`/api/budgets?isOverall=false&period=monthly&year=${year}&month=${month}`)
        ]);

        const overallResult = await overallRes.json();
        const categoryResult = await categoryRes.json();
        
        if (!overallRes.ok && overallRes.status !== 404) throw new Error(overallResult.error || 'Failed to fetch overall budget');
        if (!categoryRes.ok) throw new Error(categoryResult.error || 'Failed to fetch category budgets');
        
        const newOverallBudget = (overallResult.data as WebAppBudget | null) || null;
        setOverallBudget(newOverallBudget);
        resetOverallForm({
            amount: newOverallBudget?.amount || undefined,
        });

        setCategoryBudgets((categoryResult.data as WebAppBudget[] || []).sort((a, b) => a.name.localeCompare(b.name)));
        
    } catch (error) {
        toast.error((error as Error).message);
    } finally {
        setIsLoadingPageData(false);
    }
  }, [resetOverallForm]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    fetchBudgetDataForPeriod(period.year, period.month);
  }, [period, fetchBudgetDataForPeriod]);

  useEffect(() => {
    setOverallBudget(initialOverallBudget);
    resetOverallForm({
      amount: initialOverallBudget?.amount,
    });
  }, [initialOverallBudget, resetOverallForm]);

  const changeMonth = (direction: 'next' | 'prev') => {
    setPeriod(current => {
        let newMonth = direction === 'next' ? current.month + 1 : current.month - 1;
        let newYear = current.year;
        if (newMonth > 12) {
            newMonth = 1;
            newYear++;
        }
        if (newMonth < 1) {
            newMonth = 12;
            newYear--;
        }
        return { year: newYear, month: newMonth };
    });
  };

  const selectedPeriodDisplay = useMemo(() => {
    const date = new Date(period.year, period.month - 1, 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  }, [period]);

  const onOverallBudgetSubmit: SubmitHandler<OverallBudgetFormData> = async (data) => {
    setIsSubmittingOverall(true);
    const toastId = toast.loading("Saving overall budget...");
    const payload: WebAppSetOverallBudgetPayload = {
      amount: data.amount,
      period: 'monthly',
      year: period.year,
      month: period.month,
      notes: overallBudget?.notes || null,
    };
    try {
      const response = await fetch('/api/budgets/overall', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json();
      toast.dismiss(toastId);
      if (!response.ok) throw new Error(result.error || "Failed to save overall budget");
      const updatedBudget = result.data as WebAppBudget;
      setOverallBudget(updatedBudget);
      resetOverallForm({
          amount: updatedBudget.amount,
      });
      toast.success("Overall budget saved!");
    } catch (error) {
      toast.error((error as Error).message, { id: toastId });
    } finally {
      setIsSubmittingOverall(false);
    }
  };
  
  const overallBudgetChartData = useMemo(() => {
    if (!overallBudget || !overallBudget.amount || overallBudget.amount <= 0) {
      return [{ name: 'Not Set', value: 100, fill: 'hsl(var(--muted))', amount: 0 }];
    }
    const spent = overallBudget.spentAmount || 0;
    const percentageSpent = Math.min(100, (spent / overallBudget.amount) * 100);
    const fill = spent > overallBudget.amount ? 'hsl(var(--destructive))' : 'hsl(var(--primary))';
    return [ { name: 'Spent', value: percentageSpent, amount: spent, fill }];
  }, [overallBudget]);

  const categoryRadarChartData = useMemo(() => {
    if (categoryBudgets.length === 0) return [];
    let maxBudgetedAmongAll = 1;
    categoryBudgets.forEach(b => {
        if (b.amount > maxBudgetedAmongAll) maxBudgetedAmongAll = b.amount;
    });

    return categoryBudgets.map(budget => {
      const category = budgetableCategories.find(c => c.id === budget.categoryId);
      return {
        subject: category?.name || budget.name,
        budgeted: budget.amount,
        spent: budget.spentAmount || 0,
        fullMark: maxBudgetedAmongAll,
        fill: category?.color || '#8884d8',
      };
    });
  }, [categoryBudgets, budgetableCategories]);
  
  const handleSaveCategoryBudget = async (categoryId: string, amount: number) => {
    setIsSavingCategoryBudget(categoryId);
    const existingBudget = categoryBudgets.find(b => b.categoryId === categoryId);
    const category = budgetableCategories.find(c => c.id === categoryId);
    if (!category) {
        toast.error("Category not found.");
        setIsSavingCategoryBudget(null);
        return;
    }

    const toastId = toast.loading(`${existingBudget ? 'Updating' : 'Creating'} budget for ${category.name}...`);
    
    const newBudgetName = `${category.name} Budget - ${selectedPeriodDisplay}`;
    const payload: WebAppCreateBudgetPayload | WebAppUpdateBudgetPayload = existingBudget 
        ? { amount } 
        : {
            name: newBudgetName,
            categoryId: categoryId,
            amount: amount,
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
      if (!response.ok) throw new Error(result.error || "Failed to save category budget");
      
      const savedBudget = result.data as WebAppBudget;
      setCategoryBudgets(prev => {
        const updated = existingBudget ? prev.map(b => b.id === savedBudget.id ? savedBudget : b) : [...prev, savedBudget];
        return updated.sort((a, b) => (budgetableCategories.find(c => c.id === a.categoryId)?.name || '').localeCompare(budgetableCategories.find(c => c.id === b.categoryId)?.name || ''));
      });
      toast.success(`Budget for ${category.name} saved!`);
    } catch (error) {
      toast.error((error as Error).message, { id: toastId });
    } finally {
      setIsSavingCategoryBudget(null);
    }
  };


  const handleDeleteBudgetRequest = async () => {
    if (!budgetToDelete) return;
    const toastId = toast.loading(`Deleting budget: ${budgetToDelete.name}...`);
    setIsSavingCategoryBudget(budgetToDelete.categoryId);
    try {
      const response = await fetch(`/api/budgets/${budgetToDelete.id}`, { method: 'DELETE' });
      toast.dismiss(toastId);
      if (!response.ok && response.status !== 204) {
        const errorData = await response.json().catch(() => ({ error: "Failed to delete budget" }));
        throw new Error(errorData.error || "Operation failed");
      }
      toast.success(`Budget "${budgetToDelete.name}" deleted.`);
      setCategoryBudgets(prev => prev.filter(b => b.id !== budgetToDelete!.id));
    } catch (error) {
      toast.error((error as Error).message, { id: toastId });
    } finally {
      setBudgetToDelete(null);
      setIsSavingCategoryBudget(null);
    }
  };
  
  const handleEditBudget = (budget: WebAppBudget) => {
    setEditingBudget(budget);
    setIsBudgetFormOpen(true);
  };

  const handleBudgetFormSaveSuccess = (savedBudget: WebAppBudget) => {
    setCategoryBudgets(prev => {
      const updated = editingBudget ? prev.map(b => b.id === savedBudget.id ? savedBudget : b) : [...prev, savedBudget];
      return updated.sort((a, b) => (budgetableCategories.find(c => c.id === a.categoryId)?.name || '').localeCompare(budgetableCategories.find(c => c.id === b.categoryId)?.name || ''));
    });
    setEditingBudget(null);
    setIsBudgetFormOpen(false);
  };

  const totalCategoryBudgetedAmount = useMemo(() => {
    return categoryBudgets.reduce((sum, budget) => sum + budget.amount, 0);
  }, [categoryBudgets]);

  const budgetComparisonMessage = useMemo(() => {
    if (!overallBudget) return { message: "Set an overall budget to compare.", type: "info" as const, icon: Info };
    if (categoryBudgets.length === 0) return { message: "Set category budgets for comparison.", type: "info" as const, icon: Info};

    const difference = overallBudget.amount - totalCategoryBudgetedAmount;
    if (Math.abs(difference) < 0.01) {
      return { message: "Category budgets match your overall budget.", type: "success" as const, icon: CheckCircle2 };
    } else if (difference > 0) {
      return { message: `${formatCurrency(difference)} of overall budget is unallocated.`, type: "info" as const, icon: Info };
    } else {
      return { message: `Category budgets exceed overall by ${formatCurrency(Math.abs(difference))}.`, type: "warning" as const, icon: AlertCircle };
    }
  }, [overallBudget, totalCategoryBudgetedAmount, categoryBudgets.length]);


  return (
    <>
      <div className="flex flex-col gap-6 md:gap-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight flex items-center">
              <WalletCards className="mr-3 h-8 w-8 text-primary" /> Budget Center
            </h1>
            <p className="text-md text-muted-foreground mt-1">
              Financial limits for <span className="font-semibold text-primary">{selectedPeriodDisplay}</span>.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => changeMonth('prev')} disabled={isLoadingPageData}><ChevronUp className="-rotate-90 h-4 w-4" /></Button>
            <MonthYearPicker
              currentPeriod={period}
              onPeriodChange={setPeriod}
              disabled={isLoadingPageData}
            />
            <Button variant="outline" size="icon" onClick={() => changeMonth('next')} disabled={isLoadingPageData}><ChevronDown className="-rotate-90 h-4 w-4" /></Button>
          </div>
        </div>

        {/* ROW 1: Overall Budget Card & Radial Chart */}
        <Card className="shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] lg:grid-cols-[2fr_1fr] items-stretch">
            <div className="p-6 border-b md:border-b-0 md:border-r border-border">
              <CardHeader className="p-0 mb-4">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <DollarSign className="h-6 w-6 text-primary" /> Overall Monthly Budget
                </CardTitle>
                <CardDescription>Set your total spending limit for all categories this month.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <form onSubmit={handleOverallSubmit(onOverallBudgetSubmit)} className="space-y-3">
                  <Controller
                    name="amount"
                    control={overallControl}
                    render={({ field }) => (
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
                        <Input
                          id="overallAmount"
                          type="text"
                          inputMode="decimal"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value)}
                          value={field.value === undefined ? '' : String(field.value)}
                          placeholder="Enter total budget amount"
                          className={cn("pl-10 h-12 text-xl font-semibold focus:ring-primary focus:border-primary", overallErrors.amount && "border-destructive")}
                          disabled={isSubmittingOverall || isLoadingPageData}
                        />
                      </div>
                    )}
                  />
                  {overallErrors.amount && <p className="text-sm text-destructive mt-1">{overallErrors.amount.message}</p>}
                  
                  <Button type="submit" size="lg" className="w-full h-11" disabled={isSubmittingOverall || !isOverallDirty || isLoadingPageData}>
                    {isSubmittingOverall ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                    {overallBudget ? 'Update Budget' : 'Set Budget'}
                  </Button>
                </form>
              </CardContent>
            </div>
            <div className="p-6 bg-muted/10 md:rounded-r-lg flex flex-col items-center justify-center min-h-[260px]">
                <ResponsiveContainer width="100%" height={180}>
                  <RadialBarChart
                    innerRadius="70%"
                    outerRadius="100%"
                    barSize={25}
                    data={overallBudgetChartData}
                    startAngle={90}
                    endAngle={-270}
                  >
                    <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                    <RadialBar
                      background={{ fill: 'hsl(var(--muted))' }}
                      dataKey="value"
                      angleAxisId={0}
                      cornerRadius={12}
                    >
                      {overallBudgetChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </RadialBar>
                     <RechartsTooltip
                        cursor={{fill: 'transparent'}}
                        contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '0.5rem' }}
                        formatter={(value, name, props) => [`${formatCurrency(props.payload.amount)} (${Number(value).toFixed(0)}%)`, name]}
                      />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="text-center mt-3">
                  {overallBudget && overallBudget.amount > 0 ? (
                    <>
                      <p className="text-2xl font-bold text-primary">{formatCurrency(overallBudget.spentAmount)}</p>
                      <p className="text-sm text-muted-foreground">spent of {formatCurrency(overallBudget.amount)}</p>
                    </>
                  ) : (
                     <p className="text-sm text-muted-foreground">Set budget to track spending.</p>
                  )}
                </div>
            </div>
          </div>
        </Card>

        <div className="pt-4" />

        <Card className="shadow-lg">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,_3fr)_minmax(0,_2fr)]">
              <div className="p-6 border-b lg:border-b-0 lg:border-r border-border">
                <CardHeader className="p-0 mb-4">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                     <ListChecks className="h-5 w-5 text-primary" /> Allocated by Category
                  </CardTitle>
                   <CardDescription>Set individual limits for expense categories included in your budget.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {budgetableCategories.length === 0 ? (
                     <div className="text-center py-8 text-muted-foreground">
                        <Settings2 className="mx-auto h-10 w-10 mb-3 opacity-40" />
                        <p className="font-medium">No Categories for Budgeting</p>
                        <p className="text-xs mt-1">Visit &apos;Categories&apos; and mark expense items with &apos;Include in Budget&apos;.</p>
                     </div>
                  ) : (
                    <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                      {budgetableCategories.map(category => (
                        <CategoryBudgetRow
                          key={category.id}
                          category={category}
                          budget={categoryBudgets.find(b => b.categoryId === category.id)}
                          onSave={handleSaveCategoryBudget}
                          onDelete={setBudgetToDelete}
                          isSaving={isSavingCategoryBudget === category.id}
                          onEdit={handleEditBudget}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </div>

              <div className="p-6 bg-muted/20 md:rounded-r-lg flex flex-col items-center justify-center min-h-[350px] lg:min-h-full">
                <h3 className="text-md font-semibold mb-2 text-center text-foreground">Category Budget vs. Spent</h3>
                {categoryRadarChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={320}>
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={categoryRadarChartData}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                      <PolarRadiusAxis angle={30} domain={[0, 'dataMax']} tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                      <Radar name="Budgeted" dataKey="budgeted" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.5} />
                      <Radar name="Spent" dataKey="spent" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.4} />
                       <RechartsTooltip
                        contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '0.5rem' }}
                        formatter={(value) => formatCurrency(Number(value))} />
                      <RechartsLegend wrapperStyle={{fontSize: '12px', paddingTop: '10px'}}/>
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                    <div className="text-center text-muted-foreground py-8 flex flex-col items-center">
                        <BarChartBig className="mx-auto h-12 w-12 mb-2 opacity-30" />
                        <p className="text-sm">Set category budgets to visualize their distribution.</p>
                    </div>
                )}
              </div>
            </div>
             <CardFooter className={cn("p-4 border-t text-sm flex items-center gap-2 justify-center",
                 budgetComparisonMessage.type === 'success' && "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/20",
                 budgetComparisonMessage.type === 'info' && "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20",
                 budgetComparisonMessage.type === 'warning' && "text-yellow-800 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/20"
              )}>
                <budgetComparisonMessage.icon className="h-4 w-4 shrink-0" />
                {budgetComparisonMessage.message}
              </CardFooter>
          </Card>
      </div>

      <BudgetForm
        isOpen={isBudgetFormOpen}
        onOpenChange={setIsBudgetFormOpen}
        budgetToEdit={editingBudget}
        onSaveSuccess={handleBudgetFormSaveSuccess}
        budgetableCategories={budgetableCategories}
        currentPeriod={period}
      />

      {budgetToDelete && (
        <Dialog open={!!budgetToDelete} onOpenChange={() => setBudgetToDelete(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader className="items-center text-center">
               <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-destructive"/>
              </div>
              <DialogTitle className="text-xl font-semibold">Delete Category Budget</DialogTitle>
              <DialogDescription className="text-sm">
                Are you sure you want to delete the budget for <br/>
                <span className="font-semibold text-foreground">&quot;{budgetToDelete.name}&quot;</span>
                ({formatCurrency(budgetToDelete.amount)})?
                <br/>This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 pt-4">
              <Button variant="outline" onClick={() => setBudgetToDelete(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteBudgetRequest} disabled={!!isSavingCategoryBudget && isSavingCategoryBudget === budgetToDelete.categoryId}>
                {isSavingCategoryBudget === budgetToDelete.categoryId && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete Budget
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
