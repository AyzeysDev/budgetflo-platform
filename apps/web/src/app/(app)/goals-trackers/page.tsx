import { Metadata } from 'next';
import { headers } from 'next/headers';
import GoalsTrackersClientPage from './GoalsTrackersClientPage';
import type { WebAppGoal } from '@/types/goal';
import type { WebAppLoanTracker, WebAppSavingsTracker } from '@/types/tracker';
import type { WebAppAccount } from '@/types/account';
import type { WebAppCategory } from '@/types/budget';

export const metadata: Metadata = {
  title: 'Goals & Trackers | BudgetFlo',
  description: 'Manage your financial goals, track loans, and monitor savings progress',
};

async function fetchData<T>(url: string): Promise<T | null> {
  try {
    const headersList = await headers();
    const response = await fetch(url, {
      headers: headersList,
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(`Failed to fetch from ${url}:`, response.status);
      return null;
    }

    return response.json();
  } catch (error) {
    console.error(`Error fetching from ${url}:`, error);
    return null;
  }
}

export default async function GoalsTrackersPage() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Fetch all data in parallel
  const [goalsData, loanTrackersData, savingsTrackersData, accountsData, categoriesData] = await Promise.all([
    fetchData<WebAppGoal[]>(`${baseUrl}/api/goals`),
    fetchData<WebAppLoanTracker[]>(`${baseUrl}/api/trackers/loans`),
    fetchData<WebAppSavingsTracker[]>(`${baseUrl}/api/trackers/savings`),
    fetchData<WebAppAccount[]>(`${baseUrl}/api/accounts`),
    fetchData<WebAppCategory[]>(`${baseUrl}/api/categories`),
  ]);

  return (
    <GoalsTrackersClientPage
      initialGoals={goalsData || []}
      initialLoanTrackers={loanTrackersData || []}
      initialSavingsTrackers={savingsTrackersData || []}
      accounts={accountsData || []}
      categories={categoriesData || []}
    />
  );
} 