"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Download,
  RefreshCw,
  Target,
  ArrowRightLeft,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { WebAppAccount } from '@/types/account';
import type { WebAppCategory } from '@/types/budget';
import type { WebAppTransaction } from '@/types/transaction';
import { LIABILITY_TYPES } from '@/types/account';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  LineChart,
  Line,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ComposedChart,
} from 'recharts';

interface ReportsClientPageProps {
  initialAccounts: WebAppAccount[];
  initialCategories: WebAppCategory[];
  initialTransactions: WebAppTransaction[];
}

const formatCurrency = (value: number | undefined | null, currency = 'USD') => {
  if (value === null || value === undefined) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short'
  }).format(value);
};

const getMonthName = (month: number) => {
  return new Date(2000, month - 1, 1).toLocaleString('default', { month: 'long' });
};

const ASSET_COLOR = "#02a141";
const LIABILITY_COLOR = "#990f0f";

export default function ReportsClientPage({
  initialAccounts,
  initialCategories,
  initialTransactions,
}: ReportsClientPageProps) {
  const [accounts] = useState<WebAppAccount[]>(initialAccounts);
  const [categories] = useState<WebAppCategory[]>(initialCategories);
  const [transactions, setTransactions] = useState<WebAppTransaction[]>(initialTransactions);
  const [isLoading, setIsLoading] = useState(false);
  
  // Filter states
  const [selectedTimeRange, setSelectedTimeRange] = useState<'3m' | '6m' | '12m' | 'all'>('6m');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  
  // Additional state for budget data
  const [budgetData, setBudgetData] = useState<any[]>([]);
  const [isLoadingBudgets, setIsLoadingBudgets] = useState(false);

  // Calculate time range for filtering
  const getTimeRangeDate = useCallback((range: string) => {
    const now = new Date();
    switch (range) {
      case '3m':
        return new Date(now.getFullYear(), now.getMonth() - 3, 1);
      case '6m':
        return new Date(now.getFullYear(), now.getMonth() - 6, 1);
      case '12m':
        return new Date(now.getFullYear(), now.getMonth() - 12, 1);
      case 'all':
      default:
        if (transactions.length === 0) return new Date(now.getFullYear() - 1, 0, 1);
        const earliestDate = new Date(Math.min(...transactions.map(t => new Date(t.date).getTime())));
        return new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1);
    }
  }, [transactions]);

  // Filter transactions based on selected filters
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];
    const cutoffDate = getTimeRangeDate(selectedTimeRange);
    filtered = filtered.filter(t => new Date(t.date) >= cutoffDate);
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.categoryId === selectedCategory);
    }
    if (selectedAccount !== 'all') {
      filtered = filtered.filter(t => t.accountId === selectedAccount);
    }
    return filtered;
  }, [transactions, selectedTimeRange, selectedCategory, selectedAccount, getTimeRangeDate]);

  // Net Worth calculation
  const { netWorth, totalAssets, totalDebts, netWorthHistory } = useMemo(() => {
    const currentNetWorth = accounts.reduce((acc, account) => {
      const balance = account.balance;
      if (LIABILITY_TYPES.includes(account.type as any)) {
        acc.totalDebts += balance;
      } else {
        acc.totalAssets += balance;
      }
      return acc;
    }, { totalAssets: 0, totalDebts: 0 });

    const startDate = getTimeRangeDate(selectedTimeRange);
    const endDate = new Date();
    const history = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
      const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
      let monthAssets = 0;
      let monthLiabilities = 0;
      
      accounts.forEach(account => {
        let balance = account.balance;
        const futureTransactions = transactions.filter(t => 
          t.accountId === account.accountId && new Date(t.date) > monthEnd
        );
        futureTransactions.forEach(t => {
          balance += t.type === 'income' ? -t.amount : t.amount;
        });
        if (LIABILITY_TYPES.includes(account.type as any)) {
          monthLiabilities += balance;
        } else {
          monthAssets += balance;
        }
      });
      
      history.push({
        month: monthStart.toLocaleDateString('default', { month: 'short', year: '2-digit' }),
        netWorth: monthAssets - monthLiabilities,
        assets: monthAssets,
        liabilities: monthLiabilities,
      });
      current.setMonth(current.getMonth() + 1);
    }

    return {
      netWorth: currentNetWorth.totalAssets - currentNetWorth.totalDebts,
      totalAssets: currentNetWorth.totalAssets,
      totalDebts: currentNetWorth.totalDebts,
      netWorthHistory: history,
    };
  }, [accounts, transactions, selectedTimeRange, getTimeRangeDate]);

  // Calculate income vs expense data
  const incomeVsExpenseData = useMemo(() => {
    const startDate = getTimeRangeDate(selectedTimeRange);
    const endDate = new Date();
    const monthlyData: { [key: string]: { income: number; expense: number } } = {};
    const current = new Date(startDate);

    while (current <= endDate) {
      const monthKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[monthKey] = { income: 0, expense: 0 };
      current.setMonth(current.getMonth() + 1);
    }
    
    filteredTransactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyData[monthKey]) {
        if (transaction.type === 'income') {
          monthlyData[monthKey].income += transaction.amount;
        } else {
          monthlyData[monthKey].expense += transaction.amount;
        }
      }
    });

    return Object.entries(monthlyData).map(([monthKey, data]) => {
      const [year, month] = monthKey.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return {
        month: getMonthName(parseInt(month)) + ' ' + year.slice(-2),
        date,
        ...data,
        surplus: data.income - data.expense,
      };
    }).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [filteredTransactions, selectedTimeRange, getTimeRangeDate]);

  const overviewMetrics = useMemo(() => {
    return incomeVsExpenseData.reduce(
      (acc, data) => {
        acc.totalIncome += data.income;
        acc.totalExpense += data.expense;
        acc.totalSurplus += data.surplus;
        return acc;
      },
      { totalIncome: 0, totalExpense: 0, totalSurplus: 0 }
    );
  }, [incomeVsExpenseData]);

  const accountFlow = useMemo(() => {
    const accountData: { [accountId: string]: { inflow: number; outflow: number; name: string } } = {};
    accounts.forEach(account => {
      accountData[account.accountId] = { inflow: 0, outflow: 0, name: account.name };
    });
    filteredTransactions.forEach(transaction => {
      if (accountData[transaction.accountId]) {
        if (transaction.type === 'income') {
          accountData[transaction.accountId].inflow += transaction.amount;
        } else {
          accountData[transaction.accountId].outflow += transaction.amount;
        }
      }
    });
    return Object.entries(accountData)
      .map(([accountId, data]) => ({ accountId, ...data, netFlow: data.inflow - data.outflow }))
      .sort((a, b) => Math.abs(b.netFlow) - Math.abs(a.netFlow));
  }, [accounts, filteredTransactions]);

  const fetchBudgetData = useCallback(async () => {
    setIsLoadingBudgets(true);
    try {
      const startDate = getTimeRangeDate(selectedTimeRange);
      const endDate = new Date();
      const budgets = [];
      const current = new Date(startDate);
      while (current <= endDate) {
        const year = current.getFullYear();
        const month = current.getMonth() + 1;
        try {
          const response = await fetch(`/api/budgets/monthly-overview?year=${year}&month=${month}`);
          if (response.ok) {
            const result = await response.json();
            if (result.data) {
              budgets.push({
                year,
                month,
                monthName: getMonthName(month) + ' ' + year.toString().slice(-2),
                fullDate: current.toLocaleDateString('default', { month: 'long', year: 'numeric' }),
                date: new Date(current),
                ...result.data,
              });
            }
          }
        } catch (error) {
          console.error(`Failed to fetch budget for ${year}-${month}:`, error);
        }
        current.setMonth(current.getMonth() + 1);
      }
      setBudgetData(budgets);
    } catch (error) {
      console.error('Failed to fetch budget data:', error);
      toast.error('Failed to load budget data');
    } finally {
      setIsLoadingBudgets(false);
    }
  }, [selectedTimeRange, getTimeRangeDate]);

  useEffect(() => {
    fetchBudgetData();
  }, [fetchBudgetData]);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetch('/api/transactions').then(res => res.json()).then(result => setTransactions(result.data || [])),
        fetchBudgetData()
      ]);
      toast.success('Data refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setIsLoading(false);
    }
  }, [fetchBudgetData]);

  const chartConfig = {
    income: { label: 'Income', color: ASSET_COLOR },
    expense: { label: 'Expense', color: LIABILITY_COLOR },
    surplus: { label: 'Surplus', color: '#0ea5e9' },
    netWorth: { label: 'Net Worth', color: '#8b5cf6' },
    assets: { label: 'Assets', color: ASSET_COLOR },
    liabilities: { label: 'Liabilities', color: LIABILITY_COLOR },
  } satisfies ChartConfig;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Financial Analytics</h1>
            <p className="text-muted-foreground text-sm">Insights into your financial performance and trends.</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
            <Select value={selectedTimeRange} onValueChange={(value: any) => setSelectedTimeRange(value)}>
              <SelectTrigger className="w-full sm:w-[150px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="3m">Last 3 months</SelectItem>
                <SelectItem value="6m">Last 6 months</SelectItem>
                <SelectItem value="12m">Last 12 months</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-[150px] h-9"><SelectValue placeholder="All categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger className="w-full sm:w-[150px] h-9"><SelectValue placeholder="All accounts" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All accounts</SelectItem>
                {accounts.map(a => <SelectItem key={a.accountId} value={a.accountId}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={refreshData} variant="outline" size="icon" disabled={isLoading} className="h-9 w-9">
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
            <Button variant="outline" size="icon" className="h-9 w-9"><Download className="h-4 w-4" /></Button>
        </div>
      </div>

      <Tabs defaultValue="networth" className="w-full">
        <div className="flex justify-center">
          <TabsList className="inline-grid w-auto grid-cols-4 bg-muted/50 p-2 rounded-2xl border">
              <TabsTrigger value="networth"><TrendingUp className="h-4 w-4 mr-2" />Net Worth</TabsTrigger>
              <TabsTrigger value="income"><BarChart3 className="h-4 w-4 mr-2" />Income vs Expenses</TabsTrigger>
              <TabsTrigger value="budget"><Target className="h-4 w-4 mr-2" />Budget Metrics</TabsTrigger>
              <TabsTrigger value="flow"><ArrowRightLeft className="h-4 w-4 mr-2" />Account Flow</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="networth" className="mt-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Net Worth Analytics</CardTitle>
              <CardDescription>Track your wealth growth month over month</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
              <div className="lg:col-span-2">
                <ChartContainer config={chartConfig} className="h-[350px]">
                  <LineChart data={netWorthHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted) / 0.5)" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={formatNumber} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="netWorth" stroke="var(--color-netWorth)" strokeWidth={2} />
                    <Line type="monotone" dataKey="assets" stroke="var(--color-assets)" strokeWidth={1.5} strokeDasharray="5 5" />
                    <Line type="monotone" dataKey="liabilities" stroke="var(--color-liabilities)" strokeWidth={1.5} strokeDasharray="5 5" />
                  </LineChart>
                </ChartContainer>
              </div>
              <div className="lg:col-span-1 space-y-4">
                <div className="p-4 rounded-lg bg-card border"><div className="flex items-center gap-2 text-sm text-muted-foreground"><span className="flex h-2 w-2 shrink-0 rounded-full bg-green-500" />Total Assets</div><p className="text-2xl font-bold mt-1">{formatCurrency(totalAssets)}</p></div>
                <div className="p-4 rounded-lg bg-card border"><div className="flex items-center gap-2 text-sm text-muted-foreground"><span className="flex h-2 w-2 shrink-0 rounded-full bg-red-500" />Total Liabilities</div><p className="text-2xl font-bold mt-1">{formatCurrency(totalDebts)}</p></div>
                <div className="p-4 rounded-lg bg-card border"><div className="flex items-center gap-2 text-sm text-muted-foreground"><span className="flex h-2 w-2 shrink-0 rounded-full bg-primary" />Net Worth</div><p className="text-2xl font-bold mt-1">{formatCurrency(netWorth)}</p></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="income" className="mt-6">
           <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Income vs Expense</CardTitle>
              <CardDescription>Monthly cash flow analysis with surplus/deficit tracking</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-4">
              <div className="lg:col-span-2">
                <ChartContainer config={chartConfig} className="h-[350px]">
                  <ComposedChart data={incomeVsExpenseData}>
                    <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis tickFormatter={formatNumber} /><ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="income" fill="var(--color-income)" /><Bar dataKey="expense" fill="var(--color-expense)" /><Line type="monotone" dataKey="surplus" stroke="var(--color-surplus)" strokeWidth={2} />
                  </ComposedChart>
                </ChartContainer>
              </div>
              <div className="lg:col-span-1 space-y-4">
                <div className="p-4 rounded-lg bg-card border"><div className="flex items-center gap-2 text-sm text-muted-foreground"><span className="flex h-2 w-2 shrink-0 rounded-full bg-green-500" />Total Income</div><p className="text-2xl font-bold mt-1">{formatCurrency(overviewMetrics.totalIncome)}</p></div>
                <div className="p-4 rounded-lg bg-card border"><div className="flex items-center gap-2 text-sm text-muted-foreground"><span className="flex h-2 w-2 shrink-0 rounded-full bg-red-500" />Total Expense</div><p className="text-2xl font-bold mt-1">{formatCurrency(overviewMetrics.totalExpense)}</p></div>
                <div className="p-4 rounded-lg bg-card border"><div className="flex items-center gap-2 text-sm text-muted-foreground"><span className={`flex h-2 w-2 shrink-0 rounded-full ${overviewMetrics.totalSurplus >= 0 ? 'bg-blue-500' : 'bg-orange-500'}`} />Net Flow</div><p className={`text-2xl font-bold mt-1 ${overviewMetrics.totalSurplus >= 0 ? 'text-foreground' : 'text-orange-500'}`}>{formatCurrency(overviewMetrics.totalSurplus)}</p></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budget" className="mt-6 space-y-6">
          <Card>
            <CardHeader><CardTitle>Budget vs Actual Spending</CardTitle><CardDescription>Track how well you're sticking to your monthly budgets</CardDescription></CardHeader>
            <CardContent>
              {isLoadingBudgets ? (<div className="flex items-center justify-center h-[400px]"><RefreshCw className="h-8 w-8 animate-spin text-primary" /><span className="ml-2 text-muted-foreground">Loading...</span></div>
              ) : budgetData.length > 0 ? (
                <ChartContainer config={{budgeted: {label: 'Budgeted', color: '#0ea5e9'}, spent: {label: 'Spent', color: '#f59e0b'}, variance: {label: 'Variance', color: '#8b5cf6'}}} className="h-[400px]">
                  <ComposedChart data={budgetData}>
                    <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="monthName" /><YAxis tickFormatter={formatNumber} /><ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="totalBudgeted" fill="var(--color-budgeted)" name="Budgeted" /><Bar dataKey="totalSpent" fill="var(--color-spent)" name="Spent" />
                    <Line type="monotone" dataKey={(d: any) => d.totalSpent - d.totalBudgeted} stroke="var(--color-variance)" strokeWidth={3} name="Over/Under" />
                  </ComposedChart>
                </ChartContainer>
              ) : (<div className="text-center py-12"><Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p>No budget data for this period.</p></div>)}
            </CardContent>
          </Card>
          {budgetData.length > 0 && (
            <Card><CardHeader><CardTitle>Monthly Budget Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {budgetData.slice(-6).reverse().map((month) => {
                  const variance = month.totalSpent - month.totalBudgeted;
                  const percentage = month.totalBudgeted > 0 ? (month.totalSpent / month.totalBudgeted) * 100 : 0;
                  return (
                    <div key={month.monthName} className="p-4 rounded-lg border bg-card">
                      <div className="flex items-center justify-between mb-3"><h3 className="font-semibold">{month.fullDate}</h3><Badge variant={variance > 0 ? "destructive" : "default"}>{variance > 0 ? '+' : ''}{formatCurrency(variance)}</Badge></div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div><span className="text-muted-foreground">Budgeted:</span><p>{formatCurrency(month.totalBudgeted)}</p></div>
                        <div><span className="text-muted-foreground">Spent:</span><p>{formatCurrency(month.totalSpent)}</p></div>
                        <div><span className="text-muted-foreground">Performance:</span><p className={cn(variance > 0 ? "text-destructive" : "text-green-600")}>{percentage.toFixed(1)}%</p></div>
                      </div>
                      <Progress value={Math.min(percentage, 100)} className="mt-3" />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="flow" className="mt-6 space-y-6">
          <Card>
            <CardHeader><CardTitle>Account Flow Analysis</CardTitle><CardDescription>View of money movement across all accounts</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <ChartContainer config={{inflow: {label: 'Inflow', color: ASSET_COLOR}, outflow: {label: 'Outflow', color: LIABILITY_COLOR}}} className="h-[400px]">
                <BarChart data={accountFlow} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" tickFormatter={formatNumber} /><YAxis dataKey="name" type="category" width={120} /><ChartTooltip content={<ChartTooltipContent />} /><Bar dataKey="inflow" fill="var(--color-inflow)" name="Inflow" /><Bar dataKey="outflow" fill="var(--color-outflow)" name="Outflow" /></BarChart>
              </ChartContainer>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {accountFlow.map((account) => {
                  const totalFlow = account.inflow + account.outflow;
                  const isPositiveFlow = account.netFlow >= 0;
                  return (
                    <div key={account.accountId} className={cn("p-6 rounded-xl border-2", isPositiveFlow ? "bg-green-50 dark:bg-green-950 border-green-200" : "bg-red-50 dark:bg-red-950 border-red-200")}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3"><div className={cn("p-3 rounded-full", isPositiveFlow ? "bg-green-100" : "bg-red-100")}><Wallet className={cn("h-5 w-5", isPositiveFlow ? "text-green-600" : "text-red-600")} /></div><div><h3 className="font-bold text-lg">{account.name}</h3><p className="text-sm text-muted-foreground">{totalFlow > 0 ? `${((account.inflow / totalFlow) * 100).toFixed(0)}% inflow` : 'No activity'}</p></div></div>
                        <Badge variant={isPositiveFlow ? "default" : "destructive"}>{isPositiveFlow ? '+' : ''}{formatCurrency(account.netFlow)}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2"><div className="flex items-center gap-2"><ArrowUpRight className="h-4 w-4 text-green-600" /><span className="text-sm">Income</span></div><p className="text-2xl font-bold">{formatCurrency(account.inflow)}</p><Progress value={totalFlow > 0 ? (account.inflow / totalFlow) * 100 : 0} className="h-2 bg-green-100" /></div>
                        <div className="space-y-2"><div className="flex items-center gap-2"><ArrowDownRight className="h-4 w-4 text-red-600" /><span className="text-sm">Expense</span></div><p className="text-2xl font-bold">{formatCurrency(account.outflow)}</p><Progress value={totalFlow > 0 ? (account.outflow / totalFlow) * 100 : 0} className="h-2 bg-red-100" /></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 