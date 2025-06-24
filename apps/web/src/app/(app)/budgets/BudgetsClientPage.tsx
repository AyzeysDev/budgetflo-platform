// apps/web/src/app/(app)/budgets/BudgetsClientPage.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  Loader2,
  Save,
  ChevronLeft,
  ChevronRight,
  PiggyBank,
  TrendingUp,
  TrendingDown,
  Repeat,
  WalletCards,
  ListChecks,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from "sonner";
import type { WebAppBudget, WebAppSetOverallBudgetPayload } from '@/types/budget';
import { cn } from '@/lib/utils';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  Cell,
} from 'recharts';
import {
  ChartContainer,
  type ChartConfig,
} from '@/components/ui/chart';
import { MonthYearPicker } from './MonthYearPicker';
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface BudgetsClientPageProps {
  initialOverallBudget: WebAppBudget | null;
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
  isRecurring: z.boolean(),
});

type OverallBudgetFormData = z.infer<typeof overallBudgetFormSchema>;

const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return '$0.00';
  const value = Number(amount);
  if (isNaN(value)) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

export default function BudgetsClientPage({
  initialOverallBudget,
  currentYear: initialYear,
  currentMonth: initialMonth,
}: BudgetsClientPageProps) {
  const [period, setPeriod] = useState({ year: initialYear, month: initialMonth });
  const [overallBudget, setOverallBudget] = useState<WebAppBudget | null>(initialOverallBudget);
  const [isSubmittingOverall, setIsSubmittingOverall] = useState(false);
  const [isLoadingPageData, setIsLoadingPageData] = useState(false);
  
  const isInitialMount = useRef(true);

  const {
    control: overallControl,
    handleSubmit: handleOverallSubmit,
    reset: resetOverallForm,
    watch,
    formState: { errors: overallErrors, isDirty: isOverallDirty },
  } = useForm<OverallBudgetFormData>({
    resolver: zodResolver(overallBudgetFormSchema),
    defaultValues: {
      amount: initialOverallBudget?.amount ?? undefined,
      isRecurring: initialOverallBudget?.isRecurring ?? false,
    },
  });

  const isRecurring = watch('isRecurring');

  const fetchBudgetDataForPeriod = useCallback(async (year: number, month: number) => {
    setIsLoadingPageData(true);
    try {
        const overallRes = await fetch(`/api/budgets/overall?period=monthly&year=${year}&month=${month}`);

        const overallResult = await overallRes.json();
        
        if (!overallRes.ok && overallRes.status !== 404) throw new Error(overallResult.error || 'Failed to fetch overall budget');
        
        const newOverallBudget = (overallResult.data as WebAppBudget | null) || null;
        setOverallBudget(newOverallBudget);
        resetOverallForm({
            amount: newOverallBudget?.amount || undefined,
            isRecurring: newOverallBudget?.isRecurring || false,
        });
        
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
      isRecurring: initialOverallBudget?.isRecurring || false,
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
    
    const recurrenceRule = 'FREQ=MONTHLY;INTERVAL=1';

    const payload: WebAppSetOverallBudgetPayload = {
      amount: data.amount,
      period: 'monthly',
      year: period.year,
      month: period.month,
      notes: overallBudget?.notes || null,
      isRecurring: data.isRecurring,
      recurrenceRule: data.isRecurring ? recurrenceRule : undefined,
    };
    
    try {
      const response = await fetch('/api/budgets/overall', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload) 
      });
      const result = await response.json();
      toast.dismiss(toastId);
      if (!response.ok) throw new Error(result.error || "Failed to save overall budget");
      
      toast.success(`Overall budget saved!`);
      await fetchBudgetDataForPeriod(period.year, period.month);

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
              Your central hub for managing monthly budgets for <span className="font-semibold text-primary">{selectedPeriodDisplay}</span>.
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
                  <form onSubmit={handleOverallSubmit(onOverallBudgetSubmit)} className="space-y-4">
                    <div className="flex items-start gap-2">
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
                    </div>
                    
                    {/* Recurring Toggle Section */}
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between">
                          <Label htmlFor="recurring-budget" className="flex items-center gap-2 cursor-pointer">
                              <Repeat className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">Set Recurring</span>
                          </Label>
                          <Controller
                              name="isRecurring"
                              control={overallControl}
                              render={({ field }) => (
                                  <Switch
                                      id="recurring-budget"
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                  />
                              )}
                          />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5">
                          Apply this budget amount to future months automatically.
                      </p>
                    </div>
                  </form>
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
                    You've used {((overallBudget.spentAmount / overallBudget.amount) * 100).toFixed(0)}% of your budget.
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><ListChecks className="text-primary"/>Category Budgets</CardTitle>
                <CardDescription>Allocate your overall budget across different spending categories.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                    For a detailed breakdown and to manage individual category budgets, please navigate to the dedicated page.
                </p>
                <Button asChild>
                    <Link href="/budgets/category">
                        Manage Category Budgets
                        <ChevronRight className="ml-2 h-4 w-4"/>
                    </Link>
                </Button>
            </CardContent>
        </Card>
      </div>
    </>
  );
}
