// apps/web/src/app/(app)/settings/page.tsx
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { SettingsForm } from '@/components/settings/SettingsForm';
import type { WebAppUserProfile } from '@/types/user';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // Keep for error display
import { AlertTriangle } from 'lucide-react'; // Keep for error display

export const metadata: Metadata = {
  title: 'Account Settings | BudgetFlo',
  description: 'Manage your BudgetFlo account settings and profile information.',
};

async function getUserProfile(userId: string, cookieHeader: string | null): Promise<WebAppUserProfile | null> {
  const baseUrl = process.env.NEXTAUTH_URL_INTERNAL || process.env.NEXTAUTH_URL;
  if (!baseUrl) {
    console.error("SettingsPage: NEXTAUTH_URL or NEXTAUTH_URL_INTERNAL is not set. Cannot fetch user profile.");
    return null;
  }
  const fetchUrl = new URL(`/api/user-profile/${userId}`, baseUrl).toString();
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
      const errorBody = await response.text();
      console.error(`SettingsPage: Failed to fetch user profile for ${userId}. Status: ${response.status}. Body: ${errorBody}`);
      return null;
    }
    const profileData = await response.json();
    return profileData as WebAppUserProfile;
  } catch (error) {
    console.error(`SettingsPage: Exception fetching user profile for ${userId}:`, error);
    return null;
  }
}

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    console.log("SettingsPage: No session found, redirecting to login.");
    redirect('/?callbackUrl=/settings#hero-section');
  }

  const requestHeaders = await headers();
  const cookieHeader = requestHeaders.get('cookie');
  const userProfile = await getUserProfile(session.user.id, cookieHeader);

  // The main layout for the page content itself.
  // The AuthenticatedLayout's <main> tag handles padding and overall scrolling.
  // max-w-6xl provides ample width for the card layout within SettingsForm.
  return (
    <div className="w-full max-w-6xl mx-auto"> {/* Removed flex and gap, SettingsForm will handle its structure */}
      {!userProfile ? (
        <div className="flex flex-col items-center justify-center h-full"> {/* Centering error message */}
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center text-destructive">
                <AlertTriangle className="mr-2 h-5 w-5" />
                Error Loading Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                We were unable to load your profile information. Please try again later.
                If the issue persists, contact support.
              </p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <SettingsForm initialData={userProfile} userId={session.user.id} />
      )}
    </div>
  );
}
