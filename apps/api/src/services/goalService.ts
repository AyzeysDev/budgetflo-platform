import { firestore, firebaseInitialized } from '../config/firebase';
import {
  Goal,
  GoalContribution,
  GoalDTO,
  GoalContributionDTO,
  CreateGoalPayload,
  CreateGoalContributionPayload,
  UpdateGoalPayload,
} from '../models/goal.model';
import { Account } from '../models/account.model';
import { Timestamp, FieldValue, CollectionReference } from 'firebase-admin/firestore';

if (!firebaseInitialized) {
  throw new Error("GoalService: Firebase is not initialized. Operations will fail.");
}

// Get typed collection references
function getGoalsCollection(): CollectionReference<Goal> {
  const firestoreInstance = firestore;
  if (!firestoreInstance) {
    throw new Error("Firestore is not initialized");
  }
  return firestoreInstance.collection('goals') as CollectionReference<Goal>;
}

function getGoalContributionsCollection(): CollectionReference<GoalContribution> {
  const firestoreInstance = firestore;
  if (!firestoreInstance) {
    throw new Error("Firestore is not initialized");
  }
  return firestoreInstance.collection('goal_contributions') as CollectionReference<GoalContribution>;
}

function getAccountsCollection(): CollectionReference<Account> {
  const firestoreInstance = firestore;
  if (!firestoreInstance) {
    throw new Error("Firestore is not initialized");
  }
  return firestoreInstance.collection('accounts') as CollectionReference<Account>;
}

// Convert Goal to DTO
function convertGoalToDTO(goal: Goal): GoalDTO {
  const targetDate = (goal.targetDate as Timestamp).toDate();
  const now = new Date();
  const daysRemaining = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const progressPercentage = goal.targetAmount > 0 ? Math.round((goal.currentAmount / goal.targetAmount) * 100) : 0;

  return {
    ...goal,
    targetDate: targetDate.toISOString(),
    createdAt: (goal.createdAt as Timestamp).toDate().toISOString(),
    updatedAt: (goal.updatedAt as Timestamp).toDate().toISOString(),
    progressPercentage,
    daysRemaining: Math.max(0, daysRemaining),
  };
}

// Convert GoalContribution to DTO
function convertContributionToDTO(contribution: GoalContribution): GoalContributionDTO {
  return {
    ...contribution,
    date: (contribution.date as Timestamp).toDate().toISOString(),
    createdAt: (contribution.createdAt as Timestamp).toDate().toISOString(),
  };
}

// Updated to always return 'in_progress' instead of 'overdue'
function determineGoalStatus(targetDate: Date, currentAmount: number, targetAmount: number): 'in_progress' | 'completed' {
  if (currentAmount >= targetAmount) {
    return 'completed';
  }
  
  return 'in_progress'; // Always return in_progress instead of overdue
}

/**
 * [INTERNAL] Calculates and applies a progress update to a goal within a Firestore transaction.
 * This function ONLY performs writes and should be given pre-fetched data.
 * @param t - The Firestore transaction object.
 * @param goalDoc - The Firestore document snapshot of the goal to update.
 * @param amountChange - The amount to add (positive) or subtract (negative).
 */
export function _applyGoalUpdate(t: FirebaseFirestore.Transaction, goalDoc: FirebaseFirestore.DocumentSnapshot, amountChange: number): void {
    if (!goalDoc.exists) {
        console.warn(`Goal with ID ${goalDoc.id} not found during transaction write phase. Skipping update.`);
        return;
    }

    const goal = goalDoc.data() as Goal;
    const newCurrentAmount = goal.currentAmount + amountChange;
    const finalAmount = Math.max(0, newCurrentAmount);

    const newStatus = determineGoalStatus(
        (goal.targetDate as Timestamp).toDate(),
        finalAmount,
        goal.targetAmount
    );

    t.update(goalDoc.ref, {
        currentAmount: finalAmount,
        status: newStatus,
        updatedAt: FieldValue.serverTimestamp(),
    });
}

/**
 * [INTERNAL] Updates the progress of a goal within a Firestore transaction.
 * Should only be called by other services (like transactionService).
 * @param t - The Firestore transaction object.
 * @param goalId - The ID of the goal to update.
 * @param amountChange - The amount to add (positive) or subtract (negative).
 */
