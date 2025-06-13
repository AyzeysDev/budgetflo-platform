// apps/web/src/app/(app)/transactions/page.tsx
import type { Metadata } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { AlertTriangleIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import TransactionsClientPage from './TransactionsClientPage';
import type { WebAppTransaction } from '@/types/transaction';
import type { WebAppAccount } from '@/types/account';
import type { WebAppCategory } from '@/types/budget';

export const metadata: Metadata = {
  title: 'Transactions | BudgetFlo',
  description: 'View, add, edit, and manage all your financial transactions.',
};

// A helper type for the fetched data
interface InitialTransactionData {
  transactions: WebAppTransaction[];
  accounts: WebAppAccount[];
  categories: WebAppCategory[];
}

// This function will fetch all necessary data for the page in parallel.
async function getPageData(userId: string, cookieHeader: string | null): Promise<{ data: InitialTransactionData | null; error?: string }> {
  const baseUrl = process.env.NEXTAUTH_URL_INTERNAL || process.env.NEXTAUTH_URL;
  if (!baseUrl) {
    const errorMsg = "Server configuration error: Base URL not set.";
    console.error("TransactionsPage (getPageData):", errorMsg);
    return { data: null, error: errorMsg };
  }
    
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const fetchOptions: RequestInit = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(cookieHeader && { 'Cookie': cookieHeader }),
    },
    cache: 'no-store',
  };

  const urls = {
    transactions: new URL(`/api/transactions?year=${year}&month=${month}`, baseUrl).toString(),
    accounts: new URL(`/api/accounts`, baseUrl).toString(),
    categories: new URL(`/api/categories`, baseUrl).toString(),
  };

  try {
    const [transactionsRes, accountsRes, categoriesRes] = await Promise.all([
      fetch(urls.transactions, fetchOptions),
      fetch(urls.accounts, fetchOptions),
      fetch(urls.categories, fetchOptions),
    ]);

    if (!transactionsRes.ok || !accountsRes.ok || !categoriesRes.ok) {
      // Find the first failed response to report a more specific error
      const failedResponse = [transactionsRes, accountsRes, categoriesRes].find(res => !res.ok);
      const errorBody = await failedResponse?.json().catch(() => ({ error: `An API error occurred on path: ${failedResponse?.url}` }));
      throw new Error(errorBody?.error || "Failed to fetch initial page data.");
    }

    const transactionsJson = await transactionsRes.json();
    const accountsJson = await accountsRes.json();
    const categoriesJson = await categoriesRes.json();

    return {
      data: {
        transactions: transactionsJson.data || [],
        accounts: accountsJson.data || [],
        categories: categoriesJson.data || [],
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while fetching page data.";
    console.error("TransactionsPage (getPageData) Exception:", error);
    return { data: null, error: errorMessage };
  }
}

export default async function TransactionsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(`/?callbackUrl=/transactions#hero-section`);
  }

  const userId = session.user.id;
  const requestHeaders = await headers(); // Get headers from the incoming request
  const cookieHeader = requestHeaders.get('cookie'); // Extract cookie for authenticated API calls

  const { data: initialData, error: fetchError } = await getPageData(userId, cookieHeader);

  if (fetchError || !initialData) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <Card className="w-full max-w-lg text-center border-destructive bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center justify-center text-destructive">
              <AlertTriangleIcon className="mr-2 h-6 w-6" />
              Error Loading Data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-destructive-foreground">
              We couldn’t load the necessary data for the transactions page.
              {fetchError && <span className="block mt-1 text-xs">Details: {fetchError}</span>}
            </p>
            <Button variant="outline" asChild>
              <a href="/transactions">Try Again</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TransactionsClientPage
      initialTransactions={initialData.transactions}
      accounts={initialData.accounts}
      categories={initialData.categories}
    />
  );
}
