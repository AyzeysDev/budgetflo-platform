// apps/web/src/app/(app)/home/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  PlusCircle,
  LayoutGrid,
  BarChart3,
  TrendingUp,
  ListChecks,
  Target as TargetIcon,
  CreditCard,
  Landmark,
  Sparkles,
  CalendarDays,
  FilePieChart,
  Activity,
  Scale,
  // Settings, // Unused in this component
  // DollarSign, // Unused in this component
  // ShieldAlert, // Unused in this component
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// Import Radix UI Progress primitives
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: 'Dashboard | BudgetFlo',
  description: 'Your personal finance dashboard. Track spending, manage budgets, and get AI insights.',
};

// Mock data for demonstration - replace with actual data fetching
const mockBudgetData = [
  { name: 'Essentials', spent: 750, total: 1000, icon: Scale, color: "bg-red-500" },
  { name: 'Lifestyle', spent: 300, total: 500, icon: CreditCard, color: "bg-blue-500" },
  { name: 'Savings', spent: 200, total: 200, icon: Landmark, color: "bg-green-500" },
  { name: 'Subscriptions', spent: 50, total: 75, icon: ListChecks, color: "bg-yellow-500" },
];

const mockRecentTransactions = [
  { id: '1', description: 'Groceries at Coles', amount: -75.50, category: 'Essentials', date: 'May 27' },
  { id: '2', description: 'Netflix Subscription', amount: -15.99, category: 'Subscriptions', date: 'May 26' },
  { id: '3', description: 'Dinner with friends', amount: -120.00, category: 'Lifestyle', date: 'May 25' },
  { id: '4', description: 'Salary Deposit', amount: 2500.00, category: 'Income', date: 'May 25' },
];

const mockFinancialGoals = [
    { id: 'g1', name: 'Emergency Fund', current: 1500, target: 5000, progress: 30, color: "bg-sky-500" },
    { id: 'g2', name: 'Vacation to Japan', current: 800, target: 3000, progress: 26, color: "bg-fuchsia-500" },
];


