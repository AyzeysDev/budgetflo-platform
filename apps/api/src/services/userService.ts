// apps/api/src/services/userService.ts
import { firestore, firebaseInitialized } from '../config/firebase';
import { 
  UserAccount, 
  UserSettings, 
  UserSyncPayload, 
  UserSettingsUpdatePayload,
  UserProfileView 
} from '../models/user.model';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

if (!firebaseInitialized || !firestore) {
  console.error("UserService: Firebase is not initialized. User operations will fail.");
  // Depending on the application's resilience strategy, you might throw an error here
  // or allow the app to run in a degraded state if some parts can function without Firebase.
}

/**
 * Converts Firestore Timestamps in an object to ISO date strings.
 * Handles nested objects and arrays.
 * @param data The data object from Firestore.
 * @returns A data object with timestamps converted.
 */
function convertFirestoreTimestampsToISO(data: any): any {
  if (!data) return data;

  if (Array.isArray(data)) {
    return data.map(item => convertFirestoreTimestampsToISO(item));
  }

  if (typeof data === 'object' && data !== null) {
    if (data instanceof Timestamp) {
      return data.toDate().toISOString();
    }
    if (data instanceof Date) { // Should not happen with Firestore Admin SDK directly but good practice
      return data.toISOString();
    }
    
    const newObj: { [key: string]: any } = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        newObj[key] = convertFirestoreTimestampsToISO(data[key]);
      }
    }
    return newObj;
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
 * Synchronizes user account data from OAuth, updates last login, manages daily streak,
 * and initializes user settings if they don't exist.
 */
export async function syncUser(syncPayload: UserSyncPayload): Promise<{ userId: string; operation: 'created' | 'updated'; data: UserProfileView | null }> {
  if (!firestore) throw new Error("Firestore is not initialized for syncUser.");

  const { id, email, name: oauthNameFromPayload, image: oauthImageFromPayload } = syncPayload;
  
  const userAccountRef = firestore.collection('users').doc(id);
  const userSettingsRef = firestore.collection('user_settings').doc(id);

  const now = new Date();
  const serverTimestamp = FieldValue.serverTimestamp() as Timestamp;

  let operation: 'created' | 'updated';
  let userAccountData: Partial<UserAccount> = {};
  let userSettingsData: Partial<UserSettings> = {};

  const userAccountDoc = await userAccountRef.get();
  const userSettingsDoc = await userSettingsRef.get();

  const existingUserAccount = userAccountDoc.data() as UserAccount | undefined;

  // Update UserAccount data (OAuth related and system managed)
  userAccountData.email = email;
  userAccountData.oauthName = oauthNameFromPayload ?? null;
  userAccountData.oauthImage = oauthImageFromPayload ?? null;
  userAccountData.lastLoginAt = serverTimestamp;

  if (!userAccountDoc.exists) {
    operation = 'created';
    userAccountData.id = id;
    userAccountData.createdAt = serverTimestamp;
    userAccountData.dailyStreak = 1;
    console.log(`UserService (syncUser): New user account created: ${id}. Initializing streak.`);
    await userAccountRef.set(userAccountData);
  } else {
    operation = 'updated';
    let currentDailyStreak = existingUserAccount?.dailyStreak || 0;
    const lastLoginTimestamp = existingUserAccount?.lastLoginAt as Timestamp | undefined;

    if (lastLoginTimestamp) {
      const lastLoginDate = lastLoginTimestamp.toDate();
      if (!isSameCalendarDay(lastLoginDate, now)) { // Logged in on a new day
        if (isYesterday(lastLoginDate, now)) {
          currentDailyStreak++;
        } else {
          currentDailyStreak = 1; // Reset streak
        }
        userAccountData.dailyStreak = currentDailyStreak;
        console.log(`UserService (syncUser): User ${id} logged in on a new day. Streak updated to ${currentDailyStreak}.`);
      } else {
        // Logged in again on the same day, streak doesn't change from this login
        // but ensure it's set if it was missing from existingUserAccount (unlikely but safe)
        userAccountData.dailyStreak = existingUserAccount?.dailyStreak ?? currentDailyStreak;
      }
    } else {
      // Existing user but no lastLoginAt (e.g., data migration or error), or no dailyStreak
      userAccountData.dailyStreak = 1;
      console.log(`UserService (syncUser): User ${id} missing lastLoginAt/dailyStreak. Initializing/resetting streak to 1.`);
    }
    await userAccountRef.update(userAccountData); // Update only the fields in userAccountData
    console.log(`UserService (syncUser): User account updated: ${id}`);
  }

  // Initialize UserSettings if they don't exist
  if (!userSettingsDoc.exists) {
    userSettingsData.userId = id;
    // Use OAuth name as initial displayName if no settings exist
    userSettingsData.displayName = oauthNameFromPayload ?? null; 
    userSettingsData.bio = null; // Default bio
    userSettingsData.notificationFrequency = 'weekly'; // Default preference
    userSettingsData.preferredCurrency = 'USD'; // Default preference
    userSettingsData.displayDecimalPlaces = 2; // Default preference
    userSettingsData.settingsLastUpdatedAt = serverTimestamp;
    await userSettingsRef.set(userSettingsData);
    console.log(`UserService (syncUser): User settings initialized for new or existing user: ${id}`);
  }
  // Note: We do NOT overwrite existing user settings with OAuth data during sync.
  // `displayName` in user_settings is only set if settings don't exist.

  // Fetch combined profile view for the response
  const finalProfileView = await getUserProfileViewById(id);
  return { userId: id, operation, data: finalProfileView };
}

