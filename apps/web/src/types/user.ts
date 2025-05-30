// apps/web/src/types/user.ts

/**
 * Defines the structure of a user profile as expected by the web application.
 * Timestamps are expected as ISO date strings.
 */
export interface WebAppUserProfile {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null; // URL of the profile image (from OAuth)
  bio?: string | null; // Retained for data model consistency, though not editable in current settings form
  createdAt: string;
  lastLoginAt: string;
  profileLastUpdatedAt?: string | null;

  // New fields
  dailyStreak?: number; // Display only
  notificationFrequency?: 'daily' | 'weekly' | 'monthly' | 'none';
  preferredCurrency?: string; // e.g., 'USD', 'EUR'
  displayDecimalPlaces?: 0 | 2;
}

/**
 * Defines the payload for updating a user's profile from the web application.
 */
export interface WebAppUserProfileUpdatePayload {
  name?: string | null;
  // bio removed - not editable in this form
  // image removed - not directly editable in this form

  // New editable fields
  notificationFrequency?: 'daily' | 'weekly' | 'monthly' | 'none';
  preferredCurrency?: string;
  displayDecimalPlaces?: 0 | 2;
}
