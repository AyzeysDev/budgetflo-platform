// apps/web/src/components/forms/SettingsForm.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  SaveIcon, 
  User, 
  Mail, 
  BookText, 
  BellRingIcon, 
  CircleDollarSignIcon, 
  SigmaIcon,
  Loader2
} from 'lucide-react';
import { 
  userSettingsFormSchema, 
  UserSettingsFormData,
  currencyCodes, 
  CurrencyCode, 
  notificationFrequencies,
  NotificationFrequency 
} from '@/lib/schemas'; 
import type { WebAppUserProfile, WebAppUserSettingsUpdatePayload } from '@/types/user';

interface SettingsFormProps {
  userProfile: WebAppUserProfile; 
  userId: string;
}

const getInitials = (name?: string | null, email?: string | null): string => {
  if (name) return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  if (email) return email.charAt(0).toUpperCase();
  return '?';
};

const getValidCurrencyCode = (currency?: string | null): CurrencyCode | undefined => {
  if (!currency) return undefined;
  return currencyCodes.includes(currency as CurrencyCode) ? currency as CurrencyCode : undefined;
};

const getValidNotificationFrequency = (frequency?: string | null): NotificationFrequency | undefined => {
  if (!frequency) return undefined;
  return notificationFrequencies.includes(frequency as NotificationFrequency) ? frequency as NotificationFrequency : undefined;
};

const mapProfileToFormData = (profile: WebAppUserProfile): UserSettingsFormData => {
  return {
    displayName: profile.nameToDisplay || '',
    bio: profile.bio || '',
    notificationFrequency: getValidNotificationFrequency(profile.notificationFrequency) || 'weekly',
    preferredCurrency: getValidCurrencyCode(profile.preferredCurrency) || 'USD',
    displayDecimalPlaces: profile.displayDecimalPlaces === 0 ? 0 : 2,
  };
};

