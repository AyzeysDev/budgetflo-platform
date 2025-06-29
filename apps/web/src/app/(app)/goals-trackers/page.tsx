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

    const result = await response.json();
    
    // Handle different API response formats
    if (url.includes('/accounts') && result.data) {
      return result.data as T;
    }
    
    return result as T;
  } catch (error) {
    console.error(`Error fetching from ${url}:`, error);
    return null;
  }
}

export default async function GoalsTrackersPage() {
  return <GoalsTrackersClientPage />;
} 