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
  ChevronLeft,
  ChevronRight,
  BarChartBig,
  ListChecks,
  PiggyBank,
  TrendingUp,
  TrendingDown,
  Repeat,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from "sonner";
import type { WebAppBudget, WebAppCategory, WebAppSetOverallBudgetPayload, WebAppCreateBudgetPayload, WebAppUpdateBudgetPayload } from '@/types/budget';
import { IconRenderer, getContrastingTextColor, AvailableIconName } from '../categories/categoryUtils';
import { cn } from '@/lib/utils';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis,
  Cell,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { MonthYearPicker } from './MonthYearPicker';
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

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
}

function CategoryBudgetRow({ category, budget, onSave, onDelete, isSaving }: CategoryBudgetRowProps) {
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
  const [isRecurring, setIsRecurring] = useState(false);
  const [isCategoryRecurring, setIsCategoryRecurring] = useState(false);
  
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
    if (!overallBudget) return [];
    const spent = overallBudget.spentAmount;
    const total = overallBudget.amount;
    const overspent = Math.max(0, spent - total);
    const spentCapped = Math.min(spent, total);
    const remaining = Math.max(0, total - spent);

    return [
      { name: 'spent', value: spentCapped, fill: 'var(--color-chart-yellow)' },
      { name: 'overspent', value: overspent, fill: 'var(--color-destructive)' },
      { name: 'remaining', value: remaining, fill: 'var(--color-chart-green)' },
    ];
  }, [overallBudget]);

  const overallBudgetChartConfig = {
    spent: { label: 'Spent', color: 'hsl(var(--chart-yellow))' },
    overspent: { label: 'Overspent', color: 'hsl(var(--destructive))' },
    remaining: { label: 'Remaining', color: 'hsl(var(--chart-green))' },
  } satisfies ChartConfig;

  
  const categoryBarChartData = useMemo(() => {
    return budgetableCategories.map(category => {
      const budget = categoryBudgets.find(b => b.categoryId === category.id);
      return {
        name: category.name,
        amount: budget?.amount || 0,
        fill: category.color || 'hsl(var(--muted))',
      };
    }).filter(item => item.amount > 0); // Only show categories with a set budget
  }, [categoryBudgets, budgetableCategories]);
  
  const categoryBarChartConfig = useMemo(() => {
    const config: ChartConfig = {};
    categoryBarChartData.forEach(item => {
      config[item.name] = {
        label: item.name,
        color: item.fill,
      };
    });
    config.label = { color: "hsl(var(--background))" };
    return config;
  }, [categoryBarChartData]);
  
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


  const remainingAmount = overallBudget ? overallBudget.amount - overallBudget.spentAmount : 0;
  const isOverspent = overallBudget ? overallBudget.spentAmount > overallBudget.amount : false;
  const totalDisplayForChart = overallBudget ? (isOverspent ? overallBudget.spentAmount : overallBudget.amount) : 100;

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
            <Button variant="outline" size="icon" onClick={() => changeMonth('prev')} disabled={isLoadingPageData}><ChevronLeft className="h-4 w-4" /></Button>
            <MonthYearPicker
              currentPeriod={period}
              onPeriodChange={setPeriod}
              disabled={isLoadingPageData}
            />
            <Button variant="outline" size="icon" onClick={() => changeMonth('next')} disabled={isLoadingPageData}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>

        {/* ROW 1: Overall Budget Card & Radial Chart */}
        <Card className="shadow-lg overflow-hidden py-0">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="p-6 flex flex-col">
                <CardHeader className="p-0 mb-4 justify-left">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <PiggyBank className="w-5 h-5 text-primary" />
                        </div>
                        <CardTitle className="text-xl font-bold">Overall Monthly Budget</CardTitle>
                    </div>
                    <CardDescription>
                        Your total spending limit for the month.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0 pt-4">
                  <form onSubmit={handleOverallSubmit(onOverallBudgetSubmit)} className="flex items-start gap-2">
                      <div className="flex-grow space-y-1.5">
                          <Controller
                              name="amount"
                              control={overallControl}
                              render={({ field }) => (
                                  <div className="relative">
                                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                      <Input
                                          id="overallAmount"
                                          type="text"
                                          inputMode="decimal"
                                          placeholder="Enter monthly budget"
                                          {...field}
                                          onChange={(e) => field.onChange(e.target.value)}
                                          value={field.value === undefined ? '' : String(field.value)}
                                          className={cn("pl-9 h-11 text-base", overallErrors.amount && "border-destructive focus-visible:ring-destructive/50")}
                                          disabled={isSubmittingOverall || isLoadingPageData}
                                      />
                                  </div>
                              )}
                          />
                          {overallErrors.amount && <p className="text-xs text-destructive px-1">{overallErrors.amount.message}</p>}
                      </div>
                      <Button type="submit" className="h-11 shrink-0" disabled={isSubmittingOverall || !isOverallDirty || isLoadingPageData}>
                          {isSubmittingOverall ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                          {overallBudget ? 'Update' : 'Set'}
                      </Button>
                  </form>
                  <div className="mt-6 pt-8 border-t">
                      <div className="flex items-center justify-between">
                          <Label htmlFor="recurring-budget" className="flex items-center gap-2 cursor-pointer">
                              <Repeat className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">Set Recurring</span>
                          </Label>
                          <Switch
                              id="recurring-budget"
                              checked={isRecurring}
                              onCheckedChange={setIsRecurring}
                          />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5">
                          This budget will apply to future months, adapting based on usage.
                      </p>
                  </div>
                </CardContent>
            </div>
            
            <div className="bg-muted/30 flex flex-col items-center justify-center p-6 lg:p-6">
              <ChartContainer
                config={overallBudgetChartConfig}
                className="mx-auto aspect-square w-full max-w-[210px]"
              >
                <RadialBarChart
                  data={overallBudgetChartData}
                  startAngle={90}
                  endAngle={-270}
                  innerRadius="75%"
                  outerRadius="100%"
                  barSize={20}
                  stackOffset="expand"
                >
                  <PolarAngleAxis type="number" domain={[0, totalDisplayForChart]} tick={false} />
                  <RadialBar dataKey="value" cornerRadius={8} background={{ fill: 'hsl(var(--muted))' }}>
                    {overallBudgetChartData.map((entry) => (
                      <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                    ))}
                  </RadialBar>
                  <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-center">
                      <tspan x="50%" dy="-0.6em" className="text-lg font-bold">{formatCurrency(overallBudget?.spentAmount)}</tspan>
                      <tspan x="50%" dy="1.2em" className="text-sm text-muted-foreground">Spent of {formatCurrency(overallBudget?.amount)}</tspan>
                  </text>
                </RadialBarChart>
              </ChartContainer>
              {overallBudget && (
                <div className="text-center mt-4">
                  {isOverspent ? (
                    <div className="flex items-center justify-center gap-1 text-sm font-medium text-destructive">
                      <TrendingDown className="h-4 w-4" />
                      <span>Overspent by {formatCurrency(Math.abs(remainingAmount))}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-1 text-sm font-medium text-green-600 dark:text-green-400">
                      <TrendingUp className="h-4 w-4" />
                      <span>{formatCurrency(remainingAmount)} remaining</span>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Youve used {((overallBudget.spentAmount / overallBudget.amount) * 100).toFixed(0)}% of your budget.
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card className="shadow-lg py-4">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,_3fr)_minmax(0,_2fr)]">
              <div className="pt-2 pl-8 pr-6 pb-6 border-b lg:border-b-0 lg:border-r border-border flex flex-col">
                <CardHeader className="p-0 mb-4">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-lg font-semibold flex items-center gap-2">
                            <ListChecks className="h-5 w-5 text-primary" /> Allocated by Category
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            <Label htmlFor="category-recurring" className="text-sm font-medium text-muted-foreground">Recurring</Label>
                            <Switch
                                id="category-recurring"
                                checked={isCategoryRecurring}
                                onCheckedChange={setIsCategoryRecurring}
                            />
                        </div>
                    </div>
                   <CardDescription className="mt-1">Set individual limits for expense categories included in your budget.</CardDescription>
                </CardHeader>
                <CardContent className="p-0 flex-1">
                  {budgetableCategories.length === 0 ? (
                     <div className="text-center py-8 text-muted-foreground h-full flex flex-col justify-center items-center">
                        <Settings2 className="mx-auto h-10 w-10 mb-3 opacity-40" />
                        <p className="font-medium">No Categories for Budgeting</p>
                        <p className="text-xs mt-1">Visit &apos;Categories&apos; and mark expense items with &apos;Include in Budget&apos;.</p>
                     </div>
                  ) : (
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="space-y-3">
                        {budgetableCategories.map(category => (
                          <CategoryBudgetRow
                            key={category.id}
                            category={category}
                            budget={categoryBudgets.find(b => b.categoryId === category.id)}
                            onSave={handleSaveCategoryBudget}
                            onDelete={setBudgetToDelete}
                            isSaving={isSavingCategoryBudget === category.id}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
                <div
                  className={cn(
                    'mt-4 flex items-center justify-center gap-2 text-center text-sm font-medium',
                    {
                      'text-green-600 dark:text-green-500': budgetComparisonMessage.type === 'success',
                      'text-sky-600 dark:text-sky-400': budgetComparisonMessage.type === 'info',
                      'text-amber-600 dark:text-amber-500': budgetComparisonMessage.type === 'warning',
                    },
                  )}
                >
                  <budgetComparisonMessage.icon className="h-4 w-4 shrink-0" />
                  <span>{budgetComparisonMessage.message}</span>
                </div>
              </div>

              <div className="p-8 lg:p-12 bg-muted/20 md:rounded-r-lg flex flex-col items-center justify-center min-h-[350px] lg:min-h-full">
                <h3 className="text-md font-semibold mb-4 text-center text-foreground">Category Budgets Breakdown</h3>
                {categoryBarChartData.length > 0 ? (
                  <ChartContainer config={categoryBarChartConfig} className="w-full h-[400px]">
                      <BarChart
                          accessibilityLayer
                          data={categoryBarChartData}
                          layout="vertical"
                          margin={{ left: 10, right: 40 }}
                      >
                          <CartesianGrid horizontal={false} />
                          <YAxis
                              dataKey="name"
                              type="category"
                              tickLine={false}
                              tickMargin={10}
                              axisLine={false}
                              tickFormatter={(value) => value}
                              className="text-xs"
                          />
                          <XAxis dataKey="amount" type="number" hide />
                          <ChartTooltip
                              cursor={false}
                              content={<ChartTooltipContent indicator="line" />}
                          />
                          <Bar
                              dataKey="amount"
                              layout="vertical"
                              radius={4}
                          >
                            {categoryBarChartData.map((entry, index) => (
                                <LabelList
                                    key={`label-${index}`}
                                    dataKey="amount"
                                    position="right"
                                    offset={8}
                                    className="fill-foreground text-xs"
                                    formatter={(value: number) => formatCurrency(value)}
                                />
                            ))}
                          </Bar>
                      </BarChart>
                  </ChartContainer>
                ) : (
                    <div className="text-center text-muted-foreground py-8 flex flex-col items-center">
                        <BarChartBig className="mx-auto h-12 w-12 mb-2 opacity-30" />
                        <p className="text-sm">Set category budgets to visualize their distribution.</p>
                    </div>
                )}
              </div>
            </div>
          </Card>
      </div>

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