export async function _updateGoalProgress(t: FirebaseFirestore.Transaction, goalId: string, amountChange: number): Promise<void> {
    const goalRef = getGoalsCollection().doc(goalId);
    const goalDoc = await t.get(goalRef);

    if (!goalDoc.exists) {
        console.warn(`Goal with ID ${goalId} not found during transaction. Skipping progress update.`);
        return; // Fail silently within a transaction to avoid halting unrelated operations.
    }

    const goal = goalDoc.data() as Goal;
    const newCurrentAmount = goal.currentAmount + amountChange;
    
    // Ensure currentAmount doesn't go below zero
    const finalAmount = Math.max(0, newCurrentAmount);

    const newStatus = determineGoalStatus(
        (goal.targetDate as Timestamp).toDate(),
        finalAmount,
        goal.targetAmount
    );

    t.update(goalRef, {
        currentAmount: finalAmount,
        status: newStatus,
        updatedAt: FieldValue.serverTimestamp(),
    });
}

// Create a new goal
export async function createGoal(userId: string, payload: CreateGoalPayload): Promise<GoalDTO> {
  console.log('Creating goal with payload:', { userId, payload });
  
  const goalsCollection = getGoalsCollection();
  const newGoalRef = goalsCollection.doc();
  
  const targetDate = new Date(payload.targetDate);
  let currentAmount = 0;
  let isSyncedWithAccount = false;

  // If user wants to sync with account and has provided an account ID
  if (payload.isSyncedWithAccount && payload.linkedAccountId) {
    console.log('Attempting to sync with account:', payload.linkedAccountId);
    try {
      const accountDoc = await getAccountsCollection().doc(payload.linkedAccountId).get();
      console.log('Account doc exists:', accountDoc.exists);
      
      if (accountDoc.exists) {
        const account = accountDoc.data() as Account;
        console.log('Account data:', account);
        
        if (account && typeof account.balance === 'number') {
          currentAmount = account.balance;
          isSyncedWithAccount = true;
          console.log('Successfully synced goal with account balance:', currentAmount);
        } else {
          console.warn('Account balance is not a valid number:', account?.balance);
        }
      } else {
        console.warn('Account document not found for ID:', payload.linkedAccountId);
      }
    } catch (error) {
      console.error('Failed to sync with account during goal creation:', error);
      // Continue with manual goal creation
    }
  }

  const status = determineGoalStatus(targetDate, currentAmount, payload.targetAmount);
  console.log('Goal status determined:', status, 'with currentAmount:', currentAmount);

  const newGoal: Goal = {
    goalId: newGoalRef.id,
    userId,
    name: payload.name,
    targetAmount: payload.targetAmount,
    currentAmount,
    targetDate: Timestamp.fromDate(targetDate),
    description: payload.description || null,
    categoryId: payload.categoryId || null,
    linkedAccountId: payload.linkedAccountId || null,
    isSyncedWithAccount,
    status,
    isActive: true,
    createdAt: FieldValue.serverTimestamp() as Timestamp,
    updatedAt: FieldValue.serverTimestamp() as Timestamp,
  };

  console.log('Saving new goal:', newGoal);
  await newGoalRef.set(newGoal);
  const createdDoc = await newGoalRef.get();
  const result = convertGoalToDTO(createdDoc.data() as Goal);
  console.log('Goal created successfully:', result);
  
  return result;
}

// Get all goals for a user
export async function getGoalsByUserId(userId: string, filters?: { status?: string; isActive?: boolean }): Promise<GoalDTO[]> {
  let query = getGoalsCollection().where('userId', '==', userId);

  if (filters?.status) {
    query = query.where('status', '==', filters.status);
  }
  if (filters?.isActive !== undefined) {
    query = query.where('isActive', '==', filters.isActive);
  }

  const snapshot = await query.orderBy('targetDate', 'asc').get();
  
  if (snapshot.empty) {
    return [];
  }

  return snapshot.docs.map(doc => convertGoalToDTO(doc.data()));
}

