// apps/web/src/app/(app)/accounts/page.tsx
import type { Metadata } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import type { WebAppAccount } from '@/types/account';
import AccountsClientPage from './AccountsClientPage';
import { AlertTriangleIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Manage Accounts | BudgetFlo',
  description: 'View, add, and manage all your financial accounts, from savings and checking to credit and investments.',
};

async function getAccountsData(userId: string, cookieHeader: string | null): Promise<{ accounts: WebAppAccount[] | null; error?: string }> {
  const baseUrl = process.env.NEXTAUTH_URL_INTERNAL || process.env.NEXTAUTH_URL;
  if (!baseUrl) {
    const errorMessage = "Server configuration error: Base URL is not set.";
    console.error("AccountsPage (getAccountsData):", errorMessage);
    return { accounts: null, error: errorMessage };
  }

  const fetchUrl = new URL(`/api/accounts`, baseUrl).toString();
  console.log(`AccountsPage: Fetching accounts from ${fetchUrl} for user ${userId}`);

  try {
    const response = await fetch(fetchUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(cookieHeader && { 'Cookie': cookieHeader }),
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ error: "Failed to parse error response from accounts API." }));
      const errorMessage = errorBody?.error || `Failed to fetch accounts. Status: ${response.status}`;
      console.error(`AccountsPage (getAccountsData): API error for user ${userId}. Status: ${response.status}. Body:`, errorBody);
      return { accounts: null, error: errorMessage };
    }
    
    const result = await response.json();
    return { accounts: (result.data as WebAppAccount[] || []), error: undefined };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while fetching accounts.";
    console.error(`AccountsPage (getAccountsData): Exception for user ${userId}:`, error);
    return { accounts: null, error: errorMessage };
  }
}

export default async function AccountsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    const callbackUrl = encodeURIComponent("/accounts");
    redirect(`/?callbackUrl=${callbackUrl}#hero-section`);
  }

  const userId = session.user.id;
  const requestHeaders = await headers();
  const cookieHeader = requestHeaders.get('cookie');

  const { accounts: initialAccounts, error: fetchError } = await getAccountsData(userId, cookieHeader);

  if (fetchError || initialAccounts === null) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 md:p-8">
        <Card className="w-full max-w-lg text-center border-destructive bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center justify-center text-destructive">
              <AlertTriangleIcon className="mr-2 h-6 w-6" />
              Error Loading Accounts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-destructive-foreground">
              We encountered an issue loading your account information.
              {fetchError && <span className="block mt-1 text-xs">Details: {fetchError}</span>}
            </p>
            <Button variant="outline" asChild>
              <a href="/accounts">Try Again</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <AccountsClientPage initialAccounts={initialAccounts} />
  );
}
