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
    // Calculate current net worth
    const currentNetWorth = accounts.reduce((acc, account) => {
      const balance = account.balance;
      if (LIABILITY_TYPES.includes(account.type as any)) {
        // For liabilities, the balance represents debt owed (positive number)
        // This reduces net worth, so we add it to totalDebts
        acc.totalDebts += Math.abs(balance);
      } else {
        // For assets, positive balance increases net worth
        acc.totalAssets += balance;
      }
      return acc;
    }, { totalAssets: 0, totalDebts: 0 });

    // Find the earliest account creation date
    const earliestAccountDate = accounts.length > 0 
      ? new Date(Math.min(...accounts.map(account => new Date(account.createdAt).getTime())))
      : new Date();
    
    // Create historical net worth data
    const startDate = getTimeRangeDate(selectedTimeRange);
    const endDate = new Date();
    const history = [];
    const current = new Date(startDate);

    // Create a map to track balance changes by account over time
    const accountBalanceHistory = new Map<string, Array<{date: Date, amount: number, type: 'income' | 'expense'}>>();
    
    // Group transactions by account
    accounts.forEach(account => {
      const accountTransactions = transactions
        .filter(t => t.accountId === account.accountId)
        .map(t => ({
          date: new Date(t.date),
          amount: t.amount,
          type: t.type
        }))
        .sort((a, b) => a.date.getTime() - b.date.getTime());
      
      accountBalanceHistory.set(account.accountId, accountTransactions);
    });

    // Generate monthly history
    while (current <= endDate) {
      const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
      const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59, 999);
      
      // Check if this month is before the earliest account creation
      const isBeforeAccountCreation = monthEnd < earliestAccountDate;
      
      let monthAssets = 0;
      let monthLiabilities = 0;
      
      if (!isBeforeAccountCreation) {
        accounts.forEach(account => {
          const accountCreatedDate = new Date(account.createdAt);
          
          // Only include this account if it existed during this month
          if (monthEnd >= accountCreatedDate) {
            // Start with current balance and work backwards
            let historicalBalance = account.balance;
            
            // Get transactions after this month and reverse their effect
            const accountTxns = accountBalanceHistory.get(account.accountId) || [];
            const futureTransactions = accountTxns.filter(t => t.date > monthEnd);
            
            // Reverse the effect of future transactions to get historical balance
            futureTransactions.forEach(txn => {
              if (LIABILITY_TYPES.includes(account.type as any)) {
                // For liability accounts (credit cards, loans)
                // Income reduces the balance (payment), expense increases it (new charges)
                historicalBalance += txn.type === 'income' ? txn.amount : -txn.amount;
              } else {
                // For asset accounts (checking, savings)
                // Income increases balance, expense decreases it
                historicalBalance += txn.type === 'income' ? -txn.amount : txn.amount;
              }
            });
            
            // Categorize the historical balance
            if (LIABILITY_TYPES.includes(account.type as any)) {
              monthLiabilities += Math.abs(historicalBalance);
            } else {
              monthAssets += historicalBalance;
            }
          }
        });
      }
      
      history.push({
        month: monthStart.toLocaleDateString('default', { month: 'short', year: '2-digit' }),
        date: new Date(monthStart),
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
      netWorthHistory: history.sort((a, b) => a.date.getTime() - b.date.getTime()),
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="networth"><TrendingUp className="h-4 w-4 mr-2" />Net Worth</TabsTrigger>
          <TabsTrigger value="income"><BarChart3 className="h-4 w-4 mr-2" />Income vs Expenses</TabsTrigger>
          <TabsTrigger value="budget"><Target className="h-4 w-4 mr-2" />Budget Metrics</TabsTrigger>
          <TabsTrigger value="flow"><ArrowRightLeft className="h-4 w-4 mr-2" />Account Flow</TabsTrigger>
        </TabsList>

        <TabsContent value="networth" className="mt-6">
          <Card className="pt-0 shadow-lg border-0 bg-gradient-to-br from-background via-background to-muted/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-xl">
                <TrendingUp className="h-5 w-5 text-primary" />
                Net Worth Analytics
              </CardTitle>
              <CardDescription>Track your wealth growth month over month</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-0">
              <div className="lg:col-span-2">
                <ChartContainer config={chartConfig} className="h-[380px]">
                  <LineChart data={netWorthHistory}>
                    <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--muted))" strokeOpacity={0.4} />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tickFormatter={formatNumber} 
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line 
                      type="monotone" 
                      dataKey="netWorth" 
                      stroke="var(--color-netWorth)" 
                      strokeWidth={3} 
                      dot={{ fill: "var(--color-netWorth)", strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: "var(--color-netWorth)", strokeWidth: 2 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="assets" 
                      stroke="var(--color-assets)" 
                      strokeWidth={2} 
                      strokeDasharray="6 4" 
                      dot={{ fill: "var(--color-assets)", r: 3 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="liabilities" 
                      stroke="var(--color-liabilities)" 
                      strokeWidth={2} 
                      strokeDasharray="6 4" 
                      dot={{ fill: "var(--color-liabilities)", r: 3 }}
                    />
                  </LineChart>
                </ChartContainer>
              </div>
              <div className="lg:col-span-1 space-y-4">
                <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-50/80 to-emerald-100/40 border border-emerald-200/60 shadow-sm backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-3 w-3 rounded-full bg-emerald-500 shadow-sm"></div>
                    <span className="text-sm font-medium text-emerald-700">Total Assets</span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-900">{formatCurrency(totalAssets)}</p>
                </div>
                <div className="p-5 rounded-xl bg-gradient-to-br from-red-50/80 to-red-100/40 border border-red-200/60 shadow-sm backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-3 w-3 rounded-full bg-red-500 shadow-sm"></div>
                    <span className="text-sm font-medium text-red-700">Total Liabilities</span>
                  </div>
                  <p className="text-2xl font-bold text-red-900">{formatCurrency(totalDebts)}</p>
                </div>
                <div className="p-5 rounded-xl bg-gradient-to-br from-indigo-50/80 to-indigo-100/40 border border-indigo-200/60 shadow-sm backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-3 w-3 rounded-full bg-indigo-500 shadow-sm"></div>
                    <span className="text-sm font-medium text-indigo-700">Net Worth</span>
                  </div>
                  <p className="text-2xl font-bold text-indigo-900">{formatCurrency(netWorth)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="income" className="mt-6">
           <Card className="pt-0 shadow-lg border-0 bg-gradient-to-br from-background via-background to-muted/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-xl">
                <BarChart3 className="h-5 w-5 text-primary" />
                Income vs Expense
              </CardTitle>
              <CardDescription>Monthly cash flow analysis with surplus/deficit tracking</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-0">
              <div className="lg:col-span-2">
                <ChartContainer config={chartConfig} className="h-[380px]">
                  <ComposedChart data={incomeVsExpenseData}>
                    <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--muted))" strokeOpacity={0.4} />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tickFormatter={formatNumber} 
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="income" fill="var(--color-income)" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="expense" fill="var(--color-expense)" radius={[2, 2, 0, 0]} />
                    <Line 
                      type="monotone" 
                      dataKey="surplus" 
                      stroke="var(--color-surplus)" 
                      strokeWidth={3}
                      dot={{ fill: "var(--color-surplus)", strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: "var(--color-surplus)", strokeWidth: 2 }}
                    />
                  </ComposedChart>
                </ChartContainer>
              </div>
              <div className="lg:col-span-1 space-y-4">
                <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-50/80 to-emerald-100/40 border border-emerald-200/60 shadow-sm backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-3 w-3 rounded-full bg-emerald-500 shadow-sm"></div>
                    <span className="text-sm font-medium text-emerald-700">Total Income</span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-900">{formatCurrency(overviewMetrics.totalIncome)}</p>
                </div>
                <div className="p-5 rounded-xl bg-gradient-to-br from-red-50/80 to-red-100/40 border border-red-200/60 shadow-sm backdrop-blur-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-3 w-3 rounded-full bg-red-500 shadow-sm"></div>
                    <span className="text-sm font-medium text-red-700">Total Expense</span>
                  </div>
                  <p className="text-2xl font-bold text-red-900">{formatCurrency(overviewMetrics.totalExpense)}</p>
                </div>
                <div className={`p-5 rounded-xl shadow-sm backdrop-blur-sm ${overviewMetrics.totalSurplus >= 0 ? 'bg-gradient-to-br from-blue-50/80 to-blue-100/40 border border-blue-200/60' : 'bg-gradient-to-br from-orange-50/80 to-orange-100/40 border border-orange-200/60'}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`h-3 w-3 rounded-full shadow-sm ${overviewMetrics.totalSurplus >= 0 ? 'bg-blue-500' : 'bg-orange-500'}`}></div>
                    <span className={`text-sm font-medium ${overviewMetrics.totalSurplus >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>Net Flow</span>
                  </div>
                  <p className={`text-2xl font-bold ${overviewMetrics.totalSurplus >= 0 ? 'text-blue-900' : 'text-orange-900'}`}>{formatCurrency(overviewMetrics.totalSurplus)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budget" className="mt-6 space-y-6">
          <Card className="pt-0 shadow-lg border-0 bg-gradient-to-br from-background via-background to-muted/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Target className="h-5 w-5 text-primary" />
                Budget vs Actual Spending
              </CardTitle>
              <CardDescription>Track how well you're sticking to your monthly budgets</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingBudgets ? (
                <div className="flex items-center justify-center h-[400px]">
                  <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2 text-muted-foreground">Loading...</span>
                </div>
              ) : budgetData.length > 0 ? (
                <ChartContainer config={{budgeted: {label: 'Budgeted', color: '#0ea5e9'}, spent: {label: 'Spent', color: '#f59e0b'}, variance: {label: 'Variance', color: '#8b5cf6'}}} className="h-[400px]">
                  <ComposedChart data={budgetData}>
                    <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--muted))" strokeOpacity={0.4} />
                    <XAxis 
                      dataKey="monthName" 
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tickFormatter={formatNumber} 
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="totalBudgeted" fill="var(--color-budgeted)" name="Budgeted" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="totalSpent" fill="var(--color-spent)" name="Spent" radius={[2, 2, 0, 0]} />
                    <Line 
                      type="monotone" 
                      dataKey={(d: any) => d.totalSpent - d.totalBudgeted} 
                      stroke="var(--color-variance)" 
                      strokeWidth={3} 
                      name="Over/Under"
                      dot={{ fill: "var(--color-variance)", strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: "var(--color-variance)", strokeWidth: 2 }}
                    />
                  </ComposedChart>
                </ChartContainer>
              ) : (
                <div className="text-center py-16">
                  <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-muted/20 flex items-center justify-center">
                    <Target className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">No budget data for this period.</p>
                </div>
              )}
            </CardContent>
          </Card>
          {budgetData.length > 0 && (
            <Card className="pt-0 shadow-lg border-0 bg-gradient-to-br from-background via-background to-muted/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-xl">Monthly Budget Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {budgetData.slice(-6).reverse().map((month) => {
                  const variance = month.totalSpent - month.totalBudgeted;
                  const percentage = month.totalBudgeted > 0 ? (month.totalSpent / month.totalBudgeted) * 100 : 0;
                  return (
                    <div key={month.monthName} className="p-5 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-lg">{month.fullDate}</h3>
                        <Badge 
                          variant={variance > 0 ? "destructive" : "default"} 
                          className="font-mono shadow-sm"
                        >
                          {variance > 0 ? '+' : ''}{formatCurrency(variance)}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-6 text-sm mb-4">
                        <div className="text-center">
                          <span className="text-muted-foreground block mb-1">Budgeted</span>
                          <p className="font-semibold text-lg">{formatCurrency(month.totalBudgeted)}</p>
                        </div>
                        <div className="text-center">
                          <span className="text-muted-foreground block mb-1">Spent</span>
                          <p className="font-semibold text-lg">{formatCurrency(month.totalSpent)}</p>
                        </div>
                        <div className="text-center">
                          <span className="text-muted-foreground block mb-1">Performance</span>
                          <p className={cn("font-semibold text-lg", variance > 0 ? "text-destructive" : "text-green-600")}>
                            {percentage.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      <Progress 
                        value={Math.min(percentage, 100)} 
                        className={cn("h-2", percentage > 100 && "[&>*]:bg-destructive")} 
                      />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="flow" className="mt-6 space-y-6">
          <Card className="pt-0 shadow-lg border-0 bg-gradient-to-br from-background via-background to-muted/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-xl">
                <ArrowRightLeft className="h-5 w-5 text-primary" />
                Account Flow Analysis
              </CardTitle>
              <CardDescription>View of money movement across all accounts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ChartContainer config={{inflow: {label: 'Inflow', color: ASSET_COLOR}, outflow: {label: 'Outflow', color: LIABILITY_COLOR}}} className="h-[400px]">
                <BarChart data={accountFlow} layout="vertical">
                  <CartesianGrid strokeDasharray="2 4" stroke="hsl(var(--muted))" strokeOpacity={0.4} />
                  <XAxis 
                    type="number" 
                    tickFormatter={formatNumber} 
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={120} 
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="inflow" fill="var(--color-inflow)" name="Inflow" radius={[0, 2, 2, 0]} />
                  <Bar dataKey="outflow" fill="var(--color-outflow)" name="Outflow" radius={[0, 2, 2, 0]} />
                </BarChart>
              </ChartContainer>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {accountFlow.map((account) => {
                  const totalFlow = account.inflow + account.outflow;
                  const isPositiveFlow = account.netFlow >= 0;
                  return (
                    <div key={account.accountId} className={cn("p-6 rounded-xl border backdrop-blur-sm shadow-sm", isPositiveFlow ? "bg-gradient-to-br from-green-50/80 to-green-100/40 border-green-200/60" : "bg-gradient-to-br from-red-50/80 to-red-100/40 border-red-200/60")}>
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                          <div className={cn("p-3 rounded-full shadow-sm", isPositiveFlow ? "bg-green-100" : "bg-red-100")}>
                            <Wallet className={cn("h-6 w-6", isPositiveFlow ? "text-green-600" : "text-red-600")} />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg">{account.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {totalFlow > 0 ? `${((account.inflow / totalFlow) * 100).toFixed(0)}% inflow` : 'No activity'}
                            </p>
                          </div>
                        </div>
                        <Badge 
                          variant={isPositiveFlow ? "default" : "destructive"} 
                          className="font-mono shadow-sm"
                        >
                          {isPositiveFlow ? '+' : ''}{formatCurrency(account.netFlow)}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <ArrowUpRight className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium">Income</span>
                          </div>
                          <p className="text-2xl font-bold text-green-900">{formatCurrency(account.inflow)}</p>
                          <Progress 
                            value={totalFlow > 0 ? (account.inflow / totalFlow) * 100 : 0} 
                            className="h-2" 
                          />
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <ArrowDownRight className="h-4 w-4 text-red-600" />
                            <span className="text-sm font-medium">Expense</span>
                          </div>
                          <p className="text-2xl font-bold text-red-900">{formatCurrency(account.outflow)}</p>
                          <Progress 
                            value={totalFlow > 0 ? (account.outflow / totalFlow) * 100 : 0} 
                            className="h-2" 
                          />
                        </div>
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