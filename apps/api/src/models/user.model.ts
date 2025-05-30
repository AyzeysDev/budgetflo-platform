// apps/api/src/models/user.model.ts
import { Timestamp } from 'firebase-admin/firestore';

export interface UserProfile {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  bio?: string | null; // Retained for data model consistency, though not editable in current settings form
  createdAt: Timestamp | Date | string;
  lastLoginAt: Timestamp | Date | string;
  profileLastUpdatedAt?: Timestamp | Date | string | null;

  // New fields for persistence and features
  dailyStreak?: number;
  notificationFrequency?: 'daily' | 'weekly' | 'monthly' | 'none';
  preferredCurrency?: string; // e.g., 'USD', 'EUR'
  displayDecimalPlaces?: 0 | 2;
}

export interface UserSyncPayload {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
}

export interface UserProfileUpdatePayload {
  name?: string | null;
  // bio is not updated from the current settings form
  // image is not updated from the current settings form (assumed from OAuth)

  // New editable preferences
  notificationFrequency?: 'daily' | 'weekly' | 'monthly' | 'none';
  preferredCurrency?: string;
  displayDecimalPlaces?: 0 | 2;
}
