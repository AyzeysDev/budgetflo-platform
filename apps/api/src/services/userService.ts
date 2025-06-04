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
// import { seedDefaultCategoriesForUser } from './categoryService'; // Import category seeding function

if (!firebaseInitialized || !firestore) {
  console.error("UserService: Firebase is not initialized. User operations will fail.");
}

function convertFirestoreTimestampsToISO(data: any): any {
  if (!data) return data;
  if (Array.isArray(data)) {
    return data.map(item => convertFirestoreTimestampsToISO(item));
  }
  if (typeof data === 'object' && data !== null) {
    if (data instanceof Timestamp) {
      return data.toDate().toISOString();
    }
    if (data instanceof Date) { 
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

function isSameCalendarDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

function isYesterday(dateToCheck: Date, today: Date): boolean {
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  return isSameCalendarDay(dateToCheck, yesterday);
}

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
  const userSettingsDoc = await userSettingsRef.get(); // Check if settings exist

  const existingUserAccount = userAccountDoc.data() as UserAccount | undefined;

  userAccountData.email = email;
  userAccountData.oauthName = oauthNameFromPayload ?? null;
  userAccountData.oauthImage = oauthImageFromPayload ?? null;
  userAccountData.lastLoginAt = serverTimestamp;

  if (!userAccountDoc.exists) {
    operation = 'created';
    userAccountData.id = id;
    userAccountData.createdAt = serverTimestamp;
    userAccountData.dailyStreak = 1;
    await userAccountRef.set(userAccountData);
    console.log(`UserService (syncUser): New user account created: ${id}.`);

    // Seed default categories for new user
    // try {
    //   await seedDefaultCategoriesForUser(id);
    // } catch (seedError) {
    //   console.error(`UserService (syncUser): Failed to seed categories for new user ${id}:`, seedError);
    //   // Continue with user sync even if category seeding fails, but log the error.
    // }

  } else {
    operation = 'updated';
    let currentDailyStreak = existingUserAccount?.dailyStreak || 0;
    const lastLoginTimestamp = existingUserAccount?.lastLoginAt as Timestamp | undefined;

    if (lastLoginTimestamp) {
      const lastLoginDate = lastLoginTimestamp.toDate();
      if (!isSameCalendarDay(lastLoginDate, now)) { 
        if (isYesterday(lastLoginDate, now)) {
          currentDailyStreak++;
        } else {
          currentDailyStreak = 1; 
        }
        userAccountData.dailyStreak = currentDailyStreak;
      } else {
        userAccountData.dailyStreak = existingUserAccount?.dailyStreak ?? currentDailyStreak;
      }
    } else {
      userAccountData.dailyStreak = 1;
    }
    await userAccountRef.update(userAccountData);
    console.log(`UserService (syncUser): User account updated: ${id}.`);
  }

  // Initialize UserSettings if they don't exist (could happen even for existing user if settings doc was missed)
  if (!userSettingsDoc.exists) {
    userSettingsData.userId = id;
    userSettingsData.displayName = oauthNameFromPayload ?? null; 
    userSettingsData.notificationFrequency = 'weekly'; 
    userSettingsData.preferredCurrency = 'USD'; 
    userSettingsData.displayDecimalPlaces = 2; 
    userSettingsData.settingsLastUpdatedAt = serverTimestamp;
    await userSettingsRef.set(userSettingsData);
    console.log(`UserService (syncUser): User settings initialized for user: ${id}`);
  }

  const finalProfileView = await getUserProfileViewById(id);
  return { userId: id, operation, data: finalProfileView };
}

export async function getUserProfileViewById(userId: string): Promise<UserProfileView | null> {
  if (!firestore) throw new Error("Firestore is not initialized for getUserProfileViewById.");

  const userAccountRef = firestore.collection('users').doc(userId);
  const userSettingsRef = firestore.collection('user_settings').doc(userId);

  const accountDoc = await userAccountRef.get();
  const settingsDoc = await userSettingsRef.get();

  if (!accountDoc.exists) {
    return null;
  }

  const accountData = accountDoc.data() as UserAccount;
  const settingsData = settingsDoc.exists ? settingsDoc.data() as UserSettings : null;

  let nameToDisplay: string | null = null;
  if (settingsData?.displayName !== undefined && settingsData.displayName !== null) {
    nameToDisplay = settingsData.displayName;
  } else if (accountData.oauthName !== undefined && accountData.oauthName !== null) {
    nameToDisplay = accountData.oauthName;
  } else {
    nameToDisplay = accountData.email.split('@')[0];
  }
  
  const imageToDisplay = accountData.oauthImage || null;

  const combinedProfile: UserProfileView = {
    id: accountData.id,
    email: accountData.email,
    createdAt: accountData.createdAt as Timestamp,
    lastLoginAt: accountData.lastLoginAt as Timestamp,
    dailyStreak: accountData.dailyStreak,
    nameToDisplay: nameToDisplay,
    imageToDisplay: imageToDisplay,
    notificationFrequency: settingsData?.notificationFrequency ?? 'weekly',
    preferredCurrency: settingsData?.preferredCurrency ?? 'USD',
    displayDecimalPlaces: settingsData?.displayDecimalPlaces ?? 2,
    profileLastUpdatedAt: (settingsData?.settingsLastUpdatedAt as Timestamp | undefined)?.toDate().toISOString() || (accountData.lastLoginAt as Timestamp).toDate().toISOString(),
    settingsLastUpdatedAt: (settingsData?.settingsLastUpdatedAt as Timestamp | undefined)?.toDate().toISOString() || null,
  };
  
  return convertFirestoreTimestampsToISO(combinedProfile) as UserProfileView;
}

export async function updateUserSettings(userId: string, settingsUpdatePayload: UserSettingsUpdatePayload): Promise<UserProfileView | null> {
  if (!firestore) throw new Error("Firestore is not initialized for updateUserSettings.");
  
  const userSettingsRef = firestore.collection('user_settings').doc(userId);
  const dataToUpdate: Partial<UserSettings> = {};
  
  if (settingsUpdatePayload.displayName !== undefined) {
    dataToUpdate.displayName = settingsUpdatePayload.displayName;
  }
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
    return getUserProfileViewById(userId); 
  }

  dataToUpdate.settingsLastUpdatedAt = FieldValue.serverTimestamp() as Timestamp;
  await userSettingsRef.set(dataToUpdate, { merge: true }); 
  
  return getUserProfileViewById(userId);
}
