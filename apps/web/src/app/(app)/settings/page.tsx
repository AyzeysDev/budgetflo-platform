import type { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  SaveIcon,
  User,
  Settings,
  Shield,
  Bell,
  CalendarDaysIcon,
  LogInIcon,
  ZapIcon,
  BellRingIcon,
  CircleDollarSignIcon,
  SigmaIcon,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { headers } from 'next/headers';
import type { WebAppUserProfile } from '@/types/user';

export const metadata: Metadata = {
  title: 'Account Settings | BudgetFlo',
  description: 'Manage your BudgetFlo account settings and profile information.',
};

// Mock data for demonstration - replace with actual data fetching
const mockCurrencyOptions = [
  { value: 'USD', label: 'USD - United States Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'AUD', label: 'AUD - Australian Dollar' },
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
  { value: 'JPY', label: 'JPY - Japanese Yen' },
  { value: 'INR', label: 'INR - Indian Rupee' },
];

const mockNotificationOptions = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'none', label: 'None (Turn off)' },
];

const mockSecurityFeatures = [
  { name: 'Two-Factor Auth', status: 'Disabled', icon: Shield },
  { name: 'Data Export', status: 'Available', icon: CalendarDaysIcon },
  { name: 'Privacy Mode', status: 'Standard', icon: ZapIcon },
];

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

