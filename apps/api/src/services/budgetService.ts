// apps/api/src/services/budgetService.ts
import { firestore, firebaseInitialized } from '../config/firebase';
import {
  Budget,
  RecurringBudget,
  MonthlyBudget,
  CreateBudgetPayload,
  UpdateBudgetPayload,
  CreateRecurringBudgetPayload,
  UpdateRecurringBudgetPayload,
  BudgetDTO,
  CategoryDTO,
} from '../models/budget.model';
import { Timestamp, FieldValue, CollectionReference } from 'firebase-admin/firestore';
import { getCategoryById } from './categoryService';
import { getTransactionsByUserId } from './transactionService';
import { TransactionDTO } from '../models/transaction.model';
import { RRule } from 'rrule';

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
    throw new Error("Firestore is not initialized. Cannot access recurring budgets collection.");
  }
  return firestore.collection('recurringBudgets') as CollectionReference<RecurringBudget>;
};

const getMonthlyBudgetsCollection = (): CollectionReference<MonthlyBudget> => {
  if (!firestore) {
    throw new Error("Firestore is not initialized. Cannot access monthly budgets collection.");
  }
  return firestore.collection('monthlyBudgets') as CollectionReference<MonthlyBudget>;
};

function convertBudgetToDTO(budgetData: Budget | undefined): BudgetDTO | null {
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
    isOverall: budgetData.isOverall || false,
    notes: budgetData.notes || null,
    createdAt: budgetData.createdAt instanceof Timestamp ? budgetData.createdAt.toDate().toISOString() : String(budgetData.createdAt),
    updatedAt: budgetData.updatedAt instanceof Timestamp ? budgetData.updatedAt.toDate().toISOString() : String(budgetData.updatedAt),
  };
  return dto;
}

