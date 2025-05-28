// apps/api/src/services/userService.ts
import { firestore, firebaseInitialized, firebaseAdmin } from '../config/firebase';
import { UserProfile, UserSyncPayload, UserProfileUpdatePayload } from '../models/user.model';
import { Timestamp } from 'firebase-admin/firestore';

if (!firebaseInitialized || !firestore) {
  console.error("UserService: Firebase is not initialized. User operations will fail.");
}

/**
 * Converts Firestore Timestamps in a user object to ISO date strings.
 * Ensures that the input object has properties defined in UserProfile for type safety.
 * @param userDocData The user data object from Firestore, expected to conform to UserProfile structure.
 * @returns A user data object with timestamps converted.
 */
function convertTimestamps<T extends Partial<UserProfile>>(userDocData: T | undefined): T | undefined {
  if (!userDocData) return undefined;

  // Create a new object to avoid modifying the original, and ensure it's of type T
  const data: T = { ...userDocData };

  const dateFields: (keyof UserProfile)[] = ['createdAt', 'lastLoginAt', 'profileLastUpdatedAt'];

  for (const field of dateFields) {
    // Check if the field exists on the data object and is a Timestamp
    if (field in data && data[field] && typeof (data[field] as unknown as Timestamp).toDate === 'function') {
      // Perform type assertion after confirming the property exists and is a Timestamp-like object
      (data as any)[field] = ((data[field] as unknown) as Timestamp).toDate().toISOString();
    }
  }
  return data;
}


/**
 * Synchronizes user data with Firestore. Creates a new user document
 * if one doesn't exist, or updates an existing one.
 * Idempotent based on user ID.
 * @param payload User data from the authentication provider.
 * @returns The user's ID and whether the user was created or updated.
 */
export async function syncUser(payload: UserSyncPayload): Promise<{ userId: string; operation: 'created' | 'updated'; data: UserProfile | null }> {
  if (!firestore) throw new Error("Firestore is not initialized.");

  const { id, email, name, image } = payload;
  const userRef = firestore.collection('users').doc(id);

  const userDoc = await userRef.get();

  const dataToSet: Partial<UserProfile> = {
    email: email,
    name: name ?? null,
    image: image ?? null,
    lastLoginAt: firebaseAdmin.firestore.FieldValue.serverTimestamp() as Timestamp,
  };

  let operation: 'created' | 'updated';

  if (!userDoc.exists) {
    dataToSet.id = id;
    dataToSet.createdAt = firebaseAdmin.firestore.FieldValue.serverTimestamp() as Timestamp;
    await userRef.set(dataToSet);
    operation = 'created';
    console.log(`UserService: New user created in Firestore: ${id}`);
  } else {
    await userRef.set(dataToSet, { merge: true });
    operation = 'updated';
    console.log(`UserService: User updated in Firestore: ${id}`);
  }
  
  const updatedDocSnap = await userRef.get();
  const finalData = convertTimestamps(updatedDocSnap.data() as UserProfile | undefined); // Ensure undefined is handled

  return { userId: id, operation, data: finalData || null };
}

/**
 * Retrieves a user profile by their ID from Firestore.
 * @param userId The ID of the user to retrieve.
 * @returns The user profile data or null if not found.
 */
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

/**
 * Updates a user's profile information in Firestore.
 * @param userId The ID of the user to update.
 * @param profileData The partial profile data to update.
 * @returns The updated user profile data or null if the user was not found.
 */
export async function updateUserProfile(userId: string, profileData: UserProfileUpdatePayload): Promise<UserProfile | null> {
  if (!firestore) throw new Error("Firestore is not initialized.");

  const userRef = firestore.collection('users').doc(userId);
  
  const allowedUpdates: Partial<UserProfileUpdatePayload> = {
    name: profileData.name,
    image: profileData.image,
    bio: profileData.bio,
    prefersDarkMode: profileData.prefersDarkMode,
  };
  
  Object.keys(allowedUpdates).forEach(keyStr => {
    const key = keyStr as keyof UserProfileUpdatePayload;
    if ((allowedUpdates)[key] === undefined) {
      delete (allowedUpdates)[key];
    }
  });


  if (Object.keys(allowedUpdates).length === 0) {
    console.log(`UserService: No valid fields to update for user: ${userId}`);
    const currentUserData = await getUserById(userId);
    return currentUserData; // Return current data if no valid updates
  }

  const dataToUpdateWithTimestamp: Partial<UserProfile> = { // Ensure this matches UserProfile structure
    ...allowedUpdates,
    profileLastUpdatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp() as Timestamp,
  };

  await userRef.set(dataToUpdateWithTimestamp, { merge: true });
  console.log(`UserService: User profile updated for: ${userId}`);

  const updatedDocSnap = await userRef.get();
  return convertTimestamps(updatedDocSnap.data() as UserProfile | undefined) || null;
}
