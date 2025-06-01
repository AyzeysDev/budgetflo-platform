// apps/api/src/services/categoryService.ts
import { firestore, firebaseInitialized } from '../config/firebase';
import { 
  Category, 
  CreateCategoryPayload, 
  UpdateCategoryPayload,
  CategoryDTO // For consistent response structure
} from '../models/budget.model'; // Assuming models are in budget.model.ts
import { Timestamp, FieldValue, CollectionReference } from 'firebase-admin/firestore';

if (!firebaseInitialized || !firestore) {
  console.error("CategoryService: Firebase is not initialized. Category operations will fail.");
  // Consider throwing an error or implementing a more robust check
}

const categoriesCollection = firestore?.collection('categories') as CollectionReference<CategoryDTO | Category> | undefined;

/**
 * Converts Firestore Timestamps in a category object to ISO date strings.
 * @param categoryData The category data object from Firestore.
 * @returns A category data object with timestamps converted to strings.
 */
function convertCategoryTimestampsToISO(categoryData: Category | undefined): CategoryDTO | null {
  if (!categoryData) return null;
  
  // Create a new object to avoid modifying the original and to match CategoryDTO
  const dto: CategoryDTO = {
    id: categoryData.id,
    userId: categoryData.userId,
    name: categoryData.name,
    type: categoryData.type,
    icon: categoryData.icon,
    color: categoryData.color,
    isSystemCategory: categoryData.isSystemCategory,
    createdAt: categoryData.createdAt instanceof Timestamp ? categoryData.createdAt.toDate().toISOString() : String(categoryData.createdAt),
    updatedAt: categoryData.updatedAt instanceof Timestamp ? categoryData.updatedAt.toDate().toISOString() : String(categoryData.updatedAt),
  };
  return dto;
}


/**
 * Creates a new category for a user.
 */
export async function createCategory(userId: string, payload: CreateCategoryPayload): Promise<CategoryDTO | null> {
  if (!categoriesCollection) throw new Error("Categories collection is not available.");

  const now = FieldValue.serverTimestamp() as Timestamp;
  const newCategoryRef = categoriesCollection.doc();
  
  const categoryData: Category = {
    id: newCategoryRef.id,
    userId: userId, // Ensure userId from authenticated context is used
    name: payload.name,
    type: payload.type,
    icon: payload.icon || null,
    color: payload.color || null,
    createdAt: now,
    updatedAt: now,
    isSystemCategory: false, // User-created categories are not system categories
  };

  try {
    await newCategoryRef.set(categoryData);
    // Fetch the newly created document to get server-generated timestamps correctly
    const docSnapshot = await newCategoryRef.get();
    return convertCategoryTimestampsToISO(docSnapshot.data() as Category | undefined);
  } catch (error) {
    console.error("Error creating category in Firestore:", error);
    // Consider more specific error handling or re-throwing a custom error
    throw new Error("Failed to create category.");
  }
}

/**
 * Retrieves all categories for a specific user.
 */
export async function getCategoriesByUserId(userId: string): Promise<CategoryDTO[]> {
  if (!categoriesCollection) throw new Error("Categories collection is not available.");
  
  try {
    const snapshot = await categoriesCollection.where('userId', '==', userId).orderBy('name', 'asc').get();
    if (snapshot.empty) {
      return [];
    }
    return snapshot.docs.map(doc => convertCategoryTimestampsToISO(doc.data() as Category | undefined)).filter(Boolean) as CategoryDTO[];
  } catch (error) {
    console.error(`Error fetching categories for user ${userId}:`, error);
    throw new Error("Failed to fetch categories.");
  }
}

/**
 * Retrieves a specific category by its ID and userId.
 */
export async function getCategoryById(categoryId: string, userId: string): Promise<CategoryDTO | null> {
  if (!categoriesCollection) throw new Error("Categories collection is not available.");

  try {
    const docRef = categoriesCollection.doc(categoryId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return null;
    }
    const category = doc.data() as Category | undefined;
    if (category?.userId !== userId) {
        console.warn(`Unauthorized attempt to access category ${categoryId} by user ${userId}`);
        return null; // Or throw an authorization error
    }
    return convertCategoryTimestampsToISO(category);
  } catch (error) {
    console.error(`Error fetching category ${categoryId}:`, error);
    throw new Error("Failed to fetch category.");
  }
}

/**
 * Updates an existing category for a user.
 */
export async function updateCategory(categoryId: string, userId: string, payload: UpdateCategoryPayload): Promise<CategoryDTO | null> {
  if (!categoriesCollection) throw new Error("Categories collection is not available.");

  const categoryRef = categoriesCollection.doc(categoryId);
  
  try {
    const doc = await categoryRef.get();
    if (!doc.exists) {
      return null; // Or throw a NotFoundError
    }
    const existingCategory = doc.data() as Category;
    if (existingCategory.userId !== userId) {
      console.warn(`Unauthorized attempt to update category ${categoryId} by user ${userId}`);
      // In a real app, throw an explicit authorization error to be caught by error handling middleware
      throw new Error("Unauthorized to update this category."); 
    }
    if (existingCategory.isSystemCategory) {
        throw new Error("System categories cannot be modified.");
    }

    const dataToUpdate: Partial<UpdateCategoryPayload> & { updatedAt: Timestamp } = {
      updatedAt: FieldValue.serverTimestamp() as Timestamp,
    };

    if (payload.name !== undefined) dataToUpdate.name = payload.name;
    if (payload.type !== undefined) dataToUpdate.type = payload.type;
    if (payload.icon !== undefined) dataToUpdate.icon = payload.icon;
    if (payload.color !== undefined) dataToUpdate.color = payload.color;
    
    if (Object.keys(dataToUpdate).length <= 1) { // Only updatedAt
        console.log("No fields to update for category:", categoryId);
        return convertCategoryTimestampsToISO(existingCategory); // Return existing if no actual changes
    }

    await categoryRef.update(dataToUpdate);
    
    const updatedDoc = await categoryRef.get();
    return convertCategoryTimestampsToISO(updatedDoc.data() as Category | undefined);
  } catch (error) {
    console.error(`Error updating category ${categoryId}:`, error);
    if (error instanceof Error && (error.message.includes("Unauthorized") || error.message.includes("System categories"))) {
        throw error; // Re-throw specific errors
    }
    throw new Error("Failed to update category.");
  }
}

