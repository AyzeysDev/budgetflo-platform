// apps/api/src/services/budgetService.ts
import { firestore, firebaseInitialized } from '../config/firebase';
import {
  Budget,
  CreateBudgetPayload,
  UpdateBudgetPayload,
  BudgetDTO,
  CategoryDTO, // Added for category validation
  RecurringBudget
} from '../models/budget.model';
import { Timestamp, FieldValue, CollectionReference, WriteBatch } from 'firebase-admin/firestore';
import { getCategoryById } from './categoryService'; // To validate category existence

if (!firebaseInitialized || !firestore) {
  console.error("BudgetService: Firebase is not initialized. Budget operations will fail.");
}

const getBudgetsCollection = (): CollectionReference<Budget> => {
  if (!firestore) {
    throw new Error("Firestore is not initialized. Cannot access budgets collection.");
  }
  return firestore.collection('budgets') as CollectionReference<Budget>;
};

const getRecurringBudgetsCollection = (): CollectionReference<RecurringBudget> => {
    if (!firestore) {
        throw new Error("Firestore is not initialized. Cannot access recurringBudgets collection.");
    }
    return firestore.collection('recurringBudgets') as CollectionReference<RecurringBudget>;
}

function convertBudgetToDTO(budgetData: Budget | undefined, source?: 'explicit' | 'recurring'): BudgetDTO | null {
  if (!budgetData) return null;

  const dto: BudgetDTO = {
    id: budgetData.id,
    userId: budgetData.userId,
    name: budgetData.name,
    categoryId: budgetData.categoryId || null,
    amount: budgetData.amount,
    spentAmount: budgetData.spentAmount || 0,
    period: budgetData.period,
    startDate: budgetData.startDate instanceof Timestamp ? budgetData.startDate.toDate().toISOString() : String(budgetData.startDate),
    endDate: budgetData.endDate instanceof Timestamp ? budgetData.endDate.toDate().toISOString() : String(budgetData.endDate),
    isRecurring: budgetData.isRecurring,
    isOverall: budgetData.isOverall || false,
    notes: budgetData.notes || null,
    createdAt: budgetData.createdAt instanceof Timestamp ? budgetData.createdAt.toDate().toISOString() : String(budgetData.createdAt),
    updatedAt: budgetData.updatedAt instanceof Timestamp ? budgetData.updatedAt.toDate().toISOString() : String(budgetData.updatedAt),
    source: source || 'explicit',
  };
  return dto;
}

export async function createBudget(userId: string, payload: CreateBudgetPayload): Promise<BudgetDTO | null> {
  const budgetsCollection = getBudgetsCollection();
  const now = FieldValue.serverTimestamp() as Timestamp;

  if (payload.amount <= 0) {
    throw new Error("Budget amount must be positive.");
  }

  let categoryIdForDb: string | null = null;

  if (!payload.isOverall) {
    if (typeof payload.categoryId === 'string' && payload.categoryId.trim() !== '') {
      const category: CategoryDTO | null = await getCategoryById(payload.categoryId, userId);
      if (!category) {
        throw new Error(`Category with ID ${payload.categoryId} not found or not accessible by user ${userId}.`);
      }
      if (!category.includeInBudget) {
        throw new Error(`Category "${category.name}" is not marked for inclusion in budgets.`);
      }
      categoryIdForDb = payload.categoryId;
    } else {
      throw new Error("A valid categoryId is required for category-specific budgets.");
    }
  }

  const newBudgetRef = budgetsCollection.doc();
  const budgetData: Budget = {
    id: newBudgetRef.id,
    userId: userId,
    name: payload.name,
    categoryId: categoryIdForDb,
    amount: payload.amount,
    spentAmount: 0,
    period: payload.period,
    startDate: Timestamp.fromDate(new Date(payload.startDate)),
    endDate: Timestamp.fromDate(new Date(payload.endDate)),
    isRecurring: payload.isRecurring,
    isOverall: payload.isOverall || false,
    notes: payload.notes || null,
    createdAt: now,
    updatedAt: now,
  };

  try {
    if (budgetData.isOverall) {
      const existingOverallQuery = budgetsCollection
        .where('userId', '==', userId)
        .where('isOverall', '==', true)
        .where('period', '==', budgetData.period)
        .where('startDate', '==', budgetData.startDate);

      const existingSnapshot = await existingOverallQuery.get();
      if (!existingSnapshot.empty) {
        throw new Error(`An overall budget for this user and period (starting ${new Date(payload.startDate).toLocaleDateString()}) already exists. Use update instead.`);
      }
    }

    await newBudgetRef.set(budgetData);
    const docSnapshot = await newBudgetRef.get();
    return convertBudgetToDTO(docSnapshot.data());
  } catch (error) {
    console.error("Error creating budget in Firestore:", error);
    if (error instanceof Error) throw error;
    throw new Error("Failed to create budget.");
  }
}

