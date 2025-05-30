// apps/web/src/components/settings/SettingsForm.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
// toast import removed
import type { WebAppUserProfile, WebAppUserProfileUpdatePayload } from '@/types/user';
import { settingsSchema, type SettingsFormData, currencyCodes, notificationFrequencies, type CurrencyCode, type NotificationFrequency } from '@/lib/schemas';
import { CalendarDaysIcon, LogInIcon, ZapIcon, BellRingIcon, CircleDollarSignIcon, SigmaIcon, SaveIcon } from 'lucide-react';

interface SettingsFormProps {
  initialData: WebAppUserProfile | null;
  userId: string;
}

const currencyOptions: { value: CurrencyCode; label: string }[] = [
  { value: 'USD', label: 'USD - United States Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'AUD', label: 'AUD - Australian Dollar' },
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
  { value: 'JPY', label: 'JPY - Japanese Yen' },
  { value: 'INR', label: 'INR - Indian Rupee' },
];

const notificationFrequencyOptions: { value: NotificationFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'none', label: 'None (Turn off)' },
];

const getValidCurrencyOrDefault = (currency?: string | null): CurrencyCode => {
  if (currency && (currencyCodes as readonly string[]).includes(currency)) {
    return currency as CurrencyCode;
  }
  return 'USD';
};

const getValidNotificationFrequencyOrDefault = (freq?: string | null): NotificationFrequency => {
  if (freq && (notificationFrequencies as readonly string[]).includes(freq)) {
    return freq as NotificationFrequency;
  }
  return 'weekly';
};

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

