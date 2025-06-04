// apps/api/src/services/categoryService.ts
import { firestore, firebaseInitialized } from '../config/firebase';
import {
  Category,
  CreateCategoryPayload,
  UpdateCategoryPayload,
  CategoryDTO
} from '../models/budget.model';
import { Timestamp, FieldValue, CollectionReference, Firestore } from 'firebase-admin/firestore';

// Ensure Firebase is initialized before attempting to use Firestore services.
if (!firebaseInitialized) {
  console.error("CategoryService: Firebase is not initialized. Category operations will fail.");
  // In a real application, you might throw an error here or have a more robust
  // mechanism to prevent service instantiation if Firebase isn't ready.
}

// It's safer to get the collection reference only when Firestore is confirmed to be available.
const getCategoriesCollection = (): CollectionReference<Category> => {
  if (!firestore) {
    throw new Error("Firestore is not initialized. Cannot access categories collection.");
  }
  // Explicitly type the collection reference with the Firestore model (Category), not DTO.
  return firestore.collection('categories') as CollectionReference<Category>;
};

/**
 * Converts Firestore Timestamps and ensures proper null handling for a category object.
 * @param categoryData The category data object from Firestore.
 * @returns A category DTO with timestamps converted to ISO strings.
 */
// Update the convertCategoryToDTO function
function convertCategoryToDTO(categoryData: Category | undefined): CategoryDTO | null {
  if (!categoryData) return null;

  return {
    id: categoryData.id,
    userId: categoryData.userId,
    name: categoryData.name,
    type: categoryData.type,
    icon: categoryData.icon || null,
    color: categoryData.color || null,
    includeInBudget: categoryData.includeInBudget !== false, // Default to true if undefined
    isSystemCategory: categoryData.isSystemCategory || false,
    createdAt: categoryData.createdAt instanceof Timestamp ? categoryData.createdAt.toDate().toISOString() : String(categoryData.createdAt),
    updatedAt: categoryData.updatedAt instanceof Timestamp ? categoryData.updatedAt.toDate().toISOString() : String(categoryData.updatedAt),
  };
}

// Update the createCategory function
export async function createCategory(userId: string, payload: CreateCategoryPayload): Promise<CategoryDTO | null> {
  const categoriesCollection = getCategoriesCollection();
  const now = FieldValue.serverTimestamp() as Timestamp;
  const newCategoryRef = categoriesCollection.doc();

  const categoryData: Category = {
    id: newCategoryRef.id,
    userId: userId,
    name: payload.name,
    type: payload.type,
    icon: payload.icon || null,
    color: payload.color || null,
    includeInBudget: payload.includeInBudget, // Add this field
    createdAt: now,
    updatedAt: now,
    isSystemCategory: false,
  };

  try {
    await newCategoryRef.set(categoryData);
    const docSnapshot = await newCategoryRef.get();
    return convertCategoryToDTO(docSnapshot.data() as Category | undefined);
  } catch (error) {
    console.error("Error creating category in Firestore:", error);
    throw new Error("Failed to create category due to a server error.");
  }
}

/**
 * Retrieves all categories for a specific user, sorted by name.
 * System categories are typically listed first or handled separately by the client if needed.
 */
export async function getCategoriesByUserId(userId: string): Promise<CategoryDTO[]> {
  const categoriesCollection = getCategoriesCollection();
  try {
    // Fetch all categories for the user
    const snapshot = await categoriesCollection.where('userId', '==', userId).get();
    
    if (snapshot.empty) {
      return [];
    }

    // Convert and sort in application code for flexibility
    const userCategories = snapshot.docs
      .map(doc => convertCategoryToDTO(doc.data() as Category | undefined))
      .filter((cat): cat is CategoryDTO => cat !== null); // Type guard

    // Sort: system categories first, then by name
    userCategories.sort((a, b) => {
      if (a.isSystemCategory && !b.isSystemCategory) return -1;
      if (!a.isSystemCategory && b.isSystemCategory) return 1;
      return a.name.localeCompare(b.name);
    });
      
    return userCategories;
  } catch (error) {
    console.error(`Error fetching categories for user ${userId}:`, error);
    throw new Error("Failed to fetch categories due to a server error.");
  }
}

/**
 * Retrieves a specific category by its ID. Ensures the category belongs to the user.
 */
