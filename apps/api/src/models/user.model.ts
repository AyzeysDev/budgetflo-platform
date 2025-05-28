// apps/api/src/models/user.model.ts
import { Timestamp } from 'firebase-admin/firestore'; // For Firestore Timestamp type

// Interface for user data as it's stored in Firestore or passed around
export interface UserProfile {
  id: string; // Corresponds to NextAuth user.id (e.g., Google 'sub')
  email: string;
  name?: string | null;
  image?: string | null;
  bio?: string | null;
  prefersDarkMode?: boolean | null;
  createdAt: Timestamp | Date | string; // Stored as Timestamp, converted to string for API response
  lastLoginAt: Timestamp | Date | string; // Stored as Timestamp, converted to string for API response
  profileLastUpdatedAt?: Timestamp | Date | string; // Stored as Timestamp
  // Add any other fields relevant to your application
  // Example: roles?: string[];
}

// Interface for data received by the /sync endpoint from the BFF
// This might be slightly different from the full UserProfile (e.g., no timestamps initially)
export interface UserSyncPayload {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
}

// Interface for data used to update a user's profile (subset of UserProfile)
export interface UserProfileUpdatePayload {
  name?: string | null;
  image?: string | null; // If you allow image updates this way
  bio?: string | null;
  prefersDarkMode?: boolean | null;
  // Add other updatable fields
}
