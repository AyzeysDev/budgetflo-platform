import { firestore, firebaseInitialized } from '../config/firebase';
import {
  Goal,
  GoalContribution,
  GoalDTO,
  GoalContributionDTO,
  CreateGoalPayload,
  UpdateGoalPayload,
  CreateGoalContributionPayload,
} from '../models/goal.model';
import { Timestamp, FieldValue, CollectionReference } from 'firebase-admin/firestore';

if (!firebaseInitialized) {
  throw new Error("GoalService: Firebase is not initialized. Operations will fail.");
}

// Get typed collection references
function getGoalsCollection(): CollectionReference<Goal> {
  if (!firestore) {
    throw new Error("Firestore is not initialized");
  }
  return firestore.collection('goals') as CollectionReference<Goal>;
}

function getGoalContributionsCollection(): CollectionReference<GoalContribution> {
  if (!firestore) {
    throw new Error("Firestore is not initialized");
  }
  return firestore.collection('goal_contributions') as CollectionReference<GoalContribution>;
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

  if (!firestore) {
    throw new Error("Firestore is not initialized");
  }

  const batch = firestore.batch();
  
  contributionsSnapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  batch.delete(goalRef);
  await batch.commit();

  return true;
}

// Add a contribution to a goal
export async function addGoalContribution(
  goalId: string,
  userId: string,
  payload: CreateGoalContributionPayload
): Promise<GoalContributionDTO> {
  const goalRef = getGoalsCollection().doc(goalId);
  const contributionsCollection = getGoalContributionsCollection();

  if (!firestore) {
    throw new Error("Firestore is not initialized");
  }

  const contributionData = await firestore.runTransaction(async (transaction) => {
    const goalDoc = await transaction.get(goalRef);
    
    if (!goalDoc.exists) {
      throw new Error('Goal not found');
    }

    const goal = goalDoc.data() as Goal;
    
    if (goal.userId !== userId) {
      throw new Error('Unauthorized access to goal');
    }

    // Create contribution
    const contributionRef = contributionsCollection.doc();
    const contribution: GoalContribution = {
      contributionId: contributionRef.id,
      goalId,
      userId,
      amount: payload.amount,
      date: payload.date ? Timestamp.fromDate(new Date(payload.date)) : Timestamp.now(),
      source: payload.transactionId ? 'transaction' : 'manual',
      transactionId: payload.transactionId || null,
      notes: payload.notes || null,
      createdAt: FieldValue.serverTimestamp() as Timestamp,
    };

    transaction.set(contributionRef, contribution);

    // Update goal current amount and status
    const newCurrentAmount = goal.currentAmount + payload.amount;
    const targetDate = (goal.targetDate as Timestamp).toDate();
    const newStatus = determineGoalStatus(targetDate, newCurrentAmount, goal.targetAmount);

    transaction.update(goalRef, {
      currentAmount: newCurrentAmount,
      status: newStatus,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { contribution, contributionRef };
  });

  // Get the created contribution
  const contributionDoc = await contributionData.contributionRef.get();
  return convertContributionToDTO(contributionDoc.data() as GoalContribution);
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

// Link a transaction to a goal (called from transaction service)
export async function linkTransactionToGoal(
  transactionId: string,
  goalId: string,
  amount: number,
  date: Date,
  userId: string
): Promise<void> {
  await addGoalContribution(goalId, userId, {
    amount,
    date: date.toISOString(),
    transactionId,
    notes: 'Linked from transaction',
  });
} 