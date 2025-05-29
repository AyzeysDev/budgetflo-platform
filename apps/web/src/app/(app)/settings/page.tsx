// apps/web/src/app/(app)/settings/page.tsx
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { SettingsForm } from '@/components/settings/SettingsForm';
// Import types from the web-specific types file
import type { WebAppUserProfile } from '@/types/user';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Account Settings | BudgetFlo',
  description: 'Manage your BudgetFlo account settings and profile information.',
};

/**
 * Fetches the user profile from the BFF API route.
 * This function is called server-side.
 * @param userId - The ID of the user.
 * @param cookieHeader - The cookie header from the incoming request to forward for authentication.
 * @returns The user profile or null if an error occurs.
 */
async function getUserProfile(userId: string, cookieHeader: string | null): Promise<WebAppUserProfile | null> {
  // Determine the base URL for API calls.
  // Use NEXTAUTH_URL_INTERNAL for server-to-server calls within the same deployment if available,
  // otherwise fall back to NEXTAUTH_URL (public URL).
  const baseUrl = process.env.NEXTAUTH_URL_INTERNAL || process.env.NEXTAUTH_URL;
  if (!baseUrl) {
    console.error("SettingsPage: NEXTAUTH_URL or NEXTAUTH_URL_INTERNAL is not set. Cannot fetch user profile.");
    return null;
  }

  const fetchUrl = new URL(`/api/user-profile/${userId}`, baseUrl).toString();
  console.log(`SettingsPage: Fetching user profile from: ${fetchUrl}`);

  try {
    const response = await fetch(fetchUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Forward cookies to ensure the API route can authenticate the request
        ...(cookieHeader && { 'Cookie': cookieHeader }),
      },
      // Ensure fresh data is fetched for settings, not from cache.
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`SettingsPage: Failed to fetch user profile for ${userId}. Status: ${response.status}. Body: ${errorBody}`);
      return null;
    }
    // Parse the JSON response
    const profileData = await response.json();
    return profileData as WebAppUserProfile; // Cast to the web-specific type
  } catch (error) {
    console.error(`SettingsPage: Exception fetching user profile for ${userId}:`, error);
    return null;
  }
}

/**
 * Server component for the Settings page.
 * It fetches user data server-side and passes it to the client component SettingsForm.
 */
export default async function SettingsPage() {
  // Get the server-side session.
  const session = await getServerSession(authOptions);

  // If no session or user ID, redirect to login.
  if (!session?.user?.id) {
    console.log("SettingsPage: No session found, redirecting to login.");
    redirect('/?callbackUrl=/settings#hero-section');
  }

  // Get cookies from the incoming request to forward them.
  // Awaiting headers() as per the TypeScript error message.
  const requestHeaders = await headers();
  const cookieHeader = requestHeaders.get('cookie');

  // Fetch the user profile data.
  const userProfile = await getUserProfile(session.user.id, cookieHeader);

  // If the profile could not be fetched, render an error message or a fallback.
  if (!userProfile) {
    console.error(`SettingsPage: User profile could not be loaded for user ID: ${session.user.id}.`);
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and profile information.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Error Loading Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              We were unable to load your profile information at this time. Please try again later.
              If the issue persists, contact support.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render the page with the SettingsForm, passing the fetched profile as initialData.
  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">Account Settings</h1>
        <p className="text-md text-muted-foreground mt-1">
          Manage your profile information and application preferences.
        </p>
      </div>
      <SettingsForm initialData={userProfile} userId={session.user.id} />
    </div>
  );
}
