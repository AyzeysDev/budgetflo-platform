// apps/web/src/types/user.ts

/**
 * Defines the structure of a user profile as expected by the web application.
 * Timestamps are expected as ISO date strings.
 * The 'image' field represents the URL of the profile image, typically set by OAuth.
 */
export interface WebAppUserProfile {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null; // URL of the profile image (not directly editable in this form)
  bio?: string | null;
  createdAt: string; 
  lastLoginAt: string; 
  profileLastUpdatedAt?: string | null;
}

/**
 * Defines the payload for updating a user's profile from the web application.
 * 'image' is removed as it's not part of this form's direct update mechanism.
 */
export interface WebAppUserProfileUpdatePayload {
  name?: string | null;
  bio?: string | null;
  // image field removed
}