const formatDateInternal = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-CA', {
      year: 'numeric', month: '2-digit', day: '2-digit',
    });
  } catch (e) {
    console.error("Error formatting date:", e);
    return 'Invalid Date';
  }
};

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    console.log("SettingsPage: No session found, redirecting to login.");
    redirect('/?callbackUrl=/settings#hero-section');
  }

  const requestHeaders = await headers();
  const cookieHeader = requestHeaders.get('cookie');
  const userProfile = await getUserProfile(session.user.id, cookieHeader);

  if (!userProfile) {
    return (
      <div className="flex flex-col gap-6 md:gap-8">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <Shield className="mr-2 h-5 w-5" />
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
    );
  }

  const userInitial = userProfile?.name ? userProfile.name.charAt(0).toUpperCase() :
                      userProfile?.email ? userProfile.email.charAt(0).toUpperCase() : '?';

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
            Account Settings
          </h1>
          <p className="text-md text-muted-foreground mt-1">
            Manage your profile information and application preferences.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="lg">
            <SaveIcon className="mr-2 h-4 w-4" /> Save Settings
          </Button>
        </div>
      </div>

      {/* Key Profile Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Account Status</CardDescription>
            <CardTitle className="text-3xl text-green-600">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Verified account</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Member Since</CardDescription>
            <CardTitle className="text-3xl text-primary">{formatDateInternal(userProfile.createdAt)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Registration date</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Last Login</CardDescription>
            <CardTitle className="text-3xl text-blue-600">{formatDateInternal(userProfile.lastLoginAt)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Recent activity</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Preferred Currency</CardDescription>
            <CardTitle className="text-3xl text-orange-600">{userProfile.preferredCurrency || 'USD'}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Display currency</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area - Grid for Profile, Account, Preferences, Security */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Column 1: Profile & Account Settings */}
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-6 w-6 text-primary" />
                Profile Information
              </CardTitle>
              <CardDescription>Update your personal details and display information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Section */}
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20 border-2 border-primary/20 shadow-sm shrink-0">
                  <AvatarImage src={userProfile.image ?? undefined} alt={userProfile.name || 'User'} />
                  <AvatarFallback className="text-2xl">{userInitial}</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input 
                      id="name" 
                      defaultValue={userProfile.name || ''}
                      placeholder="Your full name" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      defaultValue={userProfile.email || ''}
                      readOnly 
                      className="bg-muted/30 cursor-not-allowed" 
                    />
                    <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-6 w-6 text-primary" />
                Account Activity
              </CardTitle>
              <CardDescription>Key dates and activity metrics for your account.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                <div className="flex items-center gap-3">
                  <CalendarDaysIcon className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Account Created</p>
                    <p className="text-xs text-muted-foreground">{formatDateInternal(userProfile.createdAt)}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                <div className="flex items-center gap-3">
                  <LogInIcon className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Last Login</p>
                    <p className="text-xs text-muted-foreground">{formatDateInternal(userProfile.lastLoginAt)}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                <div className="flex items-center gap-3">
                  <ZapIcon className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">User ID</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {userProfile.id || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Application Preferences */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CircleDollarSignIcon className="h-6 w-6 text-primary" />
                Application Preferences
              </CardTitle>
              <CardDescription>Customize your financial display and notification settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Preferred Currency */}
              <div className="space-y-2">
                <Label htmlFor="preferredCurrency" className="flex items-center gap-2 text-base font-medium">
                  <CircleDollarSignIcon className="h-5 w-5 text-muted-foreground" /> 
                  Preferred Currency
                </Label>
                <Select defaultValue={userProfile.preferredCurrency || 'USD'}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockCurrencyOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Display Decimal Places */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-base font-medium">
                  <SigmaIcon className="h-5 w-5 text-muted-foreground" /> 
                  Display Decimal Places
                </Label>
                <div className="flex items-center space-x-6 pt-2">
                  <div className="flex items-center space-x-2">
                    <input type="radio" name="decimal" value="0" id="decimal-0" defaultChecked={userProfile.displayDecimalPlaces === 0} />
                    <Label htmlFor="decimal-0" className="font-normal cursor-pointer">No decimals</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="radio" name="decimal" value="2" id="decimal-2" defaultChecked={userProfile.displayDecimalPlaces === 2} />
                    <Label htmlFor="decimal-2" className="font-normal cursor-pointer">Two decimals</Label>
                  </div>
                </div>
              </div>

              {/* Notification Frequency */}
              <div className="space-y-2">
                <Label htmlFor="notificationFrequency" className="flex items-center gap-2 text-base font-medium">
                  <BellRingIcon className="h-5 w-5 text-muted-foreground" /> 
                  Notification Frequency
                </Label>
                <Select defaultValue={userProfile.notificationFrequency || 'weekly'}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockNotificationOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Column 2: Security & Additional Features */}
        <div className="lg:col-span-1 space-y-6 md:space-y-8">
          {/* Security & Privacy */}
          <Card className="bg-gradient-to-br from-primary/5 via-background to-background dark:from-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Sparkles className="h-6 w-6" />
                Security & Privacy
              </CardTitle>
              <CardDescription>Manage your account security and privacy settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 border border-dashed border-primary/30 rounded-lg bg-primary/5">
                <h4 className="font-semibold text-sm flex items-center gap-1.5">
                  <Shield className="h-4 w-4"/>
                  Coming Soon:
                </h4>
                <p className="text-xs text-muted-foreground">Two-factor authentication and enhanced security features.</p>
              </div>
              <div className="p-3 border border-dashed border-primary/30 rounded-lg bg-primary/5">
                <h4 className="font-semibold text-sm flex items-center gap-1.5">
                  <CalendarDaysIcon className="h-4 w-4"/>
                  Data Export:
                </h4>
                <p className="text-xs text-muted-foreground">Request a copy of your financial data for backup purposes.</p>
              </div>
              <Button variant="ghost" className="w-full text-primary hover:text-primary/90" disabled>
                View Security Options
              </Button>
            </CardContent>
          </Card>

          {/* Additional Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-6 w-6 text-primary" />
                Additional Settings
              </CardTitle>
              <CardDescription>More configuration options and advanced features.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {mockSecurityFeatures.map((feature) => (
                <div key={feature.name}>
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <div className="flex items-center gap-2">
                      <feature.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{feature.name}</span>
                    </div>
                    <span className="text-xs bg-muted px-2 py-1 rounded">{feature.status}</span>
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full mt-4" disabled>
                Manage Additional Settings
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}