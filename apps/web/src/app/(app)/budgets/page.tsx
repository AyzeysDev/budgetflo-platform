// apps/web/src/app/(app)/budgets/page.tsx
import type { Metadata } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import type { WebAppBudget } from '@/types/budget';
import BudgetsClientPage from './BudgetsClientPage';
import { AlertTriangleIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Budget Center | BudgetFlo',
  description: 'Manage your monthly budgets and track spending across categories.',
};

// Helper function to fetch initial budget data
async function getInitialBudgetsData(userId: string, cookieHeader: string | null): Promise<{
  overallBudget: WebAppBudget | null;
  error?: string;
}> {
  const baseUrl = process.env.NEXTAUTH_URL_INTERNAL || process.env.NEXTAUTH_URL;
  if (!baseUrl) {
    const errorMessage = "Server configuration error: NEXTAUTH_URL or NEXTAUTH_URL_INTERNAL is not set.";
    console.error("BudgetsPage (getInitialBudgetsData):", errorMessage);
    return { overallBudget: null, error: errorMessage };
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // JavaScript months are 0-indexed

  const overallBudgetUrl = new URL(`/api/budgets/overall?period=monthly&year=${currentYear}&month=${currentMonth}`, baseUrl).toString();
  
  const fetchOptions: RequestInit = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(cookieHeader && { 'Cookie': cookieHeader }),
    },
    cache: 'no-store',
  };

  try {
    console.log(`BudgetsPage: Fetching overall budget from ${overallBudgetUrl}`);
    
    const overallRes = await fetch(overallBudgetUrl, fetchOptions);

    let overallBudget: WebAppBudget | null = null;

    if (overallRes.ok) {
      const result = await overallRes.json();
      overallBudget = result.data as WebAppBudget;
    } else if (overallRes.status !== 404) { // 404 is acceptable, means no budget set
      const errorBody = await overallRes.json().catch(() => ({error: "Failed to parse error from overall budget API"}));
      throw new Error(errorBody.error || `API Error: ${overallRes.status}`);
    }

    return { overallBudget, error: undefined };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while fetching budget data.";
    console.error("BudgetsPage (getInitialBudgetsData): Exception:", error);
    return { overallBudget: null, error: errorMessage };
  }
}

export default async function BudgetsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    const callbackUrl = encodeURIComponent("/budgets");
    redirect(`/?callbackUrl=${callbackUrl}#hero-section`);
  }

  const userId = session.user.id;
  const requestHeaders = await headers();
  const cookieHeader = requestHeaders.get('cookie');

  const { overallBudget, error } = await getInitialBudgetsData(userId, cookieHeader);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 md:p-8">
        <Card className="w-full max-w-lg text-center border-destructive bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center justify-center text-destructive">
              <AlertTriangleIcon className="mr-2 h-6 w-6" />
              Error Loading Budget Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-destructive-foreground">
              We encountered an issue loading your budget information.
              {error && <span className="block mt-1 text-xs">Details: {error}</span>}
            </p>
            <Button variant="outline" asChild>
              <a href="/budgets">Try Again</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <BudgetsClientPage
      initialOverallBudget={overallBudget}
      currentYear={new Date().getFullYear()}
      currentMonth={new Date().getMonth() + 1}
    />
  );
}