/**
 * Deletes a category for a user.
 * Ensures system categories cannot be deleted.
 * TODO: Consider implications if budgets or transactions are linked to this category.
 * For MVP, simple delete. Later, might need to unassign/reassign or block deletion.
 */
export async function deleteCategory(categoryId: string, userId: string): Promise<boolean> {
  if (!categoriesCollection) throw new Error("Categories collection is not available.");
  
  const categoryRef = categoriesCollection.doc(categoryId);
  try {
    const doc = await categoryRef.get();
    if (!doc.exists) {
      return false; // Category not found
    }
    const category = doc.data() as Category;
    if (category.userId !== userId) {
      console.warn(`Unauthorized attempt to delete category ${categoryId} by user ${userId}`);
      throw new Error("Unauthorized to delete this category.");
    }
    if (category.isSystemCategory) {
      throw new Error("System categories cannot be deleted.");
    }

    // TODO: Add logic here to check for linked budgets/transactions before deletion
    // For now, direct delete:
    await categoryRef.delete();
    return true;
  } catch (error) {
    console.error(`Error deleting category ${categoryId}:`, error);
     if (error instanceof Error && (error.message.includes("Unauthorized") || error.message.includes("System categories"))) {
        throw error; // Re-throw specific errors
    }
    throw new Error("Failed to delete category.");
  }
}

/**
 * Seeds default categories for a new user if they don't have any.
 * This should ideally be called once upon user creation/first login.
 */
export async function seedDefaultCategoriesForUser(userId: string): Promise<void> {
  if (!categoriesCollection) throw new Error("Categories collection is not available.");

  const userCategoriesQuery = categoriesCollection.where('userId', '==', userId).limit(1);
  const snapshot = await userCategoriesQuery.get();

  if (!snapshot.empty) {
    // User already has categories, no need to seed.
    return;
  }

  const defaultCategories: Omit<Category, 'id' | 'createdAt' | 'updatedAt' | 'userId'>[] = [
    { name: 'Salary', type: 'income', icon: 'Landmark', color: '#4CAF50', isSystemCategory: true },
    { name: 'Other Income', type: 'income', icon: 'DollarSign', color: '#8BC34A', isSystemCategory: true },
    { name: 'Housing', type: 'expense', icon: 'Home', color: '#F44336', isSystemCategory: true },
    { name: 'Transportation', type: 'expense', icon: 'Car', color: '#FF9800', isSystemCategory: true },
    { name: 'Food & Groceries', type: 'expense', icon: 'ShoppingCart', color: '#FFC107', isSystemCategory: true },
    { name: 'Utilities', type: 'expense', icon: 'Lightbulb', color: '#03A9F4', isSystemCategory: true },
    { name: 'Healthcare', type: 'expense', icon: 'HeartPulse', color: '#E91E63', isSystemCategory: true },
    { name: 'Personal Care', type: 'expense', icon: 'Sparkles', color: '#9C27B0', isSystemCategory: true },
    { name: 'Entertainment', type: 'expense', icon: 'Gamepad2', color: '#673AB7', isSystemCategory: true },
    { name: 'Education', type: 'expense', icon: 'GraduationCap', color: '#3F51B5', isSystemCategory: true },
    { name: 'Savings & Investments', type: 'expense', icon: 'PiggyBank', color: '#009688', isSystemCategory: true }, // Expense type for transfers out
    { name: 'Debt Payments', type: 'expense', icon: 'CreditCard', color: '#795548', isSystemCategory: true },
    { name: 'Miscellaneous', type: 'expense', icon: 'Package', color: '#9E9E9E', isSystemCategory: true },
  ];

  const batch = firestore!.batch(); // firestore is checked at the top
  const now = FieldValue.serverTimestamp() as Timestamp;

  defaultCategories.forEach(cat => {
    const newCatRef = categoriesCollection!.doc(); // categoriesCollection is checked
    const categoryData: Category = {
      ...cat,
      id: newCatRef.id,
      userId: userId,
      createdAt: now,
      updatedAt: now,
    };
    batch.set(newCatRef, categoryData);
  });

  try {
    await batch.commit();
    console.log(`Default categories seeded for user ${userId}`);
  } catch (error) {
    console.error(`Error seeding default categories for user ${userId}:`, error);
    // Non-critical, so don't throw, but log it.
  }
}

// We might want to call seedDefaultCategoriesForUser from userService.syncUser when a new user is created.
// Or have a separate mechanism. For now, it's a callable service function.