// Get a single goal by ID
export async function getGoalById(goalId: string, userId: string): Promise<GoalDTO | null> {
  const goalDoc = await getGoalsCollection().doc(goalId).get();
  
  if (!goalDoc.exists) {
    return null;
  }

  const goal = goalDoc.data() as Goal;
  
  if (goal.userId !== userId) {
    throw new Error('Unauthorized access to goal');
  }

  return convertGoalToDTO(goal);
}

// Update a goal
export async function updateGoal(goalId: string, userId: string, payload: UpdateGoalPayload): Promise<GoalDTO | null> {
  const goalRef = getGoalsCollection().doc(goalId);
  const goalDoc = await goalRef.get();

  if (!goalDoc.exists) {
    return null;
  }

  const goal = goalDoc.data() as Goal;
  
  if (goal.userId !== userId) {
    throw new Error('Unauthorized access to goal');
  }

  const updateData: any = {
    ...payload,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (payload.targetDate) {
    updateData.targetDate = Timestamp.fromDate(new Date(payload.targetDate));
  }

  // Handle account switching logic
  const wasLinkedToAccount = goal.linkedAccountId && goal.isSyncedWithAccount;
  const willBeLinkedToAccount = payload.linkedAccountId && payload.isSyncedWithAccount;
  const switchingToManual = wasLinkedToAccount && !payload.linkedAccountId;
  const switchingAccount = wasLinkedToAccount && payload.linkedAccountId && 
                          payload.linkedAccountId !== goal.linkedAccountId;

  // Reset current amount when switching from synced to manual
  if (switchingToManual) {
    console.log('Switching from synced account to manual tracking - resetting progress');
    updateData.currentAmount = 0;
    updateData.isSyncedWithAccount = false;
  }
  // If switching to a new account and sync is enabled, get new account balance
  else if ((switchingAccount || (!wasLinkedToAccount && willBeLinkedToAccount)) && payload.isSyncedWithAccount) {
    console.log('Switching to account sync - fetching account balance');
    try {
      const accountDoc = await getAccountsCollection().doc(payload.linkedAccountId!).get();
      if (accountDoc.exists) {
        const account = accountDoc.data() as Account;
        if (account && typeof account.balance === 'number') {
          updateData.currentAmount = account.balance;
          console.log('Updated goal with new account balance:', account.balance);
        }
      }
    } catch (error) {
      console.error('Failed to sync with new account:', error);
    }
  }

  // Update status based on new values
  const newTargetDate = updateData.targetDate ? (updateData.targetDate as Timestamp).toDate() : (goal.targetDate as Timestamp).toDate();
  const newTargetAmount = updateData.targetAmount !== undefined ? updateData.targetAmount : goal.targetAmount;
  const newCurrentAmount = updateData.currentAmount !== undefined ? updateData.currentAmount : goal.currentAmount;
  
  updateData.status = determineGoalStatus(newTargetDate, newCurrentAmount, newTargetAmount);

  console.log('Updating goal with data:', updateData);
  await goalRef.update(updateData);
  const updatedDoc = await goalRef.get();
  return convertGoalToDTO(updatedDoc.data() as Goal);
}

// Delete a goal
export async function deleteGoal(goalId: string, userId: string): Promise<boolean> {
  const goalRef = getGoalsCollection().doc(goalId);
  const goalDoc = await goalRef.get();

  if (!goalDoc.exists) {
    return false;
  }

  const goal = goalDoc.data() as Goal;
  
  if (goal.userId !== userId) {
    throw new Error('Unauthorized access to goal');
  }

  // Delete all contributions for this goal
  const contributionsSnapshot = await getGoalContributionsCollection()
    .where('goalId', '==', goalId)
    .get();

  const firestoreInstance = firestore;
  if (!firestoreInstance) {
    throw new Error("Firestore is not initialized");
  }

  const batch = firestoreInstance.batch();
  
  contributionsSnapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  batch.delete(goalRef);
  await batch.commit();

  return true;
}

// Get contributions for a goal
export async function getGoalContributions(goalId: string, userId: string): Promise<GoalContributionDTO[]> {
  // First verify the user owns the goal
  const goal = await getGoalById(goalId, userId);
  if (!goal) {
    throw new Error('Goal not found or unauthorized');
  }

  const snapshot = await getGoalContributionsCollection()
    .where('goalId', '==', goalId)
    .orderBy('date', 'desc')
    .get();

  if (snapshot.empty) {
    return [];
  }

  return snapshot.docs.map(doc => convertContributionToDTO(doc.data()));
}

// Add goal contribution function
export async function addGoalContribution(
  goalId: string, 
  userId: string, 
  payload: CreateGoalContributionPayload
): Promise<GoalContributionDTO> {
  // First verify the user owns the goal
  const goal = await getGoalById(goalId, userId);
  if (!goal) {
    throw new Error('Goal not found or unauthorized');
  }

  const contributionsCollection = getGoalContributionsCollection();
  const newContributionRef = contributionsCollection.doc();
  
  const contributionDate = payload.date ? new Date(payload.date) : new Date();

  const newContribution: GoalContribution = {
    contributionId: newContributionRef.id,
    goalId,
    userId,
    amount: payload.amount,
    date: Timestamp.fromDate(contributionDate),
    source: 'manual',
    transactionId: payload.transactionId || null,
    notes: payload.notes || null,
    createdAt: FieldValue.serverTimestamp() as Timestamp,
  };

  // Use a transaction to ensure consistency - FIX: Do all reads before writes
  const firestoreInstance = firestore;
  if (!firestoreInstance) {
    throw new Error("Firestore is not initialized");
  }

  await firestoreInstance.runTransaction(async (transaction) => {
    // READ PHASE - Do all reads first
    const goalRef = getGoalsCollection().doc(goalId);
    const goalDoc = await transaction.get(goalRef);
    
    if (!goalDoc.exists) {
      throw new Error('Goal not found');
    }

    const currentGoal = goalDoc.data() as Goal;
    
    // Calculate new values
    const newCurrentAmount = currentGoal.currentAmount + payload.amount;
    const newStatus = determineGoalStatus(
      (currentGoal.targetDate as Timestamp).toDate(),
      newCurrentAmount,
      currentGoal.targetAmount
    );

    // WRITE PHASE - Do all writes after reads
    transaction.set(newContributionRef, newContribution);
    transaction.update(goalRef, {
      currentAmount: newCurrentAmount,
      status: newStatus,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  const createdDoc = await newContributionRef.get();
  return convertContributionToDTO(createdDoc.data() as GoalContribution);
}

// Add function to sync goal with current account balance
export async function syncGoalWithAccount(goalId: string, userId: string): Promise<GoalDTO | null> {
  const goalRef = getGoalsCollection().doc(goalId);
  const goalDoc = await goalRef.get();

  if (!goalDoc.exists) {
    return null;
  }

  const goal = goalDoc.data() as Goal;
  
  if (goal.userId !== userId) {
    throw new Error('Unauthorized access to goal');
  }

  if (!goal.linkedAccountId) {
    throw new Error('Goal is not linked to an account');
  }

  // Get current account balance
  const accountDoc = await getAccountsCollection().doc(goal.linkedAccountId).get();
  if (!accountDoc.exists) {
    throw new Error('Linked account not found');
  }

  const account = accountDoc.data() as Account;
  const newStatus = determineGoalStatus(
    (goal.targetDate as Timestamp).toDate(),
    account.balance,
    goal.targetAmount
  );

  const updateData = {
    currentAmount: account.balance,
    status: newStatus,
    updatedAt: FieldValue.serverTimestamp(),
  };

  await goalRef.update(updateData);
  const updatedDoc = await goalRef.get();
  return convertGoalToDTO(updatedDoc.data() as Goal);
}

/*
 * [DEPRECATED] This function is no longer needed. Linking is handled
 * by creating a transaction with a linkedGoalId via transactionService.
 */
// // Link a transaction to a goal (called from transaction service)
// export async function linkTransactionToGoal(
//   transactionId: string,
//   goalId: string,
//   amount: number,
//   date: Date,
//   userId: string
// ): Promise<void> {
//   await addGoalContribution(goalId, userId, {
//     amount,
//     date: date.toISOString(),
//     transactionId,
//     notes: 'Linked from transaction',
//   });
// } 