export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    const callbackUrl = encodeURIComponent("/home");
    redirect(`/?callbackUrl=${callbackUrl}#hero-section`);
  }

  const userName = session.user.name?.split(' ')[0] || session.user.email?.split('@')[0] || 'User';

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
            Welcome back, {userName}!
          </h1>
          <p className="text-md text-muted-foreground mt-1">
            Here&apos;s your financial overview for this month.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/transactions/new">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Transaction
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/budgets/new">
              <Scale className="mr-2 h-4 w-4" /> New Budget
            </Link>
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Budgeted</CardDescription>
            <CardTitle className="text-3xl text-primary">$2500.00</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">+5% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Spent</CardDescription>
            <CardTitle className="text-3xl text-destructive">$1325.50</CardTitle>
          </CardHeader>
          <CardContent>
            <ProgressPrimitive.Root
              className="relative h-2 w-full overflow-hidden rounded-full bg-secondary"
              value={(1325.50 / 2500) * 100}
            >
              <ProgressPrimitive.Indicator
                className="h-full w-full flex-1 bg-destructive transition-all"
                style={{ transform: `translateX(-${100 - ((1325.50 / 2500) * 100)}%)` }}
              />
            </ProgressPrimitive.Root>
            <p className="text-xs text-muted-foreground mt-1">53% of budget used</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Remaining Budget</CardDescription>
            <CardTitle className="text-3xl text-green-600">$1174.50</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">47% of budget remaining</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="pb-2">
            <CardDescription>Savings Progress</CardDescription>
            <CardTitle className="text-3xl text-blue-600">$1500 / $5000</CardTitle>
          </CardHeader>
          <CardContent>
            <ProgressPrimitive.Root
              className="relative h-2 w-full overflow-hidden rounded-full bg-secondary"
              value={30}
            >
              <ProgressPrimitive.Indicator
                className="h-full w-full flex-1 bg-blue-600 transition-all"
                style={{ transform: `translateX(-${100 - 30}%)` }}
              />
            </ProgressPrimitive.Root>
            <p className="text-xs text-muted-foreground mt-1">Towards Emergency Fund</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area - Grid for Budgets, Charts, Transactions, Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Column 1: Budgets & Recent Transactions */}
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          {/* Budgets Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutGrid className="h-6 w-6 text-primary" />
                Budgets Overview
              </CardTitle>
              <CardDescription>Your spending limits by category for this month.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {mockBudgetData.map((budget) => {
                const progressValue = (budget.spent / budget.total) * 100;
                return (
                  <div key={budget.name}>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <budget.icon className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm font-medium">{budget.name}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        ${budget.spent.toFixed(2)} / ${budget.total.toFixed(2)}
                      </span>
                    </div>
                    <ProgressPrimitive.Root
                      className="relative h-2 w-full overflow-hidden rounded-full bg-secondary"
                      value={progressValue}
                    >
                      <ProgressPrimitive.Indicator
                        className={cn("h-full w-full flex-1 transition-all", budget.color)}
                        style={{ transform: `translateX(-${100 - progressValue}%)` }}
                      />
                    </ProgressPrimitive.Root>
                  </div>
                );
              })}
               <Button variant="outline" className="w-full mt-4">View All Budgets</Button>
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListChecks className="h-6 w-6 text-primary" />
                Recent Transactions
              </CardTitle>
              <CardDescription>Your latest financial activities.</CardDescription>
            </CardHeader>
            <CardContent>
              {mockRecentTransactions.length > 0 ? (
                <ul className="space-y-3">
                  {mockRecentTransactions.slice(0, 4).map((tx) => (
                    <li key={tx.id} className="flex justify-between items-center text-sm">
                      <div>
                        <p className="font-medium">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">{tx.category} - {tx.date}</p>
                      </div>
                      <span className={cn(tx.amount > 0 ? "text-green-600" : "text-destructive")}>
                        {tx.amount > 0 ? '+' : ''}${Math.abs(tx.amount).toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No recent transactions.</p>
              )}
              <Button variant="outline" className="w-full mt-4">View All Transactions</Button>
            </CardContent>
          </Card>

          {/* Graphical Overview Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-primary" />
                Graphical Overview
              </CardTitle>
              <CardDescription>Visual insights into your spending and budget performance.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg bg-muted/50 text-center">
                <FilePieChart className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Spending Distribution (Pie Chart Placeholder)</p>
              </div>
              <div className="p-4 border rounded-lg bg-muted/50 text-center">
                <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Weekly Spend vs Budget (Line Chart Placeholder)</p>
              </div>
              <Button variant="link" asChild className="w-full"><Link href="/reports">Go to Reports</Link></Button>
            </CardContent>
          </Card>
        </div>

        {/* Column 2: AI Insights & Financial Goals */}
        <div className="lg:col-span-1 space-y-6 md:space-y-8">
          {/* AI-Powered Insights Placeholder */}
          <Card className="bg-gradient-to-br from-primary/5 via-background to-background dark:from-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Sparkles className="h-6 w-6" />
                AI Financial Insights
              </CardTitle>
              <CardDescription>Smart analysis to help you save and spend wisely.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 border border-dashed border-primary/30 rounded-lg bg-primary/5">
                <h4 className="font-semibold text-sm flex items-center gap-1.5"><CalendarDays className="h-4 w-4"/>Weekly Tip:</h4>
                <p className="text-xs text-muted-foreground">You&apos;ve spent 20% less on Dining Out this week compared to your average. Keep it up!</p>
              </div>
              <div className="p-3 border border-dashed border-primary/30 rounded-lg bg-primary/5">
                <h4 className="font-semibold text-sm flex items-center gap-1.5"><TrendingUp className="h-4 w-4"/>Monthly Trend:</h4>
                <p className="text-xs text-muted-foreground">Your Subscriptions spending has increased by 15% this month. Review active subscriptions.</p>
              </div>
              <Button variant="ghost" asChild className="w-full text-primary hover:text-primary/90"><Link href="/insights">View All Insights</Link></Button>
            </CardContent>
          </Card>

          {/* Financial Goals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TargetIcon className="h-6 w-6 text-primary" />
                Financial Goals
              </CardTitle>
              <CardDescription>Track your progress towards your important milestones.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {mockFinancialGoals.map((goal) => {
                const progressValue = goal.progress;
                return (
                  <div key={goal.id}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">{goal.name}</span>
                      <span className="text-sm text-muted-foreground">
                        ${goal.current.toFixed(0)} / ${goal.target.toFixed(0)}
                      </span>
                    </div>
                    <ProgressPrimitive.Root
                      className="relative h-2 w-full overflow-hidden rounded-full bg-secondary"
                      value={progressValue}
                    >
                      <ProgressPrimitive.Indicator
                        className={cn("h-full w-full flex-1 transition-all", goal.color)}
                        style={{ transform: `translateX(-${100 - progressValue}%)` }}
                      />
                    </ProgressPrimitive.Root>
                  </div>
                );
              })}
              <Button variant="outline" className="w-full mt-4">Manage Goals</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
