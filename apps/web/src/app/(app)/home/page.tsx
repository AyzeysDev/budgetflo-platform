// apps/web/src/app/(app)/home/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth'; // Ensure this path is correct
import { redirect } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, ListChecks, BarChart3, PiggyBank, Settings, DollarSign } from 'lucide-react'; // Budgeting related icons

export const metadata: Metadata = {
  title: 'Dashboard | BudgetFlo',
  description: 'Your personal finance dashboard.',
};

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) { // Check for user and user.id
    // Redirect to the landing page, ensuring callbackUrl is passed for post-login redirection
    const callbackUrl = encodeURIComponent("/home"); // Where to return after login
    redirect(`/?callbackUrl=${callbackUrl}#hero-section`); // Redirect to landing page, anchor to hero
  }

  // Extract user's first name or a fallback
  const userName = session.user.name?.split(' ')[0] || session.user.email?.split('@')[0] || 'User';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
          Welcome, {userName}!
        </h1>
        <p className="text-lg text-muted-foreground mt-1">
          Ready to manage your finances?
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {/* Create New Budget Card */}
        <Card className="flex flex-col hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl font-semibold">
              New Budget
            </CardTitle>
            <PlusCircle className="h-6 w-6 text-green-500" />
          </CardHeader>
          <CardContent className="flex flex-col flex-grow">
            <CardDescription className="mb-4">
              Set up a new monthly or project-based budget.
            </CardDescription>
            <Button asChild size="lg" className="w-full mt-auto bg-green-600 hover:bg-green-700">
              <Link href="/budgets/new"> {/* Assuming a route like /budgets/new */}
                <PlusCircle className="mr-2 h-5 w-5" /> Create Budget
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* View Transactions Card */}
        <Card className="flex flex-col hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl font-semibold">
              Transactions
            </CardTitle>
            <ListChecks className="h-6 w-6 text-blue-500" />
          </CardHeader>
          <CardContent className="flex flex-col flex-grow">
            <CardDescription className="mb-4">
              Log new expenses or income and view your transaction history.
            </CardDescription>
            <Button asChild variant="outline" size="lg" className="w-full mt-auto">
              <Link href="/transactions"> {/* Assuming a route like /transactions */}
                View Transactions
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Reports Card */}
        <Card className="flex flex-col hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl font-semibold">
              Financial Reports
            </CardTitle>
            <BarChart3 className="h-6 w-6 text-purple-500" />
          </CardHeader>
          <CardContent className="flex flex-col flex-grow">
            <CardDescription className="mb-4">
              Analyze your spending patterns and budget performance.
            </CardDescription>
            <Button asChild variant="outline" size="lg" className="w-full mt-auto">
              <Link href="/reports"> {/* Assuming a route like /reports */}
                See Reports
              </Link>
            </Button>
          </CardContent>
        </Card>
        
        {/* Financial Goals Card */}
        <Card className="flex flex-col hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl font-semibold">
              Financial Goals
            </CardTitle>
            <PiggyBank className="h-6 w-6 text-amber-500" />
          </CardHeader>
          <CardContent className="flex flex-col flex-grow">
            <CardDescription className="mb-4">
              Set and track your progress towards your financial goals.
            </CardDescription>
            <Button asChild variant="outline" size="lg" className="w-full mt-auto">
              <Link href="/goals"> {/* Assuming a route like /goals */}
                Manage Goals
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Quick Add Expense (Placeholder) */}
        <Card className="flex flex-col hover:shadow-lg transition-shadow duration-300 opacity-80">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl font-semibold">
              Quick Add
            </CardTitle>
            <DollarSign className="h-6 w-6 text-teal-500" />
          </CardHeader>
          <CardContent className="flex flex-col flex-grow">
            <CardDescription className="mb-4">
              Quickly log an expense or income. (Coming Soon)
            </CardDescription>
            <Button asChild variant="secondary" size="lg" className="w-full mt-auto" disabled>
              <Link href="#"> 
                Add Entry
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Settings Card */}
         <Card className="flex flex-col hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xl font-semibold">
              Settings
            </CardTitle>
            <Settings className="h-6 w-6 text-slate-500" />
          </CardHeader>
          <CardContent className="flex flex-col flex-grow">
            <CardDescription className="mb-4">
              Manage your account, categories, and preferences.
            </CardDescription>
            <Button asChild variant="outline" size="lg" className="w-full mt-auto">
              <Link href="/settings"> {/* Assuming a route like /settings */}
                Go to Settings
              </Link>
            </Button>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}