/**
 * Fetches the combined user profile view (UserAccount + UserSettings).
 * Gives precedence to UserSettings for displayable fields.
 */
export async function getUserProfileViewById(userId: string): Promise<UserProfileView | null> {
  if (!firestore) throw new Error("Firestore is not initialized for getUserProfileViewById.");

  const userAccountRef = firestore.collection('users').doc(userId);
  const userSettingsRef = firestore.collection('user_settings').doc(userId);

  const accountDoc = await userAccountRef.get();
  const settingsDoc = await userSettingsRef.get();

  if (!accountDoc.exists) {
    console.log(`UserService (getUserProfileViewById): UserAccount not found: ${userId}`);
    return null;
  }

  const accountData = accountDoc.data() as UserAccount;
  const settingsData = settingsDoc.exists ? settingsDoc.data() as UserSettings : null;

  // Determine name and image to display
  let nameToDisplay: string | null = null;
  if (settingsData?.displayName !== undefined && settingsData.displayName !== null) {
    nameToDisplay = settingsData.displayName;
  } else if (accountData.oauthName !== undefined && accountData.oauthName !== null) {
    nameToDisplay = accountData.oauthName;
  } else {
    // Fallback to part of email if no name is available
    nameToDisplay = accountData.email.split('@')[0];
  }
  
  // For image, if we implement user-uploaded images, that would take precedence here.
  // const imageToDisplay = settingsData?.customImageURL || accountData.oauthImage || null;
  const imageToDisplay = accountData.oauthImage || null; // Using OAuth image for now

  const combinedProfile: UserProfileView = {
    id: accountData.id,
    email: accountData.email,
    createdAt: accountData.createdAt as Timestamp, // Keep as Timestamp for now, will be converted by final handler
    lastLoginAt: accountData.lastLoginAt as Timestamp,
    dailyStreak: accountData.dailyStreak,
    
    nameToDisplay: nameToDisplay,
    imageToDisplay: imageToDisplay,
    
    bio: settingsData?.bio ?? null,
    notificationFrequency: settingsData?.notificationFrequency ?? 'weekly', // Default if not set
    preferredCurrency: settingsData?.preferredCurrency ?? 'USD', // Default if not set
    displayDecimalPlaces: settingsData?.displayDecimalPlaces ?? 2, // Default if not set
    
    // Determine overall profileLastUpdatedAt
    // This could be either settingsLastUpdatedAt or lastLoginAt (if account details changed via OAuth)
    // For simplicity, let's prioritize settingsLastUpdatedAt if available, otherwise lastLoginAt.
    profileLastUpdatedAt: (settingsData?.settingsLastUpdatedAt as Timestamp | undefined)?.toDate().toISOString() || (accountData.lastLoginAt as Timestamp).toDate().toISOString(),
    settingsLastUpdatedAt: (settingsData?.settingsLastUpdatedAt as Timestamp | undefined)?.toDate().toISOString() || null,
  };
  
  return convertFirestoreTimestampsToISO(combinedProfile) as UserProfileView;
}


/**
 * Updates user-configurable settings in the 'user_settings' collection.
 */
export async function updateUserSettings(userId: string, settingsUpdatePayload: UserSettingsUpdatePayload): Promise<UserProfileView | null> {
  if (!firestore) throw new Error("Firestore is not initialized for updateUserSettings.");
  
  const userSettingsRef = firestore.collection('user_settings').doc(userId);

  const dataToUpdate: Partial<UserSettings> = {};
  
  // Explicitly map fields from payload to ensure only allowed fields are updated
  if (settingsUpdatePayload.displayName !== undefined) {
    dataToUpdate.displayName = settingsUpdatePayload.displayName;
  }
  // if (settingsUpdatePayload.bio !== undefined) { // Add if bio becomes editable
  //   dataToUpdate.bio = settingsUpdatePayload.bio;
  // }
  if (settingsUpdatePayload.notificationFrequency !== undefined) {
    dataToUpdate.notificationFrequency = settingsUpdatePayload.notificationFrequency;
  }
  if (settingsUpdatePayload.preferredCurrency !== undefined) {
    dataToUpdate.preferredCurrency = settingsUpdatePayload.preferredCurrency;
  }
  if (settingsUpdatePayload.displayDecimalPlaces !== undefined) {
    dataToUpdate.displayDecimalPlaces = settingsUpdatePayload.displayDecimalPlaces;
  }

  if (Object.keys(dataToUpdate).length === 0) {
    console.log(`UserService (updateUserSettings): No valid fields to update for user: ${userId}`);
    return getUserProfileViewById(userId); // Return current profile if nothing to update
  }

  dataToUpdate.settingsLastUpdatedAt = FieldValue.serverTimestamp() as Timestamp;

  // Use set with merge: true to create the document if it doesn't exist, or update if it does.
  // This is safer if for some reason settings were not initialized during sync.
  await userSettingsRef.set(dataToUpdate, { merge: true }); 
  
  console.log(`UserService (updateUserSettings): User settings updated for: ${userId} with data:`, JSON.stringify(dataToUpdate));

  return getUserProfileViewById(userId); // Fetch and return the merged profile view
}