export async function getBudgetsByUserId(
  userId: string,
  options?: { isOverall?: boolean; activeOnly?: boolean; period?: Budget['period'], year?: number, month?: number }
): Promise<BudgetDTO[]> {
  const budgetsCollection = getBudgetsCollection();
  try {
    const query = budgetsCollection.where('userId', '==', userId);
    const snapshot = await query.get();

    if (snapshot.empty) {
      return [];
    }
    
    let budgets = snapshot.docs.map(doc => convertBudgetToDTO(doc.data())).filter(Boolean) as BudgetDTO[];
    
    if (options?.isOverall !== undefined) {
      budgets = budgets.filter(budget => budget.isOverall === options.isOverall);
    }
    
    if (options?.period) {
      budgets = budgets.filter(budget => budget.period === options.period);
    }
    
    if (options?.activeOnly) {
      const now = new Date();
      budgets = budgets.filter(budget => {
        const startDate = new Date(budget.startDate);
        const endDate = new Date(budget.endDate);
        return endDate >= now && startDate <= now;
      });
    } else if (options?.year && options?.month) {
      budgets = budgets.filter(budget => {
        const startDate = new Date(budget.startDate);
        return startDate.getFullYear() === options.year && startDate.getMonth() === (options.month! - 1);
      });
    } else if (options?.year) {
      budgets = budgets.filter(budget => {
        const startDate = new Date(budget.startDate);
        return startDate.getFullYear() === options.year;
      });
    }

    return budgets.sort((a, b) => {
      if (a.isOverall && !b.isOverall) return -1;
      if (!a.isOverall && b.isOverall) return 1;
      
      const aDate = new Date(a.startDate).getTime();
      const bDate = new Date(b.startDate).getTime();
      if (aDate !== bDate) return bDate - aDate;
      
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error(`Error fetching budgets for user ${userId}:`, error);
    throw new Error("Failed to fetch budgets.");
  }
}

export async function getBudgetById(budgetId: string, userId: string): Promise<BudgetDTO | null> {
  const budgetsCollection = getBudgetsCollection();
  try {
    const docRef = budgetsCollection.doc(budgetId);
    const doc = await docRef.get();

    if (!doc.exists) {
      return null;
    }
    const budget = doc.data();
    if (budget?.userId !== userId) {
      throw new Error("Unauthorized to access this budget.");
    }
    return convertBudgetToDTO(budget);
  } catch (error) {
    console.error(`Error fetching budget ${budgetId}:`, error);
    if (error instanceof Error && error.message.includes("Unauthorized")) throw error;
    throw new Error("Failed to fetch budget.");
  }
}

export async function updateBudget(budgetId: string, userId: string, payload: UpdateBudgetPayload): Promise<BudgetDTO | null> {
  const budgetsCollection = getBudgetsCollection();
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

    const dataToUpdate: Partial<Omit<Budget, 'id' | 'userId' | 'createdAt' | 'spentAmount'>> & { updatedAt: Timestamp } = {
      updatedAt: FieldValue.serverTimestamp() as Timestamp,
    };

    let hasChanges = false;

    if (payload.name !== undefined && payload.name !== existingBudget.name) { dataToUpdate.name = payload.name; hasChanges = true; }
    if (payload.amount !== undefined && payload.amount !== existingBudget.amount) {
        if (payload.amount <= 0) throw new Error("Budget amount must be positive.");
        dataToUpdate.amount = payload.amount; hasChanges = true;
    }
    if (payload.period !== undefined && payload.period !== existingBudget.period) { dataToUpdate.period = payload.period; hasChanges = true; }
    if (payload.startDate !== undefined && new Date(payload.startDate).toISOString() !== (existingBudget.startDate as Timestamp).toDate().toISOString()) {
        dataToUpdate.startDate = Timestamp.fromDate(new Date(payload.startDate)); hasChanges = true;
    }
    if (payload.endDate !== undefined && new Date(payload.endDate).toISOString() !== (existingBudget.endDate as Timestamp).toDate().toISOString()) {
        dataToUpdate.endDate = Timestamp.fromDate(new Date(payload.endDate)); hasChanges = true;
    }
    if (dataToUpdate.startDate && dataToUpdate.endDate && (dataToUpdate.endDate as Timestamp) < (dataToUpdate.startDate as Timestamp)) {
        throw new Error("End date must be on or after start date.");
    }
    if (payload.isRecurring !== undefined && payload.isRecurring !== existingBudget.isRecurring) { dataToUpdate.isRecurring = payload.isRecurring; hasChanges = true; }
    if (payload.notes !== undefined && payload.notes !== existingBudget.notes) { dataToUpdate.notes = payload.notes; hasChanges = true; }
    
    let finalIsOverall = existingBudget.isOverall;
    if (payload.isOverall !== undefined && payload.isOverall !== existingBudget.isOverall) {
        finalIsOverall = payload.isOverall;
        dataToUpdate.isOverall = payload.isOverall;
        hasChanges = true;
    }

    if (payload.categoryId !== undefined) {
        if (finalIsOverall) {
            if (payload.categoryId !== null) {
                 throw new Error('categoryId must be null for an overall budget.');
            }
            if (existingBudget.categoryId !== null) {
                dataToUpdate.categoryId = null;
                hasChanges = true;
            }
        } else {
            if (typeof payload.categoryId === 'string' && payload.categoryId.trim() !== '') {
                if (payload.categoryId !== existingBudget.categoryId) {
                    const category = await getCategoryById(payload.categoryId, userId);
                    if (!category) throw new Error(`Invalid categoryId: ${payload.categoryId}`);
                    if (!category.includeInBudget) throw new Error(`Category "${category.name}" is not marked for inclusion in budgets.`);
                    dataToUpdate.categoryId = payload.categoryId;
                    hasChanges = true;
                }
            } else {
                throw new Error("A valid categoryId is required for category-specific budgets during update if changing categoryId.");
            }
        }
    } else if (dataToUpdate.isOverall === true && existingBudget.categoryId !== null) {
        dataToUpdate.categoryId = null;
        hasChanges = true;
    }

    if (!hasChanges && Object.keys(dataToUpdate).length === 1) {
      console.log("No actual changes to update for budget:", budgetId);
      return convertBudgetToDTO(existingBudget);
    }

    await budgetRef.update(dataToUpdate);
    const updatedDoc = await budgetRef.get();
    return convertBudgetToDTO(updatedDoc.data());
  } catch (error) {
    console.error(`Error updating budget ${budgetId}:`, error);
    if (error instanceof Error) throw error;
    throw new Error("Failed to update budget.");
  }
}

export async function deleteBudget(budgetId: string, userId: string): Promise<boolean> {
  const budgetsCollection = getBudgetsCollection();
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

    await budgetRef.delete();
    return true;
  } catch (error) {
    console.error(`Error deleting budget ${budgetId}:`, error);
    if (error instanceof Error && error.message.includes("Unauthorized")) throw error;
    throw new Error("Failed to delete budget.");
  }
}

