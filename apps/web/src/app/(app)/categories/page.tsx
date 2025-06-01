// apps/web/src/app/(app)/categories/page.tsx
import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import type { CategoryDTO } from '@/../../api/src/models/budget.model';
import CategoryClientPage from './CategoryClientPage';

export const metadata: Metadata = {
  title: 'Manage Categories | BudgetFlo',
  description: 'View, create, edit, and delete your spending and income categories.',
};

async function getCategoriesData(userId: string, cookieHeader: string | null): Promise<CategoryDTO[]> {
  const baseUrl = process.env.NEXTAUTH_URL_INTERNAL || process.env.NEXTAUTH_URL;
  if (!baseUrl) {
    console.error("CategoriesPage (getCategoriesData): NEXTAUTH_URL or NEXTAUTH_URL_INTERNAL is not set.");
    return [];
  }
  
  const fetchUrl = new URL(`/api/categories`, baseUrl).toString(); 
  
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
      const errorBody = await response.json().catch(() => ({ 
        error: "Failed to parse error response from categories API."
      }));
      console.error(`CategoriesPage (getCategoriesData): Failed to fetch categories for user ${userId}. Status: ${response.status}. Body:`, errorBody);
      return [];
    }
    
    const result = await response.json();
    return result.data as CategoryDTO[] || [];
  } catch (error) {
    console.error(`CategoriesPage (getCategoriesData): Exception fetching categories for user ${userId}:`, error);
    return [];
  }
}

export default async function CategoriesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    const callbackUrl = encodeURIComponent("/categories");
    redirect(`/?callbackUrl=${callbackUrl}#hero-section`);
  }

  const userId = session.user.id;
  const requestHeaders = await headers();
  const cookieHeader = requestHeaders.get('cookie');

  const initialCategories = await getCategoriesData(userId, cookieHeader);

  // Better error boundary check - empty array is valid, null/undefined is not
  if (initialCategories === null || initialCategories === undefined) {
    return (
      <div className="flex flex-col gap-6 md:gap-8">
        <div className="w-full max-w-md mx-auto p-6 border rounded-lg">
          <h2 className="text-lg font-semibold text-destructive mb-2">Error Loading Categories</h2>
          <p className="text-sm text-muted-foreground">
            We were unable to load your categories. Please try again later.
            If the issue persists, contact support.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      {/* FIXED: Removed userId prop since CategoryClientPage doesn't need it */}
      <CategoryClientPage initialCategories={initialCategories} />
    </div>
  );
}