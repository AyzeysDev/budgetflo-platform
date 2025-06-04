// apps/web/src/app/(app)/budgets/page.tsx
import type { Metadata } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import type { WebAppBudget, WebAppCategory } from '@/types/budget';
import BudgetsClientPage from './BudgetsClientPage'; // We will create this next
import { AlertTriangleIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Manage Budgets | BudgetFlo',
  description: 'Set and track your overall and category-specific budgets to achieve financial goals.',
};

// Helper function to fetch initial budget data
async function getInitialBudgetsData(userId: string, cookieHeader: string | null): Promise<{
  overallBudget: WebAppBudget | null;
  categoryBudgets: WebAppBudget[];
  budgetableCategories: WebAppCategory[];
  error?: string;
}> {
  const baseUrl = process.env.NEXTAUTH_URL_INTERNAL || process.env.NEXTAUTH_URL;
  if (!baseUrl) {
    const errorMessage = "Server configuration error: NEXTAUTH_URL or NEXTAUTH_URL_INTERNAL is not set.";
    console.error("BudgetsPage (getInitialBudgetsData):", errorMessage);
    return { overallBudget: null, categoryBudgets: [], budgetableCategories: [], error: errorMessage };
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // JavaScript months are 0-indexed

  // URLs for BFF API calls
  const overallBudgetUrl = new URL(`/api/budgets/overall?period=monthly&year=${currentYear}&month=${currentMonth}`, baseUrl).toString();
  const categoryBudgetsUrl = new URL(`/api/budgets?isOverall=false&period=monthly&year=${currentYear}&month=${currentMonth}`, baseUrl).toString();
  const categoriesUrl = new URL(`/api/categories`, baseUrl).toString(); // Fetches all user categories

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
    const [overallRes, categoryBudgetsRes, categoriesRes] = await Promise.all([
      fetch(overallBudgetUrl, fetchOptions).catch(e => { console.error('Fetch overallBudget error:', e); return null; }),
      fetch(categoryBudgetsUrl, fetchOptions).catch(e => { console.error('Fetch categoryBudgets error:', e); return null; }),
      fetch(categoriesUrl, fetchOptions).catch(e => { console.error('Fetch categories error:', e); return null; })
    ]);

    let overallBudget: WebAppBudget | null = null;
    if (overallRes?.ok) {
      const result = await overallRes.json();
      overallBudget = result.data as WebAppBudget; // Backend returns { data: BudgetDTO | null }
    } else if (overallRes && overallRes.status !== 404) { // 404 is fine, means no budget set
      console.error(`BudgetsPage: Error fetching overall budget. Status: ${overallRes?.status}`);
    }


    let categoryBudgets: WebAppBudget[] = [];
    if (categoryBudgetsRes?.ok) {
      const result = await categoryBudgetsRes.json();
      categoryBudgets = (result.data as WebAppBudget[]) || [];
    } else {
      console.error(`BudgetsPage: Error fetching category budgets. Status: ${categoryBudgetsRes?.status}`);
    }

    let allCategories: WebAppCategory[] = [];
    if (categoriesRes?.ok) {
      const result = await categoriesRes.json();
      allCategories = (result.data as WebAppCategory[]) || [];
    } else {
      console.error(`BudgetsPage: Error fetching categories. Status: ${categoriesRes?.status}`);
    }

    const budgetableCategories = allCategories.filter(cat => cat.includeInBudget && cat.type === 'expense');

    return { overallBudget, categoryBudgets, budgetableCategories, error: undefined };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while fetching budget data.";
    console.error("BudgetsPage (getInitialBudgetsData): Exception:", error);
    return { overallBudget: null, categoryBudgets: [], budgetableCategories: [], error: errorMessage };
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

  const { overallBudget, categoryBudgets, budgetableCategories, error } = await getInitialBudgetsData(userId, cookieHeader);

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
      initialCategoryBudgets={categoryBudgets}
      budgetableCategories={budgetableCategories}
      currentYear={new Date().getFullYear()}
      currentMonth={new Date().getMonth() + 1}
    />
  );
}