export async function setOverallBudget(
  userId: string,
  payload: { amount: number; period: 'monthly' | 'yearly'; year: number; month?: number; notes?: string | null; isRecurring: boolean; }
): Promise<BudgetDTO | null> {
    const budgetsCollection = getBudgetsCollection();
    const recurringBudgetsCollection = getRecurringBudgetsCollection();
    const recurringBudgetRef = recurringBudgetsCollection.doc(userId);

    if (payload.amount <= 0) {
        throw new Error("Overall budget amount must be positive.");
    }

    let startDate: Date;
    let endDate: Date;
    let budgetName: string;

    if (payload.period === 'monthly') {
        if (payload.month === undefined || payload.month < 1 || payload.month > 12) {
            throw new Error("Month is required for monthly overall budget.");
        }
        startDate = new Date(payload.year, payload.month - 1, 1);
        endDate = new Date(payload.year, payload.month, 0, 23, 59, 59, 999);
        budgetName = `Overall Budget - ${startDate.toLocaleString('default', { month: 'long' })} ${payload.year}`;
    } else {
        throw new Error("Only monthly recurring budgets are supported at this time.");
    }

    try {
        if (!firestore) {
            throw new Error("Firestore is not initialized. Cannot perform batch operations.");
        }
        const batch = firestore.batch();
        const recurringDoc = await recurringBudgetRef.get();

        if (payload.isRecurring) {
            const recurringData: RecurringBudget = {
                userId,
                amount: payload.amount,
                period: 'monthly',
                active: true,
                updatedAt: FieldValue.serverTimestamp() as Timestamp
            };
            batch.set(recurringBudgetRef, recurringData, { merge: true });
        } else {
            if (recurringDoc.exists) {
                batch.update(recurringBudgetRef, { active: false, updatedAt: FieldValue.serverTimestamp() });
            }
        }

        const explicitBudgetQuery = budgetsCollection
            .where('userId', '==', userId)
            .where('isOverall', '==', true)
            .where('startDate', '==', Timestamp.fromDate(startDate));
        
        const explicitBudgetSnapshot = await explicitBudgetQuery.get();
        const existingExplicitBudgetDoc = explicitBudgetSnapshot.docs[0];

        if (existingExplicitBudgetDoc) {
            batch.update(existingExplicitBudgetDoc.ref, { 
                amount: payload.amount, 
                notes: payload.notes || null,
                isRecurring: payload.isRecurring,
                updatedAt: FieldValue.serverTimestamp()
            });
        } else {
            const newBudgetRef = budgetsCollection.doc();
            const newBudgetData: Budget = {
                id: newBudgetRef.id,
                userId,
                name: budgetName,
                categoryId: null,
                amount: payload.amount,
                spentAmount: 0,
                period: 'monthly',
                startDate: Timestamp.fromDate(startDate),
                endDate: Timestamp.fromDate(endDate),
                isRecurring: payload.isRecurring,
                isOverall: true,
                notes: payload.notes || null,
                createdAt: FieldValue.serverTimestamp() as Timestamp,
                updatedAt: FieldValue.serverTimestamp() as Timestamp,
            };
            batch.set(newBudgetRef, newBudgetData);
        }

        await batch.commit();

        return getOverallBudgetForPeriod(userId, 'monthly', payload.year, payload.month);
    } catch (error) {
        console.error("Error in setOverallBudget operation:", error);
        throw new Error("Failed to set overall budget.");
    }
}

