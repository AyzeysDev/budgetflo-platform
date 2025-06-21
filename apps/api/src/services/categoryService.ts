// apps/api/src/services/categoryService.ts
import { firestore, firebaseInitialized } from '../config/firebase';
import {
  Category,
  CreateCategoryPayload,
  UpdateCategoryPayload,
  CategoryDTO
} from '../models/budget.model';
import { Timestamp, FieldValue, CollectionReference, Firestore } from 'firebase-admin/firestore';
import { Transaction } from '../models/transaction.model';

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

const getTransactionsCollection = (): CollectionReference<Transaction> => {
  if (!firestore) {
    throw new Error("Firestore is not initialized. Cannot access transactions collection.");
  }
  return firestore.collection('transactions') as CollectionReference<Transaction>;
};

/**
 * Converts Firestore Timestamps and ensures proper null handling for a category object.
 * @param categoryData The category data object from Firestore.
 * @returns A category DTO with timestamps converted to ISO strings.
 */
function convertCategoryToDTO(category: Category): CategoryDTO {
  return {
    ...category,
    icon: category.icon || null,
    color: category.color || null,
    includeInBudget: category.includeInBudget !== false,
    isSystemCategory: category.isSystemCategory || false,
    createdAt: (category.createdAt as Timestamp).toDate().toISOString(),
    updatedAt: (category.updatedAt as Timestamp).toDate().toISOString(),
  };
}

// Update the createCategory function
export async function createCategory(userId: string, payload: CreateCategoryPayload): Promise<CategoryDTO> {
  const newCategoryRef = getCategoriesCollection().doc();
  const now = Timestamp.now();
  const newCategory: Category = {
    id: newCategoryRef.id,
    userId,
    ...payload,
    createdAt: now,
    updatedAt: now,
    isSystemCategory: false,
  };
  await newCategoryRef.set(newCategory);
  return convertCategoryToDTO(newCategory);
}

/**
 * Retrieves all categories for a specific user, sorted by name.
 * System categories are typically listed first or handled separately by the client if needed.
 */
export async function getCategoriesByUserId(userId: string): Promise<CategoryDTO[]> {
  const snapshot = await getCategoriesCollection().where('userId', '==', userId).get();
  if (snapshot.empty) return [];
  return snapshot.docs.map(doc => convertCategoryToDTO(doc.data() as Category));
}

/**
 * Retrieves a specific category by its ID. Ensures the category belongs to the user.
 */
export async function getCategoryById(categoryId: string, userId: string): Promise<CategoryDTO | null> {
  const doc = await getCategoriesCollection().doc(categoryId).get();
  const data = doc.data();
  if (!doc.exists || data?.userId !== userId) return null;
  return convertCategoryToDTO(data as Category);
}

/**
 * Updates an existing category for a user. System categories cannot be modified.
 */
// Update the updateCategory function
export async function updateCategory(categoryId: string, userId: string, payload: UpdateCategoryPayload): Promise<CategoryDTO | null> {
  const categoryRef = getCategoriesCollection().doc(categoryId);
  const doc = await categoryRef.get();
  if (!doc.exists || doc.data()?.userId !== userId) {
    return null;
  }
  const updatePayload = { ...payload, updatedAt: Timestamp.now() };
  await categoryRef.update(updatePayload);
  const updatedDocData = (await categoryRef.get()).data();
  return convertCategoryToDTO(updatedDocData as Category);
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

interface DeleteCategoryParams {
    userId: string;
    categoryIdToDelete: string;
    action: 'delete' | 'transfer';
    targetCategoryId?: string | null;
}

export async function deleteCategoryAndHandleTransactions({ userId, categoryIdToDelete, action, targetCategoryId }: DeleteCategoryParams): Promise<boolean> {
    if (!firestore) throw new Error("Firestore is not initialized.");
    const categories = getCategoriesCollection();
    const transactions = getTransactionsCollection();

    await firestore.runTransaction(async (t) => {
        const categoryToDeleteRef = categories.doc(categoryIdToDelete);
        const categoryToDeleteDoc = await t.get(categoryToDeleteRef);
        const categoryData = categoryToDeleteDoc.data();

        if (!categoryToDeleteDoc.exists || categoryData?.userId !== userId) {
            throw new Error('Category not found or you do not have permission to delete it.');
        }

        if (action === 'transfer') {
            if (!targetCategoryId) throw new Error('Target category ID is required for transfer.');
            const targetCategoryRef = categories.doc(targetCategoryId);
            const targetCategoryDoc = await t.get(targetCategoryRef);
            const targetData = targetCategoryDoc.data();

            if (!targetCategoryDoc.exists || targetData?.userId !== userId) {
                throw new Error('Target category not found or unauthorized.');
            }
            if (targetData?.type !== categoryData?.type) {
                throw new Error('Cannot transfer between categories of different types.');
            }
        }
        
        const transactionsQuery = transactions.where('categoryId', '==', categoryIdToDelete).where('userId', '==', userId);
        const transactionsSnapshot = await t.get(transactionsQuery);
        
        if (!transactionsSnapshot.empty) {
            for (const doc of transactionsSnapshot.docs) {
                if (action === 'transfer') {
                    t.update(doc.ref, { categoryId: targetCategoryId });
                } else {
                    t.delete(doc.ref);
                }
            }
        }
        
        t.delete(categoryToDeleteRef);
    });

    return true;
}