export default function SettingsForm({ userProfile, userId }: SettingsFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<WebAppUserProfile>(userProfile);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<UserSettingsFormData>({
    resolver: zodResolver(userSettingsFormSchema),
    defaultValues: mapProfileToFormData(userProfile),
  });

  useEffect(() => {
    setCurrentProfile(userProfile);
    reset(mapProfileToFormData(userProfile));
  }, [userProfile, reset]);

  const onSubmit = async (data: UserSettingsFormData) => {
    if (!isDirty) {
      toast.info("No changes to save.");
      return;
    }
    setIsSubmitting(true);
    const toastId = toast.loading("Saving settings...");

    const payload: WebAppUserSettingsUpdatePayload = {
      displayName: data.displayName,
      bio: data.bio,
      notificationFrequency: data.notificationFrequency,
      preferredCurrency: data.preferredCurrency,
      displayDecimalPlaces: data.displayDecimalPlaces,
    };

    try {
      const response = await fetch(`/api/user-profile/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      toast.dismiss(toastId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update settings.');
      }

      const updatedProfileFromServer: WebAppUserProfile = await response.json(); 
      
      setCurrentProfile(updatedProfileFromServer); 
      reset(mapProfileToFormData(updatedProfileFromServer)); 

      toast.success('Settings saved successfully!');
    } catch (error) {
      toast.dismiss(toastId);
      toast.error((error as Error).message || 'An unexpected error occurred.');
      console.error("Error saving settings:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const userInitial = getInitials(currentProfile.nameToDisplay, currentProfile.email);

  return (
    // The form now wraps the header and the first row of cards
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 md:space-y-8">
      {/* Page Header Section (rendered by the form component) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
            Account Settings
          </h1>
          <p className="text-md text-muted-foreground mt-1">
            Manage your profile, preferences, and security settings.
          </p>
        </div>
        <div className="flex gap-2 sm:ml-auto"> {/* Aligns button to the right on larger screens */}
          <Button type="submit" size="lg" disabled={isSubmitting || !isDirty}>
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <SaveIcon className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Row 1: Profile Information and Application Preferences */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Profile Information Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-6 w-6 text-primary" />
              Profile Information
            </CardTitle>
            <CardDescription>Update your personal details and display information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <Avatar className="h-24 w-24 sm:h-28 sm:w-28 border-2 border-primary/20 shadow-sm shrink-0">
                <AvatarImage src={currentProfile.imageToDisplay ?? undefined} alt={currentProfile.nameToDisplay || 'User'} />
                <AvatarFallback className="text-3xl">{userInitial}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-4 w-full">
                <div className="space-y-1.5">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    {...register('displayName')}
                    placeholder="Your preferred display name"
                    aria-invalid={errors.displayName ? "true" : "false"}
                  />
                  {errors.displayName && <p className="text-sm text-destructive">{errors.displayName.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="flex items-center gap-2">
                     <Mail className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={currentProfile.email || ''} 
                      readOnly
                      className="bg-muted/30 cursor-not-allowed border-dashed"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Email is linked to your Google account and cannot be changed here.</p>
                </div>
              </div>
            </div>
             <div className="space-y-1.5">
              <Label htmlFor="bio" className="flex items-center gap-2">
                <BookText className="h-4 w-4 text-muted-foreground" />
                Bio
              </Label>
              <Textarea
                id="bio"
                {...register('bio')}
                placeholder="Tell us a little about yourself (optional)"
                rows={3}
                aria-invalid={errors.bio ? "true" : "false"}
              />
              {errors.bio && <p className="text-sm text-destructive">{errors.bio.message}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Application Preferences Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CircleDollarSignIcon className="h-6 w-6 text-primary" />
              Application Preferences
            </CardTitle>
            <CardDescription>Customize your financial display and notification settings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-1.5">
              <Label htmlFor="preferredCurrency" className="flex items-center gap-2">
                <CircleDollarSignIcon className="h-4 w-4 text-muted-foreground" />
                Preferred Currency
              </Label>
              <Controller
                name="preferredCurrency"
                control={control}
                render={({ field }) => (
                  <Select 
                    onValueChange={(value: string) => field.onChange(value as CurrencyCode)}
                    value={field.value || undefined} 
                  >
                    <SelectTrigger id="preferredCurrency" aria-invalid={errors.preferredCurrency ? "true" : "false"}>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {currencyCodes.map(code => (
                        <SelectItem key={code} value={code}>
                          {code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.preferredCurrency && <p className="text-sm text-destructive">{errors.preferredCurrency.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="flex items-center gap-2">
                <SigmaIcon className="h-4 w-4 text-muted-foreground" />
                Display Decimal Places
              </Label>
              <Controller
                name="displayDecimalPlaces"
                control={control}
                render={({ field }) => (
                  <RadioGroup
                    onValueChange={(val) => field.onChange(parseInt(val,10) as 0 | 2)}
                    value={String(field.value ?? 2)} 
                    className="flex items-center space-x-6 pt-1"
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
              {errors.displayDecimalPlaces && <p className="text-sm text-destructive">{errors.displayDecimalPlaces.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notificationFrequency" className="flex items-center gap-2">
                <BellRingIcon className="h-4 w-4 text-muted-foreground" />
                Notification Frequency
              </Label>
              <Controller
                name="notificationFrequency"
                control={control}
                render={({ field }) => (
                  <Select 
                    onValueChange={(value: string) => field.onChange(value as NotificationFrequency)} 
                    value={field.value || undefined}
                  >
                    <SelectTrigger id="notificationFrequency" aria-invalid={errors.notificationFrequency ? "true" : "false"}>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      {notificationFrequencies.map(freq => (
                        <SelectItem key={freq} value={freq}>
                          {freq.charAt(0).toUpperCase() + freq.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.notificationFrequency && <p className="text-sm text-destructive">{errors.notificationFrequency.message}</p>}
            </div>
          </CardContent>
        </Card>
      </div>
      {/* The submit button is now part of the header rendered by this form component */}
    </form>
  );
}
