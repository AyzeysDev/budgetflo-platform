// apps/web/src/types/user.ts

/**
 * Represents the combined view of a user's profile as fetched from the BFF,
 * which in turn gets it from the backend API.
 * Timestamps are expected as ISO date strings.
 * This should mirror the UserProfileView from the API's models.
 */
export interface WebAppUserProfile {
  id: string;
  email: string;
  
  nameToDisplay: string | null; // User's preferred display name or OAuth name
  imageToDisplay: string | null; // User's OAuth image (or custom if implemented later)

  bio?: string | null;
  
  createdAt: string; // ISO date string
  lastLoginAt: string; // ISO date string
  dailyStreak?: number;
  
  notificationFrequency?: 'daily' | 'weekly' | 'monthly' | 'none';
  preferredCurrency?: string; // e.g., 'USD', 'EUR'
  displayDecimalPlaces?: 0 | 2;
  
  profileLastUpdatedAt?: string | null; // ISO date string (overall last update)
  settingsLastUpdatedAt?: string | null; // ISO date string (when settings specifically changed)
}

/**
 * Defines the payload for updating user-configurable settings from the web application.
 * This should mirror the UserSettingsUpdatePayload from the API's models.
 */
export interface WebAppUserSettingsUpdatePayload {
  displayName?: string | null;
  bio?: string | null; // Making bio editable
  notificationFrequency?: 'daily' | 'weekly' | 'monthly' | 'none';
  preferredCurrency?: string;
  displayDecimalPlaces?: 0 | 2;
}
