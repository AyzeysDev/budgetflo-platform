// apps/api/src/services/userService.ts
import { firestore, firebaseInitialized, firebaseAdmin } from '../config/firebase';
import { UserProfile, UserSyncPayload, UserProfileUpdatePayload } from '../models/user.model';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

if (!firebaseInitialized || !firestore) {
  console.error("UserService: Firebase is not initialized. User operations will fail.");
}

/**
 * Converts Firestore Timestamps in a user object to ISO date strings.
 * Also handles if a field is already a Date object.
 * @param userDocData The user data object from Firestore.
 * @returns A user data object with timestamps converted.
 */
function convertTimestamps<T extends Partial<UserProfile>>(userDocData: T | undefined): T | undefined {
  if (!userDocData) return undefined;
  const data: T = { ...userDocData }; // Shallow copy to avoid modifying original
  const dateFields: (keyof UserProfile)[] = ['createdAt', 'lastLoginAt', 'profileLastUpdatedAt'];

  for (const field of dateFields) {
    if (field in data && data[field]) {
      const fieldValue = data[field];
      if (typeof (fieldValue as Timestamp).toDate === 'function') {
        // It's a Firestore Timestamp
        (data as any)[field] = (fieldValue as Timestamp).toDate().toISOString();
      } else if (fieldValue instanceof Date) {
        // It's already a JavaScript Date object
        (data as any)[field] = (fieldValue as Date).toISOString();
      }
      // If it's already a string, assume it's correctly formatted (e.g., from a previous conversion)
    }
  }
  return data;
}

/**
 * Checks if two dates are on the same calendar day.
 * @param date1 First date.
 * @param date2 Second date.
 * @returns True if they are on the same calendar day, false otherwise.
 */
function isSameCalendarDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

/**
 * Checks if dateToCheck was yesterday relative to today.
 * @param dateToCheck The date to check.
 * @param today The current date.
 * @returns True if dateToCheck was yesterday, false otherwise.
 */
function isYesterday(dateToCheck: Date, today: Date): boolean {
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  return isSameCalendarDay(dateToCheck, yesterday);
}

/**
 * Synchronizes user data, updates last login, and manages daily streak.
 * Initializes default preferences for new users.
 */
export async function syncUser(payload: UserSyncPayload): Promise<{ userId: string; operation: 'created' | 'updated'; data: UserProfile | null }> {
  if (!firestore) throw new Error("Firestore is not initialized.");

  const { id, email, name, image } = payload;
  const userRef = firestore.collection('users').doc(id);
  const userDoc = await userRef.get();
  const now = new Date();
  const serverTimestamp = FieldValue.serverTimestamp() as Timestamp; // For setting Firestore server timestamps

  let operation: 'created' | 'updated';
  const userDataFromDb = userDoc.data() as UserProfile | undefined;

  const dataToProcess: Partial<UserProfile> = {
    email: email,
    name: name ?? null,
    image: image ?? null,
  };

  if (!userDoc.exists) {
    operation = 'created';
    dataToProcess.id = id;
    dataToProcess.createdAt = serverTimestamp;
    dataToProcess.dailyStreak = 1;
    dataToProcess.notificationFrequency = 'weekly';
    dataToProcess.preferredCurrency = 'USD';
    dataToProcess.displayDecimalPlaces = 2;
    console.log(`UserService: New user created: ${id}. Initializing streak and preferences.`);
  } else {
    operation = 'updated';
    let currentDailyStreak = userDataFromDb?.dailyStreak || 0;
    const lastLoginTimestamp = userDataFromDb?.lastLoginAt as Timestamp | undefined;

    if (lastLoginTimestamp) {
      const lastLoginDate = lastLoginTimestamp.toDate();
      if (!isSameCalendarDay(lastLoginDate, now)) {
        if (isYesterday(lastLoginDate, now)) {
          currentDailyStreak++;
        } else {
          currentDailyStreak = 1; // Reset streak
        }
        dataToProcess.dailyStreak = currentDailyStreak;
        console.log(`UserService: User ${id} logged in on a new day. Streak updated to ${currentDailyStreak}.`);
      } else {
        // Logged in again on the same day, streak doesn't change from this login
        // but we ensure it's set if it was missing (shouldn't happen if logic is correct)
        dataToProcess.dailyStreak = userDataFromDb?.dailyStreak ?? currentDailyStreak;
        console.log(`UserService: User ${id} logged in again today. Streak remains ${dataToProcess.dailyStreak}.`);
      }
    } else {
      // Existing user but no lastLoginAt or dailyStreak (e.g., data migration or error)
      dataToProcess.dailyStreak = 1;
      console.log(`UserService: User ${id} missing lastLoginAt/dailyStreak. Initializing streak to 1.`);
    }
    // Ensure existing preferences are not overwritten with defaults if they exist
    dataToProcess.notificationFrequency = userDataFromDb?.notificationFrequency ?? 'weekly';
    dataToProcess.preferredCurrency = userDataFromDb?.preferredCurrency ?? 'USD';
    dataToProcess.displayDecimalPlaces = userDataFromDb?.displayDecimalPlaces ?? 2;
    console.log(`UserService: User updated: ${id}`);
  }

  dataToProcess.lastLoginAt = serverTimestamp; // Always update lastLoginAt

  if (operation === 'created') {
    await userRef.set(dataToProcess);
  } else {
    // For existing users, use update to merge and not overwrite `createdAt`
    // and only update fields present in dataToProcess
    await userRef.update(dataToProcess);
  }
  
  const updatedDocSnap = await userRef.get();
  const finalData = convertTimestamps(updatedDocSnap.data() as UserProfile | undefined);

  return { userId: id, operation, data: finalData || null };
}

export async function getUserById(userId: string): Promise<UserProfile | null> {
  if (!firestore) throw new Error("Firestore is not initialized.");
  const userRef = firestore.collection('users').doc(userId);
  const doc = await userRef.get();

  if (!doc.exists) {
    console.log(`UserService: User not found: ${userId}`);
    return null;
  }
  return convertTimestamps(doc.data() as UserProfile | undefined) || null;
}

export async function updateUserProfile(userId: string, profileData: UserProfileUpdatePayload): Promise<UserProfile | null> {
  if (!firestore) throw new Error("Firestore is not initialized.");
  const userRef = firestore.collection('users').doc(userId);

  const dataToUpdate: Partial<UserProfile> = {};
  
  // Only add fields to the update object if they are explicitly provided in profileData
  if (profileData.name !== undefined) dataToUpdate.name = profileData.name;
  if (profileData.notificationFrequency !== undefined) dataToUpdate.notificationFrequency = profileData.notificationFrequency;
  if (profileData.preferredCurrency !== undefined) dataToUpdate.preferredCurrency = profileData.preferredCurrency;
  if (profileData.displayDecimalPlaces !== undefined) dataToUpdate.displayDecimalPlaces = profileData.displayDecimalPlaces;

  if (Object.keys(dataToUpdate).length === 0) {
    console.log(`UserService: No valid fields to update for user: ${userId}`);
    return getUserById(userId); // Return current profile if nothing to update
  }

  dataToUpdate.profileLastUpdatedAt = FieldValue.serverTimestamp() as Timestamp;

  await userRef.update(dataToUpdate);
  console.log(`UserService: User profile updated for: ${userId} with data:`, JSON.stringify(dataToUpdate));

  const updatedDocSnap = await userRef.get();
  return convertTimestamps(updatedDocSnap.data() as UserProfile | undefined) || null;
}
