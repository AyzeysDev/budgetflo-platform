// apps/api/src/services/budgetService.ts
import { firestore, firebaseInitialized } from '../config/firebase';
import { 
  Budget, 
  CreateBudgetPayload, 
  UpdateBudgetPayload,
  BudgetDTO 
} from '../models/budget.model';
import { Timestamp, FieldValue, CollectionReference } from 'firebase-admin/firestore';
import { getCategoryById } from './categoryService'; // To validate category existence

if (!firebaseInitialized || !firestore) {
  console.error("BudgetService: Firebase is not initialized. Budget operations will fail.");
}

const budgetsCollection = firestore?.collection('budgets') as CollectionReference<BudgetDTO | Budget> | undefined;

/**
 * Converts Firestore Timestamps in a budget object to ISO date strings.
 */
function convertBudgetTimestampsToISO(budgetData: Budget | undefined): BudgetDTO | null {
  if (!budgetData) return null;
  
  const dto: BudgetDTO = {
    id: budgetData.id,
    userId: budgetData.userId,
    name: budgetData.name,
    categoryId: budgetData.categoryId,
    amount: budgetData.amount,
    spentAmount: budgetData.spentAmount, // This will be calculated later
    period: budgetData.period,
    startDate: budgetData.startDate instanceof Timestamp ? budgetData.startDate.toDate().toISOString() : String(budgetData.startDate),
    endDate: budgetData.endDate instanceof Timestamp ? budgetData.endDate.toDate().toISOString() : String(budgetData.endDate),
    isRecurring: budgetData.isRecurring,
    notes: budgetData.notes,
    createdAt: budgetData.createdAt instanceof Timestamp ? budgetData.createdAt.toDate().toISOString() : String(budgetData.createdAt),
    updatedAt: budgetData.updatedAt instanceof Timestamp ? budgetData.updatedAt.toDate().toISOString() : String(budgetData.updatedAt),
  };
  return dto;
}

/**
 * Creates a new budget for a user.
 */
export async function createBudget(userId: string, payload: CreateBudgetPayload): Promise<BudgetDTO | null> {
  if (!budgetsCollection) throw new Error("Budgets collection is not available.");

  // Validate categoryId
  const category = await getCategoryById(payload.categoryId, userId);
  if (!category) {
    throw new Error(`Category with ID ${payload.categoryId} not found or not accessible by user ${userId}.`);
  }
  if (category.type === 'income' && payload.amount > 0) {
      // Typically budgets are for expenses. If income budgeting is different, adjust logic.
      // For now, let's assume amount is always positive and represents an expense limit or income target.
  }
  if (payload.amount <= 0) {
      throw new Error("Budget amount must be positive.");
  }

  const now = FieldValue.serverTimestamp() as Timestamp;
  const newBudgetRef = budgetsCollection.doc();
  
  const budgetData: Budget = {
    id: newBudgetRef.id,
    userId: userId,
    name: payload.name,
    categoryId: payload.categoryId,
    amount: payload.amount,
    spentAmount: 0, // Initial spent amount is 0
    period: payload.period,
    startDate: Timestamp.fromDate(new Date(payload.startDate)), // Convert ISO string to Timestamp
    endDate: Timestamp.fromDate(new Date(payload.endDate)),     // Convert ISO string to Timestamp
    isRecurring: payload.isRecurring,
    notes: payload.notes || null,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await newBudgetRef.set(budgetData);
    const docSnapshot = await newBudgetRef.get();
    return convertBudgetTimestampsToISO(docSnapshot.data() as Budget | undefined);
  } catch (error) {
    console.error("Error creating budget in Firestore:", error);
    throw new Error("Failed to create budget.");
  }
}

/**
 * Retrieves all budgets for a specific user, optionally filtered by period or active status.
 */
export async function getBudgetsByUserId(userId: string, activeOnly?: boolean): Promise<BudgetDTO[]> {
  if (!budgetsCollection) throw new Error("Budgets collection is not available.");
  
  try {
    let query = budgetsCollection.where('userId', '==', userId);
    
    if (activeOnly) {
      const now = Timestamp.now();
      // This query is more complex: budgets active now.
      // For simplicity, let's assume "active" means endDate is in the future for now.
      // A more robust solution might involve querying based on current month/year for monthly/yearly budgets.
      query = query.where('endDate', '>=', now);
    }
    
    const snapshot = await query.orderBy('endDate', 'desc').orderBy('name', 'asc').get();
    
    if (snapshot.empty) {
      return [];
    }
    return snapshot.docs.map(doc => convertBudgetTimestampsToISO(doc.data() as Budget | undefined)).filter(Boolean) as BudgetDTO[];
  } catch (error) {
    console.error(`Error fetching budgets for user ${userId}:`, error);
    throw new Error("Failed to fetch budgets.");
  }
}

/**
 * Retrieves a specific budget by its ID and userId.
 */
export async function getBudgetById(budgetId: string, userId: string): Promise<BudgetDTO | null> {
  if (!budgetsCollection) throw new Error("Budgets collection is not available.");

  try {
    const docRef = budgetsCollection.doc(budgetId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return null;
    }
    const budget = doc.data() as Budget | undefined;
    if (budget?.userId !== userId) {
        throw new Error("Unauthorized to access this budget.");
    }
    return convertBudgetTimestampsToISO(budget);
  } catch (error) {
    console.error(`Error fetching budget ${budgetId}:`, error);
    if (error instanceof Error && error.message.includes("Unauthorized")) throw error;
    throw new Error("Failed to fetch budget.");
  }
}