export async function getCategoryById(categoryId: string, userId: string): Promise<CategoryDTO | null> {
  const categoriesCollection = getCategoriesCollection();
  try {
    const docRef = categoriesCollection.doc(categoryId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return null;
    }
    const category = doc.data() as Category | undefined;
    if (category?.userId !== userId) {
      // This is an authorization issue, should ideally be caught by higher-level auth,
      // but good to have a check here too.
      console.warn(`Unauthorized attempt to access category ${categoryId} by user ${userId}.`);
      return null; // Or throw specific auth error
    }
    return convertCategoryToDTO(category);
  } catch (error) {
    console.error(`Error fetching category ${categoryId}:`, error);
    throw new Error("Failed to fetch category due to a server error.");
  }
}

/**
 * Updates an existing category for a user. System categories cannot be modified.
 */
// Update the updateCategory function
export async function updateCategory(categoryId: string, userId: string, payload: UpdateCategoryPayload): Promise<CategoryDTO | null> {
  const categoriesCollection = getCategoriesCollection();
  const categoryRef = categoriesCollection.doc(categoryId);

  try {
    const doc = await categoryRef.get();
    if (!doc.exists) {
      return null;
    }

    const existingCategory = doc.data() as Category;
    if (existingCategory.userId !== userId) {
      throw new Error("Unauthorized: You do not have permission to update this category.");
    }
    if (existingCategory.isSystemCategory) {
      throw new Error("System categories cannot be modified.");
    }

    const dataToUpdate: Partial<Record<keyof UpdateCategoryPayload, any>> & { updatedAt: Timestamp } = {
      updatedAt: FieldValue.serverTimestamp() as Timestamp,
    };

    let hasChanges = false;
    if (payload.name !== undefined && payload.name !== existingCategory.name) {
      dataToUpdate.name = payload.name;
      hasChanges = true;
    }
    if (payload.type !== undefined && payload.type !== existingCategory.type) {
      dataToUpdate.type = payload.type;
      hasChanges = true;
    }
    if (payload.icon !== undefined && payload.icon !== existingCategory.icon) {
      dataToUpdate.icon = payload.icon === "" ? null : payload.icon;
      hasChanges = true;
    }
    if (payload.color !== undefined && payload.color !== existingCategory.color) {
      dataToUpdate.color = payload.color === "" ? null : payload.color;
      hasChanges = true;
    }
    // Add includeInBudget field handling
    if (payload.includeInBudget !== undefined && payload.includeInBudget !== existingCategory.includeInBudget) {
      dataToUpdate.includeInBudget = payload.includeInBudget;
      hasChanges = true;
    }
    
    if (!hasChanges) {
        console.log("No actual changes to update for category:", categoryId);
        return convertCategoryToDTO(existingCategory);
    }

    await categoryRef.update(dataToUpdate);
    const updatedDoc = await categoryRef.get();
    return convertCategoryToDTO(updatedDoc.data() as Category | undefined);
  } catch (error) {
    console.error(`Error updating category ${categoryId}:`, error);
    if (error instanceof Error && (error.message.includes("Unauthorized") || error.message.includes("System categories"))) {
      throw error;
    }
    throw new Error("Failed to update category due to a server error.");
  }
}

/**
 * Deletes a category for a user. System categories cannot be deleted.
 */
export async function deleteCategory(categoryId: string, userId: string): Promise<boolean> {
  const categoriesCollection = getCategoriesCollection();
  const categoryRef = categoriesCollection.doc(categoryId);
  try {
    const doc = await categoryRef.get();
    if (!doc.exists) {
      return false; // Category not found
    }
    const category = doc.data() as Category;
    if (category.userId !== userId) {
      throw new Error("Unauthorized: You do not have permission to delete this category.");
    }
    if (category.isSystemCategory) {
      throw new Error("System categories cannot be deleted.");
    }

    // TODO: Future enhancement - Check for linked budgets/transactions before deletion
    // and either block, unassign, or reassign them.
    await categoryRef.delete();
    return true;
  } catch (error) {
    console.error(`Error deleting category ${categoryId}:`, error);
    if (error instanceof Error && (error.message.includes("Unauthorized") || error.message.includes("System categories"))) {
      throw error; // Re-throw specific, known errors
    }
    throw new Error("Failed to delete category due to a server error.");
  }
}

/**
 * Seeds default categories for a new user if they don't have any.
 * Uses a batch write for efficiency.
 */
// Update the seedDefaultCategoriesForUser function
