// apps/web/src/components/settings/SettingsForm.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form'; // Controller is not needed if Switch is removed
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import type { WebAppUserProfile, WebAppUserProfileUpdatePayload } from '@/types/user';
import { settingsSchema, type SettingsFormData } from '@/lib/schemas';
import { CalendarDaysIcon, LogInIcon } from 'lucide-react'; // CameraIcon removed

interface SettingsFormProps {
  initialData: WebAppUserProfile | null;
  userId: string;
}

export function SettingsForm({ initialData, userId }: SettingsFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  // profileImageUrl is still used for displaying the avatar from initialData
  const [profileImageUrl, setProfileImageUrl] = useState<string | null | undefined>(initialData?.image);

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      name: initialData?.name || '',
      email: initialData?.email || '', // Email is read-only
      bio: initialData?.bio || '',
      // 'image' field is removed from the form data as it's not directly editable here
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name || '',
        email: initialData.email || '',
        bio: initialData.bio || '',
      });
      setProfileImageUrl(initialData.image); // Keep updating display image from initialData
    }
  }, [initialData, form]);

  const onSubmit = async (data: SettingsFormData) => {
    setIsSubmitting(true);
    toast.loading('Updating profile...', { id: 'update-profile' });

    // Only include fields that are meant to be updated. 'image' is no longer part of this form's direct update.
    const updatePayload: WebAppUserProfileUpdatePayload = {
      name: data.name,
      bio: data.bio,
      // image field is removed from payload as it's not editable here
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
        throw new Error(errorData.error || 'Failed to update profile.');
      }

      const updatedProfileResponse = await response.json();
      toast.success('Profile updated successfully!', { id: 'update-profile' });

      if (updatedProfileResponse.data) {
        const updatedData = updatedProfileResponse.data as WebAppUserProfile;
        form.reset({ // Reset form with potentially backend-modified data
          name: updatedData.name || '',
          email: updatedData.email || initialData?.email || '', // Keep original email
          bio: updatedData.bio || '',
        });
        setProfileImageUrl(updatedData.image); // Update displayed image if backend returns it
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error((error as Error).message || 'An unexpected error occurred.', { id: 'update-profile' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
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
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Manage your public profile and personal information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            {/* Avatar display remains */}
            <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-2 border-primary/20 shadow-md">
              <AvatarImage src={profileImageUrl ?? undefined} alt={initialData.name || 'User'} />
              <AvatarFallback className="text-3xl sm:text-4xl">{userInitial}</AvatarFallback>
            </Avatar>
            {/* Profile picture change button is removed */}
            <div className="flex-1 w-full space-y-4">
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
                  className="bg-muted/50 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              {...form.register('bio')}
              placeholder="Tell us a little about yourself (optional)."
              rows={3}
              className={form.formState.errors.bio ? 'border-destructive' : ''}
              aria-invalid={form.formState.errors.bio ? "true" : "false"}
            />
            {form.formState.errors.bio && (
              <p className="text-sm text-destructive pt-1">{form.formState.errors.bio.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Details about your account activity.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-md">
            <CalendarDaysIcon className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">Registered On</p>
              <p className="text-sm text-muted-foreground">{formatDate(initialData.createdAt)}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-md">
            <LogInIcon className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium text-foreground">Last Login</p>
              <p className="text-sm text-muted-foreground">{formatDate(initialData.lastLoginAt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <CardFooter className="flex justify-end border-t pt-6 mt-8">
        <Button type="submit" disabled={isSubmitting || !form.formState.isDirty} size="lg">
          {isSubmitting ? 'Saving Changes...' : 'Save All Changes'}
        </Button>
      </CardFooter>
    </form>
  );
}