// Original budget functions
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
    isOverall: payload.isOverall || false,
    isRecurring: false, // Will be set to true if recurring rule is created
    recurringRuleId: null,
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
    
    // If isRecurring is true, create a recurring budget rule
    if (payload.isRecurring && payload.recurrenceRule) {
      const recurringBudget = await createRecurringBudget(userId, {
        name: payload.name,
        categoryId: categoryIdForDb,
        amount: payload.amount,
        recurrenceRule: payload.recurrenceRule,
        startDate: payload.startDate,
        endDate: payload.endDate || null,
        isOverall: payload.isOverall,
        notes: payload.notes,
      });
      
      // Update the budget with the recurring rule ID
      await newBudgetRef.update({
        isRecurring: true,
        recurringRuleId: recurringBudget.id
      });
      budgetData.isRecurring = true;
      budgetData.recurringRuleId = recurringBudget.id;
    }
    
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

    // If budget has a recurring rule, delete it too
    if (budget.isRecurring && budget.recurringRuleId) {
      await deleteRecurringBudget(budget.recurringRuleId, userId);
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
  payload: { amount: number; period: 'monthly' | 'yearly'; year: number; month?: number; notes?: string | null; isRecurring?: boolean; recurrenceRule?: string }
): Promise<BudgetDTO | null> {
  const budgetsCollection = getBudgetsCollection();
  const now = FieldValue.serverTimestamp();

  // 1. Define the period
  let startDate: Date;
  let endDate: Date;

  if (payload.period === 'monthly' && payload.month) {
    startDate = new Date(Date.UTC(payload.year, payload.month - 1, 1));
    endDate = new Date(Date.UTC(payload.year, payload.month, 0));
  } else if (payload.period === 'yearly') {
    startDate = new Date(Date.UTC(payload.year, 0, 1));
    endDate = new Date(Date.UTC(payload.year, 11, 31));
  } else {
    throw new Error("Invalid period specified. For 'monthly' period, 'month' is required.");
  }

  // 2. Find existing overall budget for the specific period
  const existingBudgetQuery = budgetsCollection
    .where('userId', '==', userId)
    .where('isOverall', '==', true)
    .where('period', '==', payload.period)
    .where('startDate', '==', Timestamp.fromDate(startDate));
    
  const snapshot = await existingBudgetQuery.get();
  let budgetId: string;
  let existingBudget: Budget | undefined;

  if (!snapshot.empty) {
    const budgetDoc = snapshot.docs[0];
    budgetId = budgetDoc.id;
    existingBudget = budgetDoc.data() as Budget;
  }

  const upsertData: Partial<Omit<Budget, 'createdAt' | 'updatedAt'>> & { updatedAt: FieldValue } = {
    amount: payload.amount,
    notes: payload.notes || null,
    updatedAt: now,
  };

  // 3. Handle recurring logic
  if (payload.isRecurring && payload.recurrenceRule) {
    upsertData.isRecurring = true;
    if (existingBudget?.recurringRuleId) {
      // Update existing recurring rule
      await updateRecurringBudget(existingBudget.recurringRuleId, userId, { 
        amount: payload.amount,
        recurrenceRule: payload.recurrenceRule,
        notes: payload.notes,
      });
    } else {
      // Create new recurring rule
      const newRecurringBudget = await createRecurringBudget(userId, {
        name: `Overall ${payload.period} budget`,
        amount: payload.amount,
        recurrenceRule: payload.recurrenceRule,
        startDate: startDate.toISOString(),
        endDate: null, 
        isOverall: true,
        notes: payload.notes
      });
      upsertData.recurringRuleId = newRecurringBudget.id;
    }
  } else {
    // If it's NOT recurring, ensure these fields are set to false/null
    upsertData.isRecurring = false;
    upsertData.recurringRuleId = null;
    if (existingBudget?.recurringRuleId) {
      // If it was recurring before, delete the old rule
      await deleteRecurringBudget(existingBudget.recurringRuleId, userId);
    }
  }

  // 4. Upsert the budget document
  if (existingBudget) {
    // Update existing document
    const budgetRef = budgetsCollection.doc(budgetId!);
    await budgetRef.update(upsertData);
    const updatedDoc = await budgetRef.get();
    const updatedBudgetData = updatedDoc.data();

    // Recalculate spent amount after update
    const finalBudget = await getOverallBudgetForPeriod(userId, payload.period, payload.year, payload.month);
    return finalBudget;
  } else {
    // Create new document
    const newBudgetRef = budgetsCollection.doc();
    const newBudgetData: Budget = {
      id: newBudgetRef.id,
      userId: userId,
      name: `Overall ${payload.period} budget`,
      categoryId: null,
      amount: payload.amount,
      spentAmount: 0, // Initial spent amount is 0
      period: payload.period,
      startDate: Timestamp.fromDate(startDate),
      endDate: Timestamp.fromDate(endDate),
      isOverall: true,
      notes: payload.notes || null,
      isRecurring: upsertData.isRecurring || false,
      recurringRuleId: upsertData.recurringRuleId || null,
      createdAt: now as Timestamp,
      updatedAt: now as Timestamp,
    };
    await newBudgetRef.set(newBudgetData);
    const finalBudget = await getOverallBudgetForPeriod(userId, payload.period, payload.year, payload.month);
    return finalBudget;
  }
}