/**
 * Updates an existing budget for a user.
 * spentAmount is not updatable through this function.
 */
export async function updateBudget(budgetId: string, userId: string, payload: UpdateBudgetPayload): Promise<BudgetDTO | null> {
  if (!budgetsCollection) throw new Error("Budgets collection is not available.");

  const budgetRef = budgetsCollection.doc(budgetId);
  
  try {
    const doc = await budgetRef.get();
    if (!doc.exists) {
      return null; 
    }
    const existingBudget = doc.data() as Budget;
    if (existingBudget.userId !== userId) {
      throw new Error("Unauthorized to update this budget.");
    }

    if (payload.categoryId) {
      const category = await getCategoryById(payload.categoryId, userId);
      if (!category) {
        throw new Error(`Invalid categoryId: ${payload.categoryId} not found or not accessible.`);
      }
    }
    if (payload.amount !== undefined && payload.amount <= 0) {
        throw new Error("Budget amount must be positive.");
    }

    const dataToUpdate: Partial<Omit<Budget, 'id' | 'userId' | 'createdAt' | 'spentAmount'>> & { updatedAt: Timestamp } = {
      updatedAt: FieldValue.serverTimestamp() as Timestamp,
    };

    if (payload.name !== undefined) dataToUpdate.name = payload.name;
    if (payload.categoryId !== undefined) dataToUpdate.categoryId = payload.categoryId;
    if (payload.amount !== undefined) dataToUpdate.amount = payload.amount;
    if (payload.period !== undefined) dataToUpdate.period = payload.period;
    if (payload.startDate !== undefined) dataToUpdate.startDate = Timestamp.fromDate(new Date(payload.startDate));
    if (payload.endDate !== undefined) dataToUpdate.endDate = Timestamp.fromDate(new Date(payload.endDate));
    if (payload.isRecurring !== undefined) dataToUpdate.isRecurring = payload.isRecurring;
    if (payload.notes !== undefined) dataToUpdate.notes = payload.notes;
    
    if (Object.keys(dataToUpdate).length <= 1) { // Only updatedAt
        console.log("No fields to update for budget:", budgetId);
        return convertBudgetTimestampsToISO(existingBudget);
    }

    await budgetRef.update(dataToUpdate);
    
    const updatedDoc = await budgetRef.get();
    return convertBudgetTimestampsToISO(updatedDoc.data() as Budget | undefined);
  } catch (error) {
    console.error(`Error updating budget ${budgetId}:`, error);
    if (error instanceof Error && (error.message.includes("Unauthorized") || error.message.includes("Invalid categoryId") || error.message.includes("Budget amount must be positive"))) {
        throw error;
    }
    throw new Error("Failed to update budget.");
  }
}

/**
 * Deletes a budget for a user.
 * TODO: Consider implications for linked transactions (e.g., unlinking them).
 */
export async function deleteBudget(budgetId: string, userId: string): Promise<boolean> {
  if (!budgetsCollection) throw new Error("Budgets collection is not available.");
  
  const budgetRef = budgetsCollection.doc(budgetId);
  try {
    const doc = await budgetRef.get();
    if (!doc.exists) {
      return false; 
    }
    const budget = doc.data() as Budget;
    if (budget.userId !== userId) {
      throw new Error("Unauthorized to delete this budget.");
    }

    // TODO: Handle unlinking transactions or other cleanup if necessary
    await budgetRef.delete();
    return true;
  } catch (error) {
    console.error(`Error deleting budget ${budgetId}:`, error);
    if (error instanceof Error && error.message.includes("Unauthorized")) throw error;
    throw new Error("Failed to delete budget.");
  }
}

/**
 * Updates the spentAmount for a given budget.
 * This should be called internally when transactions are created/updated/deleted.
 * @param budgetId The ID of the budget to update.
 * @param amountChange The amount to add (positive for expense, negative for refund/correction).
 * @param transaction Firestore transaction context (optional, for atomicity).
 */
export async function updateBudgetSpentAmount(
  budgetId: string,
  userId: string, // Ensure the budget belongs to the user initiating the transaction change
  amountChange: number,
  transaction?: FirebaseFirestore.Transaction
): Promise<void> {
  if (!budgetsCollection) throw new Error("Budgets collection is not available.");
  const budgetRef = budgetsCollection.doc(budgetId);

  try {
    const updateFn = async (trans: FirebaseFirestore.Transaction) => {
      const budgetDoc = await trans.get(budgetRef);
      if (!budgetDoc.exists) {
        throw new Error(`Budget with ID ${budgetId} not found for updating spent amount.`);
      }
      const budgetData = budgetDoc.data() as Budget;
      if (budgetData.userId !== userId) {
        throw new Error(`User ${userId} is not authorized to update spent amount for budget ${budgetId}.`);
      }
      
      const newSpentAmount = (budgetData.spentAmount || 0) + amountChange;
      trans.update(budgetRef, { 
        spentAmount: newSpentAmount,
        updatedAt: FieldValue.serverTimestamp() 
      });
    };

    if (transaction) {
      await updateFn(transaction);
    } else {
      await firestore!.runTransaction(updateFn);
    }
    console.log(`Budget ${budgetId} spent amount updated by ${amountChange}.`);
  } catch (error) {
    console.error(`Error updating spent amount for budget ${budgetId}:`, error);
    throw new Error(`Failed to update spent amount for budget ${budgetId}.`);
  }
}
