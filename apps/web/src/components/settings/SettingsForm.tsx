// apps/web/src/components/settings/SettingsForm.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
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
import { toast } from 'sonner';
import type { WebAppUserProfile, WebAppUserProfileUpdatePayload } from '@/types/user';
import { settingsSchema, type SettingsFormData, currencyCodes, notificationFrequencies, type CurrencyCode, type NotificationFrequency } from '@/lib/schemas';
import { CalendarDaysIcon, LogInIcon, ZapIcon, BellRingIcon, CircleDollarSignIcon, SigmaIcon } from 'lucide-react';

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

// Helper to get a valid currency or a default
const getValidCurrencyOrDefault = (currency?: string | null): CurrencyCode => {
  if (currency && (currencyCodes as readonly string[]).includes(currency)) {
    return currency as CurrencyCode;
  }
  return 'USD'; // Default currency
};

// Helper to get a valid notification frequency or a default
const getValidNotificationFrequencyOrDefault = (freq?: string | null): NotificationFrequency => {
  if (freq && (notificationFrequencies as readonly string[]).includes(freq)) {
    return freq as NotificationFrequency;
  }
  return 'weekly'; // Default frequency
};


export function SettingsForm({ initialData, userId }: SettingsFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null | undefined>(initialData?.image);

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
    }
  }, [initialData, form]);

  const onSubmit: SubmitHandler<SettingsFormData> = async (data) => {
    setIsSubmitting(true);
    toast.loading('Updating settings...', { id: 'update-settings' });

    const updatePayload: WebAppUserProfileUpdatePayload = {
      name: data.name,
      notificationFrequency: data.notificationFrequency,
      preferredCurrency: data.preferredCurrency,
      displayDecimalPlaces: data.displayDecimalPlaces,
    };

    try {
      const response = await fetch(`/api/user-profile/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update settings.');
      }

      const updatedProfileResponse = await response.json();
      toast.success('Settings updated successfully!', { id: 'update-settings' });

      if (updatedProfileResponse.data) {
        const updatedData = updatedProfileResponse.data as WebAppUserProfile;
        form.reset({
          name: updatedData.name || '',
          email: updatedData.email || initialData?.email || '',
          notificationFrequency: getValidNotificationFrequencyOrDefault(updatedData.notificationFrequency),
          preferredCurrency: getValidCurrencyOrDefault(updatedData.preferredCurrency),
          displayDecimalPlaces: updatedData.displayDecimalPlaces ?? 2,
        });
        setProfileImageUrl(updatedData.image); // Update displayed image if backend returns it
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error((error as Error).message || 'An unexpected error occurred.', { id: 'update-settings' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric',
      });
    } catch (e) {
      console.error("Error formatting date:", e);
      return 'Invalid Date';
    }
  };

  if (!initialData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profile Not Loaded</CardTitle>
          <CardDescription>Your profile data could not be loaded. Please try refreshing the page.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const userInitial = initialData.name ? initialData.name.charAt(0).toUpperCase() :
                      initialData.email ? initialData.email.charAt(0).toUpperCase() : '?';

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>This information is displayed on your profile.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20 border-2 border-primary/20 shadow-sm">
              <AvatarImage src={profileImageUrl ?? undefined} alt={initialData.name || 'User'} />
              <AvatarFallback className="text-2xl">{userInitial}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-3">
              <div className="space-y-1">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  {...form.register('name')}
                  placeholder="Your full name"
                  className={form.formState.errors.name ? 'border-destructive' : ''}
                  aria-invalid={form.formState.errors.name ? "true" : "false"}
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive pt-1">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  {...form.register('email')}
                  readOnly
                  className="bg-muted/30 cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Activity Section */}
      <Card>
        <CardHeader>
          <CardTitle>Account Activity</CardTitle>
          <CardDescription>Key dates and activity metrics for your account.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex items-start space-x-3 p-4 bg-muted/30 rounded-lg border">
            <CalendarDaysIcon className="h-6 w-6 text-primary mt-1 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">Registered On</p>
              <p className="text-sm text-muted-foreground">{formatDate(initialData.createdAt)}</p>
            </div>
          </div>
          <div className="flex items-start space-x-3 p-4 bg-muted/30 rounded-lg border">
            <LogInIcon className="h-6 w-6 text-primary mt-1 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">Last Login</p>
              <p className="text-sm text-muted-foreground">{formatDate(initialData.lastLoginAt)}</p>
            </div>
          </div>
          <div className="flex items-start space-x-3 p-4 bg-muted/30 rounded-lg border">
            <ZapIcon className="h-6 w-6 text-primary mt-1 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">Daily Streak</p>
              <p className="text-sm text-muted-foreground">
                {initialData.dailyStreak !== undefined ? `${initialData.dailyStreak} days` : 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preferences Section */}
      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>Customize your financial display and notification settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-2">
          <div className="space-y-2">
            <Label htmlFor="preferredCurrency" className="flex items-center gap-2 text-base font-medium">
              <CircleDollarSignIcon className="h-5 w-5 text-muted-foreground" /> Preferred Currency
            </Label>
            <Controller
              name="preferredCurrency"
              control={form.control}
              defaultValue={getValidCurrencyOrDefault(initialData?.preferredCurrency)}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}> {/* Ensure field.value is valid */}
                  <SelectTrigger id="preferredCurrency" aria-label="Preferred Currency" className={form.formState.errors.preferredCurrency ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencyOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.preferredCurrency && (
              <p className="text-sm text-destructive pt-1">{form.formState.errors.preferredCurrency.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-base font-medium">
              <SigmaIcon className="h-5 w-5 text-muted-foreground" /> Display Decimal Places
            </Label>
            <Controller
              name="displayDecimalPlaces"
              control={form.control}
              defaultValue={initialData?.displayDecimalPlaces ?? 2}
              render={({ field }) => (
                <RadioGroup
                  onValueChange={(value) => field.onChange(parseInt(value, 10) as 0 | 2)}
                  value={String(field.value ?? 2)}
                  className="flex flex-col sm:flex-row gap-x-6 gap-y-3 pt-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="0" id="decimal-0" />
                    <Label htmlFor="decimal-0" className="font-normal cursor-pointer">No decimals (e.g., $100)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="2" id="decimal-2" />
                    <Label htmlFor="decimal-2" className="font-normal cursor-pointer">Two decimals (e.g., $100.00)</Label>
                  </div>
                </RadioGroup>
              )}
            />
             {form.formState.errors.displayDecimalPlaces && (
              <p className="text-sm text-destructive pt-1">{form.formState.errors.displayDecimalPlaces.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notificationFrequency" className="flex items-center gap-2 text-base font-medium">
              <BellRingIcon className="h-5 w-5 text-muted-foreground" /> Notification Frequency
            </Label>
            <Controller
              name="notificationFrequency"
              control={form.control}
              defaultValue={getValidNotificationFrequencyOrDefault(initialData?.notificationFrequency)}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}> {/* Ensure field.value is valid */}
                  <SelectTrigger id="notificationFrequency" aria-label="Notification Frequency" className={form.formState.errors.notificationFrequency ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    {notificationFrequencyOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {form.formState.errors.notificationFrequency && (
              <p className="text-sm text-destructive pt-1">{form.formState.errors.notificationFrequency.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <CardFooter className="flex justify-end border-t pt-6 mt-8">
        <Button type="submit" disabled={isSubmitting || !form.formState.isDirty} size="lg">
          {isSubmitting ? 'Saving Settings...' : 'Save Settings'}
        </Button>
      </CardFooter>
    </form>
  );
}
