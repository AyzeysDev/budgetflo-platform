import type { Metadata } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import type { WebAppAccount } from '@/types/account';
import type { WebAppCategory } from '@/types/budget';
import type { WebAppTransaction } from '@/types/transaction';
import ReportsClientPage from './ReportsClientPage';
import { AlertTriangleIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Financial Reports & Analytics | BudgetFlo',
  description: 'Comprehensive financial analysis with spending trends, budget performance, and detailed insights.',
};

async function getReportsData(userId: string, cookieHeader: string | null) {
  const baseUrl = process.env.NEXTAUTH_URL_INTERNAL || process.env.NEXTAUTH_URL;
  if (!baseUrl) {
    const errorMessage = "Server configuration error: Base URL is not set.";
    console.error("ReportsPage (getReportsData):", errorMessage);
    return { data: null, error: errorMessage };
  }

  try {
    // Fetch accounts, categories, and recent transactions in parallel
    const [accountsRes, categoriesRes, transactionsRes] = await Promise.all([
      fetch(new URL('/api/accounts', baseUrl).toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(cookieHeader && { 'Cookie': cookieHeader }),
        },
        cache: 'no-store',
      }),
      fetch(new URL('/api/categories', baseUrl).toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(cookieHeader && { 'Cookie': cookieHeader }),
        },
        cache: 'no-store',
      }),
      fetch(new URL('/api/transactions', baseUrl).toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(cookieHeader && { 'Cookie': cookieHeader }),
        },
        cache: 'no-store',
      }),
    ]);

    if (!accountsRes.ok || !categoriesRes.ok || !transactionsRes.ok) {
      throw new Error("Failed to fetch one or more data sources");
    }

    const [accountsData, categoriesData, transactionsData] = await Promise.all([
      accountsRes.json(),
      categoriesRes.json(),
      transactionsRes.json(),
    ]);

    return {
      data: {
        accounts: (accountsData.data as WebAppAccount[]) || [],
        categories: (categoriesData.data as WebAppCategory[]) || [],
        transactions: (transactionsData.data as WebAppTransaction[]) || [],
      },
      error: undefined,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while fetching reports data.";
    console.error(`ReportsPage (getReportsData): Exception for user ${userId}:`, error);
    return { data: null, error: errorMessage };
  }
}

export default async function ReportsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    const callbackUrl = encodeURIComponent("/reports");
    redirect(`/?callbackUrl=${callbackUrl}#hero-section`);
  }

  const userId = session.user.id;
  const requestHeaders = await headers();
  const cookieHeader = requestHeaders.get('cookie');

  const { data: initialData, error: fetchError } = await getReportsData(userId, cookieHeader);

  if (fetchError || initialData === null) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 md:p-8">
        <Card className="w-full max-w-lg text-center border-destructive bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center justify-center text-destructive">
              <AlertTriangleIcon className="mr-2 h-6 w-6" />
              Error Loading Reports Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-destructive-foreground">
              We encountered an issue loading your financial data for reports.
              {fetchError && <span className="block mt-1 text-xs">Details: {fetchError}</span>}
            </p>
            <Button variant="outline" asChild>
              <a href="/reports">Try Again</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <ReportsClientPage 
      initialAccounts={initialData.accounts}
      initialCategories={initialData.categories}
      initialTransactions={initialData.transactions}
    />
  );
} 