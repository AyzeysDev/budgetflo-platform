// apps/web/src/app/(app)/categories/page.tsx
import type { Metadata } from 'next';
import { getServerSession } from 'next-auth/next'; // Corrected import
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import type { CategoryDTO } from '@/../../api/src/models/budget.model'; // Adjust path as needed
import CategoryClientPage from './CategoryClientPage';
import { AlertTriangleIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button'; // Import Button for potential refresh

export const metadata: Metadata = {
  title: 'Manage Categories | BudgetFlo',
  description: 'View, create, edit, and delete your spending and income categories for effective budget management.',
};

// Centralized data fetching function for categories on the server-side.
async function getCategoriesData(userId: string, cookieHeader: string | null): Promise<{ categories: CategoryDTO[] | null; error?: string }> {
  // Determine the base URL for API calls. Prefers internal if available.
  const baseUrl = process.env.NEXTAUTH_URL_INTERNAL || process.env.NEXTAUTH_URL;
  if (!baseUrl) {
    const errorMessage = "Server configuration error: NEXTAUTH_URL or NEXTAUTH_URL_INTERNAL is not set.";
    console.error("CategoriesPage (getCategoriesData):", errorMessage);
    return { categories: null, error: errorMessage };
  }
  
  const fetchUrl = new URL(`/api/categories`, baseUrl).toString(); 
  console.log(`CategoriesPage (getCategoriesData): Fetching categories from ${fetchUrl} for user ${userId}`);
  
  try {
    const response = await fetch(fetchUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Pass along the cookie from the original request to maintain session for the BFF API call
        ...(cookieHeader && { 'Cookie': cookieHeader }),
      },
      cache: 'no-store', // Always fetch fresh data for categories management
    });

    if (!response.ok) {
      let errorBody;
      try {
        errorBody = await response.json();
      } catch (e) {
        errorBody = { error: "Failed to parse error response from categories API. Status: " + response.status };
        console.log(e);
      }
      const errorMessage = errorBody?.error || `Failed to fetch categories. Status: ${response.status}`;
      console.error(`CategoriesPage (getCategoriesData): API error for user ${userId}. Status: ${response.status}. Body:`, errorBody);
      return { categories: null, error: errorMessage };
    }
    
    const result = await response.json();
    // The BFF API returns { data: CategoryDTO[] } upon success
    return { categories: (result.data as CategoryDTO[] || []), error: undefined };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while fetching categories.";
    console.error(`CategoriesPage (getCategoriesData): Exception fetching categories for user ${userId}:`, error);
    return { categories: null, error: errorMessage };
  }
}

export default async function CategoriesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    // If no session, redirect to login. Middleware should ideally handle this,
    // but this is a fallback.
    const callbackUrl = encodeURIComponent("/categories");
    redirect(`/?callbackUrl=${callbackUrl}#hero-section`); // Redirect to landing page with auth modal trigger
  }

  const userId = session.user.id;
  const requestHeaders = await headers(); // Get headers from the incoming request
  const cookieHeader = requestHeaders.get('cookie'); // Extract cookie for authenticated API calls

  const { categories: initialCategories, error: fetchError } = await getCategoriesData(userId, cookieHeader);

  if (fetchError || initialCategories === null) {
    // Render an error state if data fetching failed
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 md:p-8">
        <Card className="w-full max-w-lg text-center border-destructive bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center justify-center text-destructive">
              <AlertTriangleIcon className="mr-2 h-6 w-6" />
              Error Loading Categories
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-destructive-foreground">
              We encountered an issue loading your category data.
              {fetchError && <span className="block mt-1 text-xs">Details: {fetchError}</span>}
            </p>
            <Button variant="outline" asChild>
              {/* Using <a> for a full page refresh attempt */}
              <a href="/categories">Try Again</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If data is fetched successfully (even if it's an empty array), pass to client component.
  return (
    // The main layout for the categories page is handled by CategoryClientPage
    // This server component is primarily for data fetching and auth checks.
    <CategoryClientPage initialCategories={initialCategories} />
  );
}
