// apps/api/src/models/user.model.ts
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Represents core user account information, primarily sourced from OAuth
 * and system-managed fields like timestamps and streaks.
 */
export interface UserAccount {
  id: string; // Primary identifier, usually from OAuth provider (e.g., Google sub)
  email: string; // User's email, sourced from OAuth
  oauthName?: string | null; // Name as provided by OAuth, updated on each login
  oauthImage?: string | null; // Image URL as provided by OAuth, updated on each login
  
  createdAt: Timestamp | Date | string; // Timestamp of first account creation
  lastLoginAt: Timestamp | Date | string; // Timestamp of the last login
  dailyStreak?: number; // Tracks consecutive days of activity
}

/**
 * Represents user-configurable settings and profile details.
 * This data is explicitly set by the user and takes precedence for display.
 */
export interface UserSettings {
  userId: string; // Foreign key linking to UserAccount.id
  
  displayName?: string | null; // User's preferred display name, editable by user
  // 'image' could also be a user-uploaded/chosen image URL if that feature is added.
  // For now, if user wants to change image, they change it in Google, and oauthImage updates.
  // If a user-uploaded image is desired, add `customImage?: string | null;` here.

  bio?: string | null; // User's biography
  
  notificationFrequency?: 'daily' | 'weekly' | 'monthly' | 'none';
  preferredCurrency?: string; // e.g., 'USD', 'EUR'
  displayDecimalPlaces?: 0 | 2;
  
  settingsLastUpdatedAt?: Timestamp | Date | string | null; // When these settings were last updated
}

/**
 * Represents the combined view of a user's profile, merging UserAccount and UserSettings.
 * This is typically what the frontend would consume after data is fetched and merged.
 * Fields from UserSettings will override corresponding fields from UserAccount if present (e.g., displayName vs oauthName).
 */
export interface UserProfileView extends Omit<UserAccount, 'oauthName' | 'oauthImage'> {
  // Fields from UserAccount (id, email, createdAt, lastLoginAt, dailyStreak)
  // Plus resolved/preferred fields:
  nameToDisplay: string | null; // displayName from UserSettings, or oauthName, or derived from email
  imageToDisplay: string | null; // UserSettings.customImage (if implemented) or UserAccount.oauthImage

  // Fields from UserSettings
  bio?: string | null;
  notificationFrequency?: 'daily' | 'weekly' | 'monthly' | 'none';
  preferredCurrency?: string;
  displayDecimalPlaces?: 0 | 2;
  profileLastUpdatedAt?: string | null; // Represents last update to either account or settings
  settingsLastUpdatedAt?: string | null; // Specifically when user settings were changed
}


/**
 * Payload received from the BFF during the OAuth sign-in/sync process.
 * Contains data directly from the OAuth provider.
 */
export interface UserSyncPayload {
  id: string;
  email: string;
  name?: string | null; // This is the name from Google/OAuth
  image?: string | null; // This is the image from Google/OAuth
}

/**
 * Payload for updating user-configurable settings via the API.
 */
export interface UserSettingsUpdatePayload {
  displayName?: string | null;
  // bio?: string | null; // Add if bio becomes editable in settings
  notificationFrequency?: 'daily' | 'weekly' | 'monthly' | 'none';
  preferredCurrency?: string;
  displayDecimalPlaces?: 0 | 2;
}
