// apps/web/src/app/(app)/budgets/category/page.tsx
import type { Metadata } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import type { WebAppBudget, WebAppCategory } from '@/types/budget';
import { AlertTriangleIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import CategoryBudgetsClientPage from './CategoryBudgetsClientPage';

export const metadata: Metadata = {
  title: 'Category Budgets | BudgetFlo',
  description: 'Set, track, and manage your budgets for each spending category.',
};

async function getCategoryBudgetsData(userId: string, cookieHeader: string | null): Promise<{
  categoryBudgets: WebAppBudget[];
  budgetableCategories: WebAppCategory[];
  error?: string;
}> {
  const baseUrl = process.env.NEXTAUTH_URL_INTERNAL || process.env.NEXTAUTH_URL;
  if (!baseUrl) {
    const errorMessage = "Server configuration error: NEXTAUTH_URL or NEXTAUTH_URL_INTERNAL is not set.";
    console.error("CategoryBudgetsPage (getCategoryBudgetsData):", errorMessage);
    return { categoryBudgets: [], budgetableCategories: [], error: errorMessage };
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const categoryBudgetsUrl = new URL(`/api/budgets?isOverall=false&period=monthly&year=${currentYear}&month=${currentMonth}`, baseUrl).toString();
  const categoriesUrl = new URL(`/api/categories`, baseUrl).toString();

  const fetchOptions: RequestInit = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(cookieHeader && { 'Cookie': cookieHeader }),
    },
    cache: 'no-store',
  };

  try {
    const [categoryBudgetsRes, categoriesRes] = await Promise.all([
      fetch(categoryBudgetsUrl, fetchOptions),
      fetch(categoriesUrl, fetchOptions),
    ]);

    let categoryBudgets: WebAppBudget[] = [];
    if (categoryBudgetsRes.ok) {
      const result = await categoryBudgetsRes.json();
      categoryBudgets = (result.data as WebAppBudget[]) || [];
    } else {
      console.error(`CategoryBudgetsPage: Error fetching category budgets. Status: ${categoryBudgetsRes?.status}`);
    }

    let allCategories: WebAppCategory[] = [];
    if (categoriesRes.ok) {
      const result = await categoriesRes.json();
      allCategories = (result.data as WebAppCategory[]) || [];
    } else {
      console.error(`CategoryBudgetsPage: Error fetching categories. Status: ${categoriesRes?.status}`);
    }

    const budgetableCategories = allCategories.filter(cat => cat.includeInBudget && cat.type === 'expense');

    return { categoryBudgets, budgetableCategories, error: undefined };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while fetching budget data.";
    console.error("CategoryBudgetsPage (getCategoryBudgetsData): Exception:", error);
    return { categoryBudgets: [], budgetableCategories: [], error: errorMessage };
  }
}

export default async function CategoryBudgetsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect(`/?callbackUrl=/budgets/category#hero-section`);
  }

  const userId = session.user.id;
  const requestHeaders = await headers();
  const cookieHeader = requestHeaders.get('cookie');

  const { categoryBudgets, budgetableCategories, error } = await getCategoryBudgetsData(userId, cookieHeader);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 md:p-8">
        <Card className="w-full max-w-lg text-center border-destructive bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center justify-center text-destructive">
              <AlertTriangleIcon className="mr-2 h-6 w-6" />
              Error Loading Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-destructive-foreground">
              We encountered an issue loading your category budget data.
              {error && <span className="block mt-1 text-xs">Details: {error}</span>}
            </p>
            <Button variant="outline" asChild>
              <a href="/budgets/category">Try Again</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <CategoryBudgetsClientPage
      initialCategoryBudgets={categoryBudgets}
      budgetableCategories={budgetableCategories}
      currentYear={new Date().getFullYear()}
      currentMonth={new Date().getMonth() + 1}
    />
  );
}
