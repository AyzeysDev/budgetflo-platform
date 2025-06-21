import { firestore, firebaseInitialized } from '../config/firebase';
import {
  Goal,
  GoalContribution,
  GoalDTO,
  GoalContributionDTO,
  CreateGoalPayload,
  UpdateGoalPayload,
} from '../models/goal.model';
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

// Update goal status based on date and progress
function determineGoalStatus(targetDate: Date, currentAmount: number, targetAmount: number): 'in_progress' | 'completed' | 'overdue' {
  if (currentAmount >= targetAmount) {
    return 'completed';
  }
  if (new Date() > targetDate) {
    return 'overdue';
  }
  return 'in_progress';
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
  const goalsCollection = getGoalsCollection();
  const newGoalRef = goalsCollection.doc();
  
  const targetDate = new Date(payload.targetDate);
  const status = determineGoalStatus(targetDate, 0, payload.targetAmount);

  const newGoal: Goal = {
    goalId: newGoalRef.id,
    userId,
    name: payload.name,
    targetAmount: payload.targetAmount,
    currentAmount: 0,
    targetDate: Timestamp.fromDate(targetDate),
    description: payload.description || null,
    categoryId: payload.categoryId || null,
    linkedAccountId: payload.linkedAccountId || null,
    status,
    isActive: true,
    createdAt: FieldValue.serverTimestamp() as Timestamp,
    updatedAt: FieldValue.serverTimestamp() as Timestamp,
  };

  await newGoalRef.set(newGoal);
  const createdDoc = await newGoalRef.get();
  return convertGoalToDTO(createdDoc.data() as Goal);
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

  // Update status if target date or amount changed
  const newTargetDate = updateData.targetDate ? (updateData.targetDate as Timestamp).toDate() : (goal.targetDate as Timestamp).toDate();
  const newTargetAmount = updateData.targetAmount || goal.targetAmount;
  updateData.status = determineGoalStatus(newTargetDate, goal.currentAmount, newTargetAmount);

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