export function SettingsForm({ initialData, userId }: SettingsFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null | undefined>(initialData?.image);

  const [formattedCreatedAt, setFormattedCreatedAt] = useState<string>(
    initialData ? formatDateInternal(initialData.createdAt) : 'Loading...'
  );
  const [formattedLastLoginAt, setFormattedLastLoginAt] = useState<string>(
    initialData ? formatDateInternal(initialData.lastLoginAt) : 'Loading...'
  );

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: initialData?.name || '',
      email: initialData?.email || '',
      notificationFrequency: getValidNotificationFrequencyOrDefault(initialData?.notificationFrequency),
      preferredCurrency: getValidCurrencyOrDefault(initialData?.preferredCurrency),
      displayDecimalPlaces: initialData?.displayDecimalPlaces ?? 2,
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name || '',
        email: initialData.email || '',
        notificationFrequency: getValidNotificationFrequencyOrDefault(initialData.notificationFrequency),
        preferredCurrency: getValidCurrencyOrDefault(initialData.preferredCurrency),
        displayDecimalPlaces: initialData.displayDecimalPlaces ?? 2,
      });
      setProfileImageUrl(initialData.image);
      setFormattedCreatedAt(formatDateInternal(initialData.createdAt));
      setFormattedLastLoginAt(formatDateInternal(initialData.lastLoginAt));
    } else {
      setFormattedCreatedAt('N/A');
      setFormattedLastLoginAt('N/A');
    }
  }, [initialData, form]);

  const onSubmit: SubmitHandler<SettingsFormData> = async (data) => {
    setIsSubmitting(true);
    // Toasts removed
    const updatePayload: WebAppUserProfileUpdatePayload = {
      name: data.name,
      notificationFrequency: data.notificationFrequency,
      preferredCurrency: data.preferredCurrency,
      displayDecimalPlaces: data.displayDecimalPlaces,
    };

    try {
      const response = await fetch(`/api/user-profile/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update settings.');
      }
      const updatedProfileResponse = await response.json();
      console.log('Settings updated successfully!'); // Log success
      if (updatedProfileResponse.data) {
        const updatedData = updatedProfileResponse.data as WebAppUserProfile;
        form.reset({
          name: updatedData.name || '',
          email: updatedData.email || initialData?.email || '',
          notificationFrequency: getValidNotificationFrequencyOrDefault(updatedData.notificationFrequency),
          preferredCurrency: getValidCurrencyOrDefault(updatedData.preferredCurrency),
          displayDecimalPlaces: updatedData.displayDecimalPlaces ?? 2,
        });
        setProfileImageUrl(updatedData.image);
        setFormattedCreatedAt(formatDateInternal(updatedData.createdAt));
        setFormattedLastLoginAt(formatDateInternal(updatedData.lastLoginAt));
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      alert(`Error: ${(error as Error).message || 'An unexpected error occurred.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!initialData && !form.formState.isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Profile Not Loaded</CardTitle><CardDescription>Your profile data could not be loaded.</CardDescription></CardHeader>
      </Card>
    );
  }

  const userInitial = initialData?.name ? initialData.name.charAt(0).toUpperCase() :
                      initialData?.email ? initialData.email.charAt(0).toUpperCase() : '?';

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6 md:gap-8">
      {/* Header Section: Title on Left, Save Button on Right */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">Account Settings</h1>
          <p className="text-md text-muted-foreground mt-1">
            Manage your profile information and application preferences.
          </p>
        </div>
        <div className="mt-4 sm:mt-0"> {/* Ensure button aligns well on mobile too */}
          <Button type="submit" disabled={isSubmitting || !form.formState.isDirty} size="lg">
            <SaveIcon className="mr-2 h-5 w-5" />
            {isSubmitting ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
      
      {/* Main content area with card layout */}
      {/* Row 1: Profile & Account Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        <Card className="h-full flex flex-col"> {/* Profile Card */}
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>This information is displayed on your profile.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 flex-grow">
            <div className="flex items-center gap-6">
              <Avatar className="h-20 w-20 border-2 border-primary/20 shadow-sm shrink-0">
                <AvatarImage src={profileImageUrl ?? undefined} alt={initialData?.name || 'User'} />
                <AvatarFallback className="text-2xl">{userInitial}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-3">
                <div className="space-y-1" suppressHydrationWarning={true}>
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" {...form.register('name')} placeholder="Your full name" className={form.formState.errors.name ? 'border-destructive' : ''} aria-invalid={form.formState.errors.name ? "true" : "false"} />
                  {form.formState.errors.name && <p className="text-sm text-destructive pt-1">{form.formState.errors.name.message}</p>}
                </div>
                <div className="space-y-1" suppressHydrationWarning={true}>
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" {...form.register('email')} readOnly className="bg-muted/30 cursor-not-allowed" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="h-full flex flex-col"> {/* Account Activity Card */}
          <CardHeader>
            <CardTitle>Account Activity</CardTitle>
            <CardDescription>Key dates and activity metrics for your account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 flex-grow">
            <div className="flex items-start space-x-3 p-3 bg-muted/30 rounded-lg border">
              <CalendarDaysIcon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">Registered On</p>
                <p className="text-sm text-muted-foreground">{formattedCreatedAt}</p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 bg-muted/30 rounded-lg border">
              <LogInIcon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">Last Login</p>
                <p className="text-sm text-muted-foreground">{formattedLastLoginAt}</p>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 bg-muted/30 rounded-lg border">
              <ZapIcon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">Daily Streak</p>
                <p className="text-sm text-muted-foreground">
                  {initialData?.dailyStreak !== undefined ? `${initialData.dailyStreak} days` : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Preferences Card (Full Width) */}
      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>Customize your financial display and notification settings.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8 pt-2">
          <div className="space-y-2">
            <Label htmlFor="preferredCurrency" className="flex items-center gap-2 text-base font-medium">
              <CircleDollarSignIcon className="h-5 w-5 text-muted-foreground" /> Preferred Currency
            </Label>
            <Controller name="preferredCurrency" control={form.control} defaultValue={getValidCurrencyOrDefault(initialData?.preferredCurrency)}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger id="preferredCurrency" aria-label="Preferred Currency" className={form.formState.errors.preferredCurrency ? 'border-destructive' : ''}><SelectValue placeholder="Select currency" /></SelectTrigger>
                  <SelectContent>{currencyOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.preferredCurrency && <p className="text-sm text-destructive pt-1">{form.formState.errors.preferredCurrency.message}</p>}
          </div>
          
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-base font-medium">
              <SigmaIcon className="h-5 w-5 text-muted-foreground" /> Display Decimal Places
            </Label>
            <Controller name="displayDecimalPlaces" control={form.control} defaultValue={initialData?.displayDecimalPlaces ?? 2}
              render={({ field }) => (
                <RadioGroup onValueChange={(value) => field.onChange(parseInt(value, 10) as 0 | 2)} value={String(field.value ?? 2)} className="flex items-center space-x-4 pt-2">
                  <div className="flex items-center space-x-2"><RadioGroupItem value="0" id="decimal-0" /><Label htmlFor="decimal-0" className="font-normal cursor-pointer">No decimals</Label></div>
                  <div className="flex items-center space-x-2"><RadioGroupItem value="2" id="decimal-2" /><Label htmlFor="decimal-2" className="font-normal cursor-pointer">Two decimals</Label></div>
                </RadioGroup>
              )}
            />
            {form.formState.errors.displayDecimalPlaces && <p className="text-sm text-destructive pt-1">{form.formState.errors.displayDecimalPlaces.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notificationFrequency" className="flex items-center gap-2 text-base font-medium">
              <BellRingIcon className="h-5 w-5 text-muted-foreground" /> Notification Frequency
            </Label>
            <Controller name="notificationFrequency" control={form.control} defaultValue={getValidNotificationFrequencyOrDefault(initialData?.notificationFrequency)}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger id="notificationFrequency" aria-label="Notification Frequency" className={form.formState.errors.notificationFrequency ? 'border-destructive' : ''}><SelectValue placeholder="Select frequency" /></SelectTrigger>
                  <SelectContent>{notificationFrequencyOptions.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.notificationFrequency && <p className="text-sm text-destructive pt-1">{form.formState.errors.notificationFrequency.message}</p>}
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