export async function getOverallBudgetForPeriod(
  userId: string,
  period: 'monthly' | 'yearly',
  year: number,
  month?: number
): Promise<BudgetDTO | null> {
    const budgetsCollection = getBudgetsCollection();

    if (period !== 'monthly') {
        throw new Error("Only monthly budgets are currently supported for this operation.");
    }
    if (month === undefined || month < 1 || month > 12) {
        throw new Error("Month is required for getOverallBudgetForPeriod.");
    }
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const query = budgetsCollection
        .where('userId', '==', userId)
        .where('isOverall', '==', true)
        .where('startDate', '==', Timestamp.fromDate(startDate));

    const snapshot = await query.get();
    if (!snapshot.empty) {
        const explicitBudget = snapshot.docs[0].data();
        return convertBudgetToDTO(explicitBudget, 'explicit');
    }

    const recurringBudgetsCollection = getRecurringBudgetsCollection();
    const recurringBudgetRef = recurringBudgetsCollection.doc(userId);
    const recurringDoc = await recurringBudgetRef.get();

    if (recurringDoc.exists) {
        const recurringData = recurringDoc.data() as RecurringBudget;
        if (recurringData.active) {
            const budgetFromRecurring: Budget = {
                id: `recurring-${userId}-${year}-${month}`,
                userId: userId,
                name: `Overall Budget - ${startDate.toLocaleString('default', { month: 'long' })} ${year}`,
                categoryId: null,
                amount: recurringData.amount,
                spentAmount: 0,
                period: 'monthly',
                startDate: Timestamp.fromDate(startDate),
                endDate: Timestamp.fromDate(endDate),
                isRecurring: true,
                isOverall: true,
                notes: "This budget is based on your recurring template.",
                createdAt: recurringData.updatedAt,
                updatedAt: recurringData.updatedAt,
            };
            return convertBudgetToDTO(budgetFromRecurring, 'recurring');
        }
    }

    return null;
}


export async function updateBudgetSpentAmount(
  budgetId: string,
  userId: string,
  amountChange: number,
  transaction?: FirebaseFirestore.Transaction
): Promise<void> {
  const budgetsCollection = getBudgetsCollection();
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

      const currentSpent = budgetData.spentAmount || 0;
      const newSpentAmount = currentSpent + amountChange;
      trans.update(budgetRef, {
        spentAmount: newSpentAmount,
        updatedAt: FieldValue.serverTimestamp()
      });
    };

    const firestoreInstance = firestore;
    if (!firestoreInstance) {
        throw new Error("Firestore is not initialized for transaction.");
    }

    if (transaction) {
      await updateFn(transaction);
    } else {
      await firestoreInstance.runTransaction(updateFn);
    }
    console.log(`Budget ${budgetId} spent amount updated by ${amountChange}. New total spent: ${(await budgetRef.get()).data()?.spentAmount}`);
  } catch (error) {
    console.error(`Error updating spent amount for budget ${budgetId}:`, error);
    throw new Error(`Failed to update spent amount for budget ${budgetId}.`);
  }
}
