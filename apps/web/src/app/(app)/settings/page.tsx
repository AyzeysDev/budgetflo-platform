// apps/web/src/app/(app)/settings/page.tsx
import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

import { 
  Settings as SettingsIconLucide, 
  Shield, 
  CalendarDaysIcon, 
  LogInIcon, 
  ZapIcon, 
  Sparkles,
  User as UserIcon, // For Security section
  AlertTriangleIcon
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import SettingsForm from '@/components/forms/SettingsForm'; 
import type { WebAppUserProfile } from '@/types/user';

export const metadata: Metadata = {
  title: 'Account Settings | BudgetFlo',
  description: 'Manage your BudgetFlo account settings and profile information.',
};

async function getUserProfileData(userId: string, cookieHeader: string | null): Promise<WebAppUserProfile | null> {
  const baseUrl = process.env.NEXTAUTH_URL_INTERNAL || process.env.NEXTAUTH_URL;
  if (!baseUrl) {
    console.error("SettingsPage (getUserProfileData): NEXTAUTH_URL or NEXTAUTH_URL_INTERNAL is not set.");
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
      console.error(`SettingsPage (getUserProfileData): Failed to fetch user profile for ${userId}. Status: ${response.status}. Body: ${errorBody.substring(0, 300)}`);
      return null;
    }
    const profileData = await response.json();
    return profileData as WebAppUserProfile; 
  } catch (error) {
    console.error(`SettingsPage (getUserProfileData): Exception fetching user profile for ${userId}:`, error);
    return null;
  }
}

const formatDateInternal = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch (e) {
    console.error("Error formatting date:", e, "Input:", dateString);
    return 'Invalid Date';
  }
};

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/?callbackUrl=/settings#hero-section'); 
  }

  const userId = session.user.id;
  const requestHeaders = await headers(); 
  const cookieHeader = requestHeaders.get('cookie'); 

  const userProfile = await getUserProfileData(userId, cookieHeader);

  if (!userProfile) {
    return (
      <div className="flex flex-col gap-6 md:gap-8 p-4 sm:p-6 md:p-8">
        {/* Simplified Header for error state, as SettingsForm won't render */}
         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                Account Settings
                </h1>
            </div>
        </div>
        <Card className="w-full max-w-lg mx-auto mt-8 border-destructive bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertTriangleIcon className="mr-2 h-6 w-6" />
              Error Loading Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive-foreground">
              We encountered an issue loading your profile information. Please try refreshing the page.
              If the problem persists, please contact support.
            </p>
            {/* Next.js Link for navigation is better than redirect here for user action */}
            <Button variant="outline" className="mt-4" asChild>
                <a href="/settings">Refresh Page</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const accountActivityDetails = [
    { label: "Account Created", value: formatDateInternal(userProfile.createdAt), icon: CalendarDaysIcon },
    { label: "Last Login", value: formatDateInternal(userProfile.lastLoginAt), icon: LogInIcon },
    { label: "User ID", value: userProfile.id, icon: ZapIcon, isMono: true },
    { label: "Daily Streak", value: `${userProfile.dailyStreak || 0} day(s)`, icon: Sparkles },
    { label: "Settings Last Updated", value: formatDateInternal(userProfile.settingsLastUpdatedAt), icon: SettingsIconLucide },
  ];
  
  const securityFeaturesComingSoon = [
    { name: 'Two-Factor Authentication', icon: Shield },
    { name: 'Connected Accounts Management', icon: UserIcon }, // Changed icon for variety
    { name: 'Download Your Data', icon: CalendarDaysIcon },
  ];

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      {/* SettingsForm now includes its own header (title, description, save button) 
          and the first row of cards (Profile Info, App Preferences) */}
      <SettingsForm userProfile={userProfile} userId={userId} />

      {/* Row 2: Account Activity and Security & Privacy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Account Activity Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIconLucide className="h-6 w-6 text-primary" />
              Account Activity
            </CardTitle>
            <CardDescription>Key dates and activity metrics for your account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {accountActivityDetails.map((detail) => (
              <div key={detail.label} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border text-sm">
                <div className="flex items-center gap-3">
                  <detail.icon className="h-5 w-5 text-muted-foreground" />
                  <p className="font-medium text-foreground">{detail.label}</p>
                </div>
                <p className={detail.isMono ? "text-muted-foreground font-mono" : "text-muted-foreground"}>{detail.value}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Security & Privacy Card */}
        <Card className="lg:col-span-1 bg-gradient-to-br from-primary/5 via-background to-background dark:from-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Shield className="h-6 w-6" />
              Security & Privacy
            </CardTitle>
            <CardDescription>Upcoming features to enhance your account security.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {securityFeaturesComingSoon.map((feature) => (
               <div key={feature.name} className="p-3 border border-dashed border-primary/30 rounded-lg bg-primary/5">
                  <h4 className="font-semibold text-sm flex items-center gap-1.5">
                    <feature.icon className="h-4 w-4"/>
                    {feature.name}:
                  </h4>
                  <p className="text-xs text-muted-foreground">This feature is planned for a future update.</p>
                </div>
            ))}
            <Button variant="outline" className="w-full mt-4" disabled>
              Manage Security Options (Coming Soon)
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
