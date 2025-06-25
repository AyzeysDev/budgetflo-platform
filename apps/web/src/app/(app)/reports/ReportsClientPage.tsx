"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Filter,
  Download,
  RefreshCw,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRightLeft,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { WebAppAccount } from '@/types/account';
import type { WebAppCategory } from '@/types/budget';
import type { WebAppTransaction } from '@/types/transaction';
import { ASSET_TYPES, LIABILITY_TYPES } from '@/types/account';
import { IconRenderer, AvailableIconName } from '../categories/categoryUtils';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ComposedChart,
  Area,
  AreaChart,
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

const CHART_COLORS = [
  '#02a141', '#990f0f', '#0ea5e9', '#f59e0b', '#8b5cf6',
  '#ef4444', '#10b981', '#f97316', '#6366f1', '#ec4899',
  '#14b8a6', '#f59e0b', '#8b5cf6', '#06b6d4', '#84cc16'
];

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
  const [selectedReportType, setSelectedReportType] = useState<'overview' | 'budget' | 'flow'>('overview');
  
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
        // Find earliest transaction date
        if (transactions.length === 0) return new Date(now.getFullYear() - 1, 0, 1);
        const earliestDate = new Date(Math.min(...transactions.map(t => new Date(t.date).getTime())));
        return new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1);
    }
  }, [transactions]);

  // Net Worth calculation with accurate historical data
  const { netWorth, totalAssets, totalDebts, netWorthHistory } = useMemo(() => {
    const currentNetWorth = accounts.reduce((acc, account) => {
      const balance = account.balance;
      if (LIABILITY_TYPES.includes(account.type as any)) {
        acc.totalDebts += balance;
      } else {
        acc.totalAssets += balance;
      }
      acc.netWorth = acc.totalAssets - acc.totalDebts;
      return acc;
    }, { netWorth: 0, totalAssets: 0, totalDebts: 0 });

    // Generate accurate historical data based on transactions
    const startDate = getTimeRangeDate(selectedTimeRange);
    const endDate = new Date();
    const history = [];
    
    // Create monthly buckets from start to end
    const current = new Date(startDate);
    while (current <= endDate) {
      const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
      const monthEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
      
      // Calculate net worth at end of this month by simulating account balances
      let monthAssets = 0;
      let monthLiabilities = 0;
      
      // For each account, calculate balance at end of month
      accounts.forEach(account => {
        const accountTransactions = transactions.filter(t => 
          t.accountId === account.accountId && 
          new Date(t.date) <= monthEnd
        );
        
        let balance = account.balance;
        // Subtract transactions that happened after this month to get historical balance
        const futureTransactions = transactions.filter(t => 
          t.accountId === account.accountId && 
          new Date(t.date) > monthEnd
        );
        
        futureTransactions.forEach(t => {
          if (t.type === 'income') {
            balance -= t.amount;
          } else {
            balance += t.amount;
          }
        });
        
        if (LIABILITY_TYPES.includes(account.type as any)) {
          monthLiabilities += balance;
        } else {
          monthAssets += balance;
        }
      });
      
      history.push({
        month: monthStart.toLocaleDateString('default', { month: 'short', year: '2-digit' }),
        fullDate: monthStart.toLocaleDateString('default', { month: 'long', year: 'numeric' }),
        netWorth: monthAssets - monthLiabilities,
        assets: monthAssets,
        liabilities: monthLiabilities,
        date: monthStart,
      });
      
      current.setMonth(current.getMonth() + 1);
    }

    return {
      ...currentNetWorth,
      netWorthHistory: history,
    };
  }, [accounts, transactions, selectedTimeRange, getTimeRangeDate]);

  // Filter transactions based on selected filters
  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];
    
    // Time range filter using accurate date calculation
    const cutoffDate = getTimeRangeDate(selectedTimeRange);
    filtered = filtered.filter(t => new Date(t.date) >= cutoffDate);
    
    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(t => t.categoryId === selectedCategory);
    }
    
    // Account filter
    if (selectedAccount !== 'all') {
      filtered = filtered.filter(t => t.accountId === selectedAccount);
    }
    
    return filtered;
  }, [transactions, selectedTimeRange, selectedCategory, selectedAccount, getTimeRangeDate]);



  // Calculate income vs expense data with accurate time buckets
  const incomeVsExpenseData = useMemo(() => {
    const startDate = getTimeRangeDate(selectedTimeRange);
    const endDate = new Date();
    const monthlyData: { [key: string]: { income: number; expense: number } } = {};
    
    // Initialize all months in range
    const current = new Date(startDate);
    while (current <= endDate) {
      const monthKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[monthKey] = { income: 0, expense: 0 };
      current.setMonth(current.getMonth() + 1);
    }
    
    // Populate with transaction data
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

    return Object.entries(monthlyData)
      .map(([monthKey, data]) => {
        const [year, month] = monthKey.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        return {
          month: getMonthName(parseInt(month)) + ' ' + year.slice(-2),
          fullDate: date.toLocaleDateString('default', { month: 'long', year: 'numeric' }),
          date,
          income: data.income,
          expense: data.expense,
          surplus: data.income - data.expense,
        };
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [filteredTransactions, selectedTimeRange, getTimeRangeDate]);



  // Account flow analysis
  const accountFlow = useMemo(() => {
    const accountData: { [accountId: string]: { inflow: number; outflow: number; name: string } } = {};
    
    accounts.forEach(account => {
      accountData[account.accountId] = {
        inflow: 0,
        outflow: 0,
        name: account.name,
      };
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
      .map(([accountId, data]) => ({
        accountId,
        ...data,
        netFlow: data.inflow - data.outflow,
      }))
      .sort((a, b) => Math.abs(b.netFlow) - Math.abs(a.netFlow));
  }, [accounts, filteredTransactions]);

  // Fetch budget performance data
  const fetchBudgetData = useCallback(async () => {
    setIsLoadingBudgets(true);
    try {
      const startDate = getTimeRangeDate(selectedTimeRange);
      const endDate = new Date();
      const budgets = [];
      
      // Fetch monthly budgets for each month in range
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

  // Load budget data when time range changes
  useEffect(() => {
    fetchBudgetData();
  }, [fetchBudgetData]);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [transactionsResponse] = await Promise.all([
        fetch('/api/transactions'),
        fetchBudgetData()
      ]);
      
      if (!transactionsResponse.ok) throw new Error('Failed to refresh data');
      const result = await transactionsResponse.json();
      setTransactions(result.data || []);
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
    <div className="flex flex-col gap-8 md:gap-10">
      {/* Ultra Modern Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-8 md:p-10">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="relative flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
                <BarChart3 className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent tracking-tight">
                  Financial Analytics
                </h1>
                <div className="flex items-center gap-2 mt-2">
                  <div className="h-1 w-12 bg-gradient-to-r from-primary to-primary/50 rounded-full"></div>
                  <span className="text-sm font-medium text-primary">Power User Dashboard</span>
                </div>
              </div>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
              Comprehensive insights into your financial performance, spending patterns, and wealth growth trends with advanced analytics.
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Real-time data</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span>Advanced filtering</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-purple-500 rounded-full animate-pulse"></div>
                <span>Interactive charts</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              onClick={refreshData} 
              variant="outline" 
              disabled={isLoading}
              className="bg-background/50 backdrop-blur-sm border-primary/20 hover:bg-primary/10 hover:border-primary/30 transition-all duration-200"
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
              Refresh Data
            </Button>
            <Button 
              variant="default"
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Download className="mr-2 h-4 w-4" />
              Export Report
            </Button>
          </div>
        </div>
      </div>

      {/* Ultra Modern Filters */}
      <Card className="border-2 border-primary/10 bg-gradient-to-br from-background/95 to-primary/5 backdrop-blur-sm shadow-xl">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
              <Filter className="h-5 w-5 text-primary" />
            </div>
            Advanced Filters
            <Badge variant="secondary" className="ml-auto">Dynamic</Badge>
          </CardTitle>
          <CardDescription className="text-base">
            Fine-tune your analysis with powerful filtering options
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                Time Range
              </label>
              <Select value={selectedTimeRange} onValueChange={(value: any) => setSelectedTimeRange(value)}>
                <SelectTrigger className="w-full h-11 bg-background/50 border-primary/20 hover:border-primary/30 transition-all duration-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-primary/20">
                  <SelectItem value="3m" className="hover:bg-primary/10">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                      Last 3 months
                    </div>
                  </SelectItem>
                  <SelectItem value="6m" className="hover:bg-primary/10">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-blue-500 rounded-full"></div>
                      Last 6 months
                    </div>
                  </SelectItem>
                  <SelectItem value="12m" className="hover:bg-primary/10">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-purple-500 rounded-full"></div>
                      Last 12 months
                    </div>
                  </SelectItem>
                  <SelectItem value="all" className="hover:bg-primary/10">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-orange-500 rounded-full"></div>
                      All time
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {filteredTransactions.length} transactions in range
              </p>
            </div>
            
            <div className="space-y-3">
              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                Category Filter
              </label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full h-11 bg-background/50 border-primary/20 hover:border-primary/30 transition-all duration-200">
                  <SelectValue placeholder="Filter by category..." />
                </SelectTrigger>
                <SelectContent className="border-primary/20">
                  <SelectItem value="all" className="hover:bg-primary/10">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
                      All categories
                    </div>
                  </SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category.id} value={category.id} className="hover:bg-primary/10">
                      <div className="flex items-center gap-2">
                        <IconRenderer name={category.icon as AvailableIconName} size={14} />
                        {category.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {categories.length} categories available
              </p>
            </div>
            
            <div className="space-y-3">
              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <div className="h-2 w-2 bg-purple-500 rounded-full"></div>
                Account Filter
              </label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger className="w-full h-11 bg-background/50 border-primary/20 hover:border-primary/30 transition-all duration-200">
                  <SelectValue placeholder="Filter by account..." />
                </SelectTrigger>
                <SelectContent className="border-primary/20">
                  <SelectItem value="all" className="hover:bg-primary/10">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 bg-gray-400 rounded-full"></div>
                      All accounts
                    </div>
                  </SelectItem>
                  {accounts.map(account => (
                    <SelectItem key={account.accountId} value={account.accountId} className="hover:bg-primary/10">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                        {account.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {accounts.length} accounts tracked
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ultra Modern Report Tabs */}
      <Tabs value={selectedReportType} defaultValue="overview" onValueChange={(value: any) => setSelectedReportType(value)}>
        <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-2 rounded-2xl border border-primary/10">
          <TabsTrigger 
            value="overview" 
            className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-200 font-medium"
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Overview
            </div>
          </TabsTrigger>
          <TabsTrigger 
            value="budget" 
            className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-200 font-medium"
          >
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Budget Performance
            </div>
          </TabsTrigger>
          <TabsTrigger 
            value="flow" 
            className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg transition-all duration-200 font-medium"
          >
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4" />
              Account Flow
            </div>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Net Worth Over Time */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Net Worth Over Time
              </CardTitle>
              <CardDescription>Track your wealth growth month over month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <ChartContainer config={chartConfig} className="h-[300px]">
                    <LineChart data={netWorthHistory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={formatNumber} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="netWorth" stroke="var(--color-netWorth)" strokeWidth={3} />
                      <Line type="monotone" dataKey="assets" stroke="var(--color-assets)" strokeWidth={2} strokeDasharray="5 5" />
                      <Line type="monotone" dataKey="liabilities" stroke="var(--color-liabilities)" strokeWidth={2} strokeDasharray="5 5" />
                    </LineChart>
                  </ChartContainer>
                </div>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                      <ArrowUpRight className="h-4 w-4" />
                      <span className="text-sm font-medium">Total Assets</span>
                    </div>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-100">{formatCurrency(totalAssets)}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950">
                    <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                      <ArrowDownRight className="h-4 w-4" />
                      <span className="text-sm font-medium">Total Liabilities</span>
                    </div>
                    <p className="text-2xl font-bold text-red-900 dark:text-red-100">{formatCurrency(totalDebts)}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-primary/10">
                    <div className="flex items-center gap-2 text-primary">
                      <Target className="h-4 w-4" />
                      <span className="text-sm font-medium">Net Worth</span>
                    </div>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(netWorth)}</p>
                    <p className="text-xs text-muted-foreground">
                      {netWorth >= 0 ? '+' : ''}{((netWorth / (totalAssets + totalDebts || 1)) * 100).toFixed(1)}% health score
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Income vs Expense */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-blue-600" />
                Income vs Expense
              </CardTitle>
              <CardDescription>Monthly cash flow analysis with surplus/deficit tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[400px]">
                <ComposedChart data={incomeVsExpenseData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={formatNumber} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="income" fill="var(--color-income)" />
                  <Bar dataKey="expense" fill="var(--color-expense)" />
                  <Line type="monotone" dataKey="surplus" stroke="var(--color-surplus)" strokeWidth={3} />
                </ComposedChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Budget Performance Tab */}
        <TabsContent value="budget" className="space-y-6">
          {/* Budget vs Actual Spending Over Time */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Budget vs Actual Spending
              </CardTitle>
              <CardDescription>Track how well you're sticking to your monthly budgets over time</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingBudgets ? (
                <div className="flex items-center justify-center h-[400px]">
                  <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2 text-muted-foreground">Loading budget data...</span>
                </div>
              ) : budgetData.length > 0 ? (
                <ChartContainer config={{
                  budgeted: { label: 'Budgeted', color: '#0ea5e9' },
                  spent: { label: 'Spent', color: '#f59e0b' },
                  variance: { label: 'Variance', color: '#8b5cf6' }
                }} className="h-[400px]">
                  <ComposedChart data={budgetData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="monthName" />
                    <YAxis tickFormatter={formatNumber} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="totalBudgeted" fill="var(--color-budgeted)" name="Budgeted" />
                    <Bar dataKey="totalSpent" fill="var(--color-spent)" name="Spent" />
                    <Line 
                      type="monotone" 
                      dataKey={(data: any) => data.totalSpent - data.totalBudgeted} 
                      stroke="var(--color-variance)" 
                      strokeWidth={3} 
                      name="Over/Under Budget"
                    />
                  </ComposedChart>
                </ChartContainer>
              ) : (
                <div className="text-center py-12">
                  <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No budget data available for the selected time range.</p>
                  <p className="text-sm text-muted-foreground mt-1">Set up monthly budgets to see performance analysis.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Budget Performance Summary */}
          {budgetData.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-blue-600/10">
                      <Target className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Avg Monthly Budget</p>
                      <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
                        {formatCurrency(budgetData.reduce((sum, b) => sum + b.totalBudgeted, 0) / budgetData.length)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-amber-200 dark:border-amber-800">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-amber-600/10">
                      <TrendingUp className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-amber-900 dark:text-amber-100">Avg Monthly Spent</p>
                      <p className="text-xl font-bold text-amber-700 dark:text-amber-300">
                        {formatCurrency(budgetData.reduce((sum, b) => sum + b.totalSpent, 0) / budgetData.length)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-purple-600/10">
                      {(() => {
                        const avgVariance = budgetData.reduce((sum, b) => sum + (b.totalSpent - b.totalBudgeted), 0) / budgetData.length;
                        return avgVariance > 0 ? 
                          <TrendingUp className="h-5 w-5 text-purple-600" /> :
                          <TrendingDown className="h-5 w-5 text-purple-600" />;
                      })()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-purple-900 dark:text-purple-100">Avg Variance</p>
                      <p className="text-xl font-bold text-purple-700 dark:text-purple-300">
                        {(() => {
                          const avgVariance = budgetData.reduce((sum, b) => sum + (b.totalSpent - b.totalBudgeted), 0) / budgetData.length;
                          return (avgVariance >= 0 ? '+' : '') + formatCurrency(Math.abs(avgVariance));
                        })()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Monthly Budget Details */}
          {budgetData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Monthly Budget Details</CardTitle>
                <CardDescription>Detailed breakdown of budget performance by month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {budgetData.slice(-6).reverse().map((month) => {
                    const variance = month.totalSpent - month.totalBudgeted;
                    const percentage = month.totalBudgeted > 0 ? (month.totalSpent / month.totalBudgeted) * 100 : 0;
                    const isOverBudget = variance > 0;
                    
                    return (
                      <div key={`${month.year}-${month.month}`} className="p-4 rounded-lg border bg-card">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold">{month.fullDate}</h3>
                          <Badge variant={isOverBudget ? "destructive" : "default"}>
                            {isOverBudget ? '+' : ''}{formatCurrency(variance)}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Budgeted:</span>
                            <p className="font-medium">{formatCurrency(month.totalBudgeted)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Spent:</span>
                            <p className="font-medium">{formatCurrency(month.totalSpent)}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Performance:</span>
                            <p className={cn("font-medium", isOverBudget ? "text-destructive" : "text-green-600")}>
                              {percentage.toFixed(1)}% of budget
                            </p>
                          </div>
                        </div>
                        <Progress 
                          value={Math.min(percentage, 100)} 
                          className="mt-3"
                        />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Account Flow Tab */}
        <TabsContent value="flow" className="space-y-6">
          {/* Income Flow Analysis */}
          <Card className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950 dark:to-emerald-900 border-green-200 dark:border-green-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
                <ArrowUpRight className="h-5 w-5" />
                Income Flow Analysis
              </CardTitle>
              <CardDescription className="text-green-700 dark:text-green-300">
                Track where your income is flowing and which accounts are receiving the most money
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {accountFlow
                  .filter(account => account.inflow > 0)
                  .sort((a, b) => b.inflow - a.inflow)
                  .map((account) => {
                    const inflowPercentage = accountFlow.reduce((sum, acc) => sum + acc.inflow, 0) > 0 ? 
                      (account.inflow / accountFlow.reduce((sum, acc) => sum + acc.inflow, 0)) * 100 : 0;
                    
                    return (
                      <div key={account.accountId} className="p-4 rounded-xl bg-white/60 dark:bg-black/20 border border-green-200 dark:border-green-700">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 rounded-full bg-green-600/10">
                            <Wallet className="h-4 w-4 text-green-600" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-green-900 dark:text-green-100">{account.name}</h3>
                            <p className="text-xs text-green-700 dark:text-green-300">{inflowPercentage.toFixed(1)}% of total income</p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-green-700 dark:text-green-300">Total Inflow</span>
                            <span className="font-bold text-green-800 dark:text-green-200">{formatCurrency(account.inflow)}</span>
                          </div>
                                                  <Progress 
                          value={inflowPercentage} 
                          className="h-2 bg-green-100 dark:bg-green-800"
                        />
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            </CardContent>
          </Card>

          {/* Complete Account Flow Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-blue-600" />
                Complete Account Flow Analysis
              </CardTitle>
              <CardDescription>Comprehensive view of money movement across all accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Flow Chart/Bars */}
                <ChartContainer config={{
                  inflow: { label: 'Inflow', color: ASSET_COLOR },
                  outflow: { label: 'Outflow', color: LIABILITY_COLOR },
                  netFlow: { label: 'Net Flow', color: '#8b5cf6' }
                }} className="h-[400px]">
                  <BarChart data={accountFlow} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={formatNumber} />
                    <YAxis dataKey="name" type="category" width={120} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="inflow" fill="var(--color-inflow)" name="Inflow" />
                    <Bar dataKey="outflow" fill="var(--color-outflow)" name="Outflow" />
                  </BarChart>
                </ChartContainer>

                {/* Detailed Account Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {accountFlow.map((account) => {
                    const totalFlow = account.inflow + account.outflow;
                    const isPositiveFlow = account.netFlow >= 0;
                    
                    return (
                      <div 
                        key={account.accountId} 
                        className={cn(
                          "p-6 rounded-xl border-2 transition-all duration-200 hover:shadow-lg",
                          isPositiveFlow 
                            ? "bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800" 
                            : "bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950 dark:to-rose-950 border-red-200 dark:border-red-800"
                        )}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "p-3 rounded-full",
                              isPositiveFlow ? "bg-green-600/10" : "bg-red-600/10"
                            )}>
                              <Wallet className={cn(
                                "h-5 w-5",
                                isPositiveFlow ? "text-green-600" : "text-red-600"
                              )} />
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
                            className="text-lg px-3 py-1"
                          >
                            {isPositiveFlow ? '+' : ''}{formatCurrency(account.netFlow)}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <ArrowUpRight className="h-4 w-4 text-green-600" />
                              <span className="text-sm font-medium text-green-700 dark:text-green-300">Income Flow</span>
                            </div>
                            <p className="text-2xl font-bold text-green-800 dark:text-green-200">
                              {formatCurrency(account.inflow)}
                            </p>
                            <div className="h-2 bg-green-100 dark:bg-green-800 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-green-600 rounded-full transition-all duration-500"
                                style={{ 
                                  width: totalFlow > 0 ? `${(account.inflow / totalFlow) * 100}%` : '0%' 
                                }}
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <ArrowDownRight className="h-4 w-4 text-red-600" />
                              <span className="text-sm font-medium text-red-700 dark:text-red-300">Expense Flow</span>
                            </div>
                            <p className="text-2xl font-bold text-red-800 dark:text-red-200">
                              {formatCurrency(account.outflow)}
                            </p>
                            <div className="h-2 bg-red-100 dark:bg-red-800 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-red-600 rounded-full transition-all duration-500"
                                style={{ 
                                  width: totalFlow > 0 ? `${(account.outflow / totalFlow) * 100}%` : '0%' 
                                }}
                              />
                            </div>
                          </div>
                        </div>
                        
                        {/* Account Performance Indicator */}
                        <div className="mt-4 pt-4 border-t">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Account Performance</span>
                            <span className={cn(
                              "font-medium",
                              isPositiveFlow ? "text-green-600" : "text-red-600"
                            )}>
                              {isPositiveFlow ? 'Accumulating' : 'Depleting'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 