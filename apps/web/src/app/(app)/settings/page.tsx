// apps/web/src/app/(app)/settings/page.tsx
"use client";

import React, { useEffect, useState, useRef } from 'react'; // Added useRef
import { useSession } from 'next-auth/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from "sonner";

interface UserData {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  createdAt?: string | null;
  lastLoginAt?: string | null;
  bio?: string | null;
  prefersDarkMode?: boolean | null;
  profileLastUpdatedAt?: string | null;
}

export default function SettingsPage() {
  const { data: session, status, update: updateNextAuthSession } = useSession();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start true for initial load
  const [isSaving, setIsSaving] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [userBio, setUserBio] = useState('');

  // Ref to track if the initial fetch for the current user has been attempted
  const initialFetchAttemptedForUser = useRef<string | null>(null);

  useEffect(() => {
    console.log("[SettingsPage useEffect] Status:", status, "Session User ID:", session?.user?.id);

    if (status === 'authenticated' && session?.user?.id) {
      const currentUserId = session.user.id;

      // Only fetch if:
      // 1. userData is null (initial load for the page component instance)
      // 2. Or, if the session user ID has changed AND we haven't attempted to fetch for this new ID yet.
      // 3. Or, if userData is loaded but for a *different* user (edge case, but good check)
      if (!userData || userData.id !== currentUserId || initialFetchAttemptedForUser.current !== currentUserId) {
        
        console.log(`[SettingsPage useEffect] Conditions met for fetching. Current UserData ID: ${userData?.id}, Session User ID: ${currentUserId}`);
        initialFetchAttemptedForUser.current = currentUserId; // Mark that we are attempting fetch for this user

        const userIdForApi = currentUserId; // Already confirmed it should be a string by next-auth.d.ts

        if (typeof userIdForApi !== 'string' || !userIdForApi) {
          console.error("SettingsPage: User ID from session is not a valid string:", userIdForApi);
          toast.error("Error: Could not load profile due to an invalid user identifier.");
          setIsLoading(false);
          return;
        }
        
        if (userIdForApi === '[object Object]') {
          console.error("SettingsPage: userIdForApi became '[object Object]'. This indicates a type mismatch or error in session construction.");
          toast.error("Error: Critical issue forming user ID for API call.");
          setIsLoading(false);
          return;
        }

        const fetchUserData = async () => {
          setIsLoading(true); // Set loading true before fetch
          console.log("[SettingsPage fetchUserData] Calling API with userId:", userIdForApi);
          try {
            const response = await fetch(`/api/user-profile/${userIdForApi}`);
            if (!response.ok) {
              const errorData = await response.json();
              console.error("[SettingsPage fetchUserData] API Error Response:", errorData);
              throw new Error(errorData.error || 'User not found or failed to fetch user data');
            }
            const data: UserData = await response.json();
            console.log("[SettingsPage fetchUserData] API Success Response:", data);
            setUserData(data);
            setDisplayName(data.name || '');
            setUserBio(data.bio || '');
          } catch (error) {
            console.error("Error fetching user data:", error);
            toast.error((error as Error).message || "Could not load your profile.");
            setUserData(null); // Clear data on error
          } finally {
            setIsLoading(false);
          }
        };
        fetchUserData();
      } else {
        console.log("[SettingsPage useEffect] Skipping fetch: User data already loaded for user ID:", currentUserId);
        setIsLoading(false); // Ensure loading is false if we skip fetch but were previously loading
      }
    } else if (status === 'unauthenticated') {
      console.log("[SettingsPage useEffect] User unauthenticated.");
      setIsLoading(false);
      setUserData(null); // Clear user data if unauthenticated
    } else if (status === "loading") {
      console.log("[SettingsPage useEffect] Session status is loading.");
      // setIsLoading(true); // isLoading is true by default or set by fetchUserData
    }
  }, [session, status, userData]); // Added userData to dependency array

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id || !userData) {
        toast.error("Error: User session not found or ID is missing.");
        return;
    }
    
    const userIdForApi = session.user.id;

    if (typeof userIdForApi !== 'string' || !userIdForApi) {
        toast.error("Error: Cannot update profile due to an invalid user identifier in session.");
        return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: displayName,
        bio: userBio,
      };
      const response = await fetch(`/api/user-profile/${userIdForApi}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile.');
      }
      const updatedData: UserData = await response.json();
      setUserData(updatedData);
      setDisplayName(updatedData.name || '');
      setUserBio(updatedData.bio || '');
      toast.success("Profile updated successfully!");

      if (session.user && (session.user.name !== updatedData.name || session.user.image !== updatedData.image)) {
        await updateNextAuthSession();
      }

    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error((error as Error).message || "Could not update your profile.");
    } finally {
      setIsSaving(false);
    }
  };

  if (status === 'loading' && isLoading) { // Show loading if session is loading AND we are in an isLoading state
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="ml-3 text-muted-foreground">Loading your settings...</p>
      </div>
    );
  }

  if (!session && status !== 'loading') { // If no session and not loading, means unauthenticated or error
    return (
      <div className="text-center">
        <p className="text-destructive">Access Denied.</p>
        <p className="text-sm text-muted-foreground">Please log in to view your settings.</p>
      </div>
    );
  }
  
  if (session && !userData && !isLoading) { // Session exists, but userData fetch failed or not found
     return (
      <div className="text-center">
        <p className="text-destructive">Could not load user profile data.</p>
        <p className="text-sm text-muted-foreground">User found in session, but profile data missing from database or API error. Please try refreshing. If the issue persists, contact support.</p>
      </div>
    );
  }
  
  if (!userData && isLoading) { // Still in initial loading state for userData specifically
     return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="ml-3 text-muted-foreground">Fetching profile details...</p>
      </div>
    );
  }

  if (!userData) { // Fallback if userData is still null after all checks (should be rare)
      return <div className="text-center"><p>No user data available.</p></div>;
  }


  const userInitial = userData.name ? userData.name.charAt(0).toUpperCase() :
                      userData.email ? userData.email.charAt(0).toUpperCase() : '?';

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="text-center md:text-left">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">Account Settings</h1>
        <p className="text-md text-muted-foreground mt-1">
          Manage your profile information and application preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>Update your personal details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={userData.image ?? undefined} alt={userData.name ?? "User"} />
              <AvatarFallback className="text-2xl">{userInitial}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold">{userData.name || 'N/A'}</p>
              <p className="text-sm text-muted-foreground">{userData.email}</p>
            </div>
          </div>

          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div>
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1"
                disabled={isSaving}
              />
            </div>
            <div>
              <Label htmlFor="userBio">Bio (Optional)</Label>
              <textarea
                id="userBio"
                value={userBio}
                onChange={(e) => setUserBio(e.target.value)}
                rows={3}
                className="mt-1 flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Tell us a little about yourself"
                disabled={isSaving}
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                ) : null}
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
                <span className="text-muted-foreground">User ID:</span>
                <span>{userData.id}</span>
            </div>
            <div className="flex justify-between">
                <span className="text-muted-foreground">Joined:</span>
                <span>{userData.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'N/A'}</span>
            </div>
            <div className="flex justify-between">
                <span className="text-muted-foreground">Last Login:</span>
                <span>{userData.lastLoginAt ? new Date(userData.lastLoginAt).toLocaleString() : 'N/A'}</span>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