export async function getOverallBudgetForPeriod(
  userId: string,
  period: 'monthly' | 'yearly',
  year: number,
  month?: number
): Promise<BudgetDTO | null> {
  // 1. Check for an explicit budget for the period first
  let startDate: Date;
  if (period === 'monthly' && month) {
    startDate = new Date(Date.UTC(year, month - 1, 1));
  } else if (period === 'yearly') {
    startDate = new Date(Date.UTC(year, 0, 1));
  } else if (period === 'monthly' && !month) {
    throw new Error("Month is required for monthly period");
  } else {
    throw new Error("Invalid period specified");
  }

  const budgetsCollection = getBudgetsCollection();
  const explicitBudgetQuery = budgetsCollection
    .where('userId', '==', userId)
    .where('isOverall', '==', true)
    .where('period', '==', period)
    .where('startDate', '==', Timestamp.fromDate(startDate));

  const explicitSnapshot = await explicitBudgetQuery.get();

  let budgetToReturn: Budget | null = null;

  if (!explicitSnapshot.empty) {
    budgetToReturn = explicitSnapshot.docs[0].data() as Budget;
  } else {
    // 2. If no explicit budget, check for an active recurring overall budget
    const recurringBudgetsCollection = getRecurringBudgetsCollection();
    const recurringQuery = recurringBudgetsCollection
      .where('userId', '==', userId)
      .where('isOverall', '==', true);
      
    const recurringSnapshot = await recurringQuery.get();
    if (!recurringSnapshot.empty) {
      const now = new Date(Date.UTC(year, (month || 1) - 1, 15)); // Use 15th to avoid timezone day shifts
      
      for (const doc of recurringSnapshot.docs) {
        const recurring = doc.data() as RecurringBudget;
        const ruleStartDate = recurring.startDate instanceof Timestamp ? recurring.startDate.toDate() : new Date(recurring.startDate);
        const ruleOptions = RRule.parseString(recurring.recurrenceRule);
        
        // Ensure rule start date is in UTC for accurate RRule processing
        ruleOptions.dtstart = new Date(Date.UTC(ruleStartDate.getUTCFullYear(), ruleStartDate.getUTCMonth(), ruleStartDate.getUTCDate()));
        
        if (recurring.endDate) {
           ruleOptions.until = recurring.endDate instanceof Timestamp ? recurring.endDate.toDate() : new Date(recurring.endDate);
        }

        const rrule = new RRule(ruleOptions);
        
        const nextOccurrence = rrule.after(new Date(Date.UTC(year, (month || 1) - 1, 0)), true);
        
        if (nextOccurrence && nextOccurrence.getUTCFullYear() === year && nextOccurrence.getUTCMonth() === (month! - 1)) {
          // Found a recurring budget that applies to this month.
          // Construct a temporary Budget object from it to return.
          const endDate = new Date(Date.UTC(year, month!, 0));
          
          budgetToReturn = {
            id: recurring.id, // Use recurring budget's ID for reference
            userId: recurring.userId,
            name: recurring.name,
            categoryId: null,
            amount: recurring.amount,
            spentAmount: 0, // This will be calculated next
            period: 'monthly',
            startDate: Timestamp.fromDate(startDate),
            endDate: Timestamp.fromDate(endDate),
            isOverall: true,
            isRecurring: true,
            recurringRuleId: recurring.id,
            notes: recurring.notes,
            createdAt: recurring.createdAt instanceof Timestamp ? recurring.createdAt.toDate() : new Date(recurring.createdAt), // Convert to Date
            updatedAt: recurring.updatedAt instanceof Timestamp ? recurring.updatedAt.toDate() : new Date(recurring.updatedAt), // Convert to Date
          };
          break; // Exit after finding the first applicable rule
        }
      }
    }
  }

  // 3. If a budget (explicit or recurring) was found, calculate its spent amount
  if (budgetToReturn) {
    const transactions = await getTransactionsByUserId(userId, { 
      year: String(year), 
      month: month ? String(month) : undefined
    });
    
    // Filter for expenses that are not part of any category budget
    const relevantTransactions = transactions.filter(t => t.type === 'expense' && !t.categoryId);
    
    const spentAmount = relevantTransactions.reduce((sum, t) => sum + t.amount, 0);
    budgetToReturn.spentAmount = spentAmount;
    
    return convertBudgetToDTO(budgetToReturn);
  }

  // 4. If no budget found, return null
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

// New recurring budget functions
export async function createRecurringBudget(
  userId: string,
  payload: CreateRecurringBudgetPayload
): Promise<RecurringBudget> {
  const recurringBudgetsCollection = getRecurringBudgetsCollection();
  const now = FieldValue.serverTimestamp() as Timestamp;

  if (payload.amount <= 0) {
    throw new Error("Budget amount must be positive.");
  }

  // Validate category if not overall
  if (!payload.isOverall && payload.categoryId) {
    const category: CategoryDTO | null = await getCategoryById(payload.categoryId, userId);
    if (!category) {
      throw new Error(`Category with ID ${payload.categoryId} not found or not accessible.`);
    }
    if (!category.includeInBudget) {
      throw new Error(`Category "${category.name}" is not marked for inclusion in budgets.`);
    }
  }

  // Validate RRULE
  try {
    const rule = RRule.fromString(payload.recurrenceRule);
    if (!rule) {
      throw new Error("Invalid recurrence rule");
    }
  } catch (error) {
    throw new Error(`Invalid recurrence rule: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  const newBudgetRef = recurringBudgetsCollection.doc();
  const budgetData: RecurringBudget = {
    id: newBudgetRef.id,
    userId: userId,
    name: payload.name,
    categoryId: payload.categoryId || null,
    amount: payload.amount,
    recurrenceRule: payload.recurrenceRule,
    startDate: Timestamp.fromDate(new Date(payload.startDate)),
    endDate: payload.endDate ? Timestamp.fromDate(new Date(payload.endDate)) : null,
    isOverall: payload.isOverall || false,
    notes: payload.notes || null,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await newBudgetRef.set(budgetData);
    const docSnapshot = await newBudgetRef.get();
    return docSnapshot.data() as RecurringBudget;
  } catch (error) {
    console.error("Error creating recurring budget in Firestore:", error);
    throw new Error("Failed to create recurring budget.");
  }
}

export async function updateRecurringBudget(
  budgetId: string,
  userId: string,
  payload: UpdateRecurringBudgetPayload
): Promise<RecurringBudget> {
  const recurringBudgetsCollection = getRecurringBudgetsCollection();
  const budgetRef = recurringBudgetsCollection.doc(budgetId);

  try {
    const doc = await budgetRef.get();
    if (!doc.exists) {
      throw new Error("Budget not found.");
    }
    const existingBudget = doc.data() as RecurringBudget;
    if (existingBudget.userId !== userId) {
      throw new Error("Unauthorized to update this budget.");
    }

    const dataToUpdate: Partial<RecurringBudget> & { updatedAt: Timestamp } = {
      updatedAt: FieldValue.serverTimestamp() as Timestamp,
    };

    if (payload.name !== undefined) {
      dataToUpdate.name = payload.name;
    }
    if (payload.amount !== undefined) {
      if (payload.amount <= 0) {
        throw new Error("Budget amount must be positive.");
      }
      dataToUpdate.amount = payload.amount;
    }
    if (payload.recurrenceRule !== undefined) {
      // Validate RRULE
      try {
        const rule = RRule.fromString(payload.recurrenceRule);
        if (!rule) {
          throw new Error("Invalid recurrence rule");
        }
      } catch (error) {
        throw new Error(`Invalid recurrence rule: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      dataToUpdate.recurrenceRule = payload.recurrenceRule;
    }
    if (payload.endDate !== undefined) {
      dataToUpdate.endDate = payload.endDate ? Timestamp.fromDate(new Date(payload.endDate)) : null;
    }

    await budgetRef.update(dataToUpdate);
    const updatedDoc = await budgetRef.get();
    return updatedDoc.data() as RecurringBudget;
  } catch (error) {
    console.error(`Error updating recurring budget ${budgetId}:`, error);
    if (error instanceof Error) throw error;
    throw new Error("Failed to update recurring budget.");
  }
}

export async function getRecurringBudgetsByUserId(userId: string): Promise<RecurringBudget[]> {
  const recurringBudgetsCollection = getRecurringBudgetsCollection();
  try {
    const query = recurringBudgetsCollection.where('userId', '==', userId);
    const snapshot = await query.get();

    if (snapshot.empty) {
      return [];
    }

    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.error(`Error fetching recurring budgets for user ${userId}:`, error);
    throw new Error("Failed to fetch recurring budgets.");
  }
}

export async function deleteRecurringBudget(budgetId: string, userId: string): Promise<boolean> {
  const recurringBudgetsCollection = getRecurringBudgetsCollection();
  const budgetRef = recurringBudgetsCollection.doc(budgetId);
  
  try {
    const doc = await budgetRef.get();
    if (!doc.exists) {
      return false;
    }
    const budget = doc.data() as RecurringBudget;
    if (budget.userId !== userId) {
      throw new Error("Unauthorized to delete this budget.");
    }

    await budgetRef.delete();
    return true;
  } catch (error) {
    console.error(`Error deleting recurring budget ${budgetId}:`, error);
    if (error instanceof Error && error.message.includes("Unauthorized")) throw error;
    throw new Error("Failed to delete recurring budget.");
  }
}

export async function getMonthlyBudget(
  userId: string,
  year: number,
  month: number
): Promise<MonthlyBudget> {
  const monthlyBudgetsCollection = getMonthlyBudgetsCollection();
  const documentId = `${userId}_${year}-${month.toString().padStart(2, '0')}`;
  
  try {
    // First try to get cached monthly budget
    const monthlyBudgetRef = monthlyBudgetsCollection.doc(documentId);
    const monthlyBudgetDoc = await monthlyBudgetRef.get();
    
    // Check if cached data exists and is recent (within last hour)
    if (monthlyBudgetDoc.exists) {
      const data = monthlyBudgetDoc.data() as MonthlyBudget;
      const lastUpdate = data.updatedAt.toDate();
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      if (lastUpdate > hourAgo) {
        return data;
      }
    }
    
    // If no cache or stale, calculate from both regular and recurring budgets
    const regularBudgets = await getBudgetsByUserId(userId, { year, month });
    const recurringBudgets = await getRecurringBudgetsByUserId(userId);
    
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);
    
    // Calculate which budgets are active this month
    const categoryBreakdown: MonthlyBudget['categoryBreakdown'] = {};
    let totalBudgeted = 0;
    
    // Add regular budgets for this month
    for (const budget of regularBudgets) {
      if (budget.categoryId && !budget.isOverall) {
        categoryBreakdown[budget.categoryId] = {
          budgeted: budget.amount,
          spent: budget.spentAmount,
          budgetId: budget.id,
          name: budget.name
        };
        totalBudgeted += budget.amount;
      } else if (budget.isOverall) {
        // Handle overall budget separately if needed
        totalBudgeted = budget.amount;
      }
    }
    
    // Add recurring budgets that are active this month
    for (const budget of recurringBudgets) {
      const startDate = budget.startDate.toDate();
      const endDate = budget.endDate ? budget.endDate.toDate() : null;
      
      // Skip if budget hasn't started yet
      if (startDate > monthEnd) continue;
      
      // Skip if budget has ended
      if (endDate && endDate < monthStart) continue;
      
      try {
        // Parse RRULE and check if it occurs in this month
        const rule = RRule.fromString(budget.recurrenceRule);
        
        const occurrences = rule.between(monthStart, monthEnd, true);
        
        if (occurrences.length > 0 && budget.categoryId && !budget.isOverall) {
          // Budget is active this month
          const budgetAmount = budget.amount * occurrences.length;
          
          // If category already has a regular budget, add to it
          if (categoryBreakdown[budget.categoryId]) {
            categoryBreakdown[budget.categoryId].budgeted += budgetAmount;
          } else {
            categoryBreakdown[budget.categoryId] = {
              budgeted: budgetAmount,
              spent: 0, // Will be calculated next
              budgetId: budget.id,
              name: budget.name
            };
          }
          
          totalBudgeted += budgetAmount;
        }
      } catch (error) {
        console.error(`Error processing RRULE for budget ${budget.id}:`, error);
      }
    }
    
    // Get all transactions for this month
    const transactions = await getTransactionsByUserId(userId, {
      year: year.toString(),
      month: month.toString()
    });
    
    // Calculate spending per category
    let totalSpent = 0;
    for (const transaction of transactions) {
      if (transaction.type === 'expense' && transaction.categoryId) {
        if (categoryBreakdown[transaction.categoryId]) {
          categoryBreakdown[transaction.categoryId].spent += transaction.amount;
        }
        totalSpent += transaction.amount;
      }
    }
    
    // Create or update the monthly budget document
    const monthlyBudgetData: MonthlyBudget = {
      userId,
      year,
      month,
      totalBudgeted,
      totalSpent,
      categoryBreakdown,
      updatedAt: FieldValue.serverTimestamp() as Timestamp
    };
    
    await monthlyBudgetRef.set(monthlyBudgetData, { merge: true });
    
    return monthlyBudgetData;
  } catch (error) {
    console.error(`Error getting monthly budget for ${userId} - ${year}/${month}:`, error);
    throw new Error("Failed to get monthly budget.");
  }
}
