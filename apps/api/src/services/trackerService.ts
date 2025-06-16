import { firestore, firebaseInitialized } from '../config/firebase';
import {
  LoanTracker,
  SavingsTracker,
  LoanTrackerDTO,
  SavingsTrackerDTO,
  CreateLoanTrackerPayload,
  UpdateLoanTrackerPayload,
  CreateSavingsTrackerPayload,
  UpdateSavingsTrackerPayload,
  RecordEMIPaymentPayload,
} from '../models/tracker.model';
import { Account } from '../models/account.model';
import { Timestamp, FieldValue, CollectionReference } from 'firebase-admin/firestore';

if (!firebaseInitialized) {
  throw new Error("TrackerService: Firebase is not initialized. Operations will fail.");
}

// Get typed collection references
function getLoanTrackersCollection(): CollectionReference<LoanTracker> {
  if (!firestore) {
    throw new Error("Firestore is not initialized");
  }
  return firestore.collection('loan_trackers') as CollectionReference<LoanTracker>;
}

function getSavingsTrackersCollection(): CollectionReference<SavingsTracker> {
  if (!firestore) {
    throw new Error("Firestore is not initialized");
  }
  return firestore.collection('savings_trackers') as CollectionReference<SavingsTracker>;
}

function getAccountsCollection(): CollectionReference<Account> {
  if (!firestore) {
    throw new Error("Firestore is not initialized");
  }
  return firestore.collection('accounts') as CollectionReference<Account>;
}

// Calculate loan metrics
function calculateLoanMetrics(tracker: LoanTracker): { completionPercentage: number; monthsRemaining: number; totalInterest: number } {
  const totalPayable = tracker.emiAmount * tracker.tenureMonths;
  const totalInterest = totalPayable - tracker.totalAmount;
  const paidAmount = tracker.emiAmount * tracker.paidInstallments;
  const completionPercentage = Math.round((paidAmount / totalPayable) * 100);
  const monthsRemaining = tracker.tenureMonths - tracker.paidInstallments;

  return { completionPercentage, monthsRemaining, totalInterest };
}

// Convert LoanTracker to DTO
function convertLoanTrackerToDTO(tracker: LoanTracker): LoanTrackerDTO {
  const metrics = calculateLoanMetrics(tracker);
  
  return {
    ...tracker,
    startDate: (tracker.startDate as Timestamp).toDate().toISOString(),
    nextDueDate: (tracker.nextDueDate as Timestamp).toDate().toISOString(),
    createdAt: (tracker.createdAt as Timestamp).toDate().toISOString(),
    updatedAt: (tracker.updatedAt as Timestamp).toDate().toISOString(),
    ...metrics,
  };
}

// Convert SavingsTracker to DTO
async function convertSavingsTrackerToDTO(tracker: SavingsTracker): Promise<SavingsTrackerDTO> {
  let currentBalance = 0;
  let goalProgress = 0;

  // Get current balance from linked account
  if (tracker.linkedAccountId) {
    const accountDoc = await getAccountsCollection().doc(tracker.linkedAccountId).get();
    if (accountDoc.exists) {
      const account = accountDoc.data() as Account;
      currentBalance = account.balance;
    }
  }

  // Calculate goal progress if linked to a goal
  if (tracker.linkedGoalId) {
    // This would need to import from goalService, but to avoid circular dependency,
    // we'll let the frontend handle goal progress calculation
    goalProgress = 0;
  }

  return {
    ...tracker,
    createdAt: (tracker.createdAt as Timestamp).toDate().toISOString(),
    updatedAt: (tracker.updatedAt as Timestamp).toDate().toISOString(),
    currentBalance,
    goalProgress,
  };
}

// Create a loan tracker
export async function createLoanTracker(userId: string, payload: CreateLoanTrackerPayload): Promise<LoanTrackerDTO> {
  const trackersCollection = getLoanTrackersCollection();
  const newTrackerRef = trackersCollection.doc();
  
  const startDate = new Date(payload.startDate);
  const nextDueDate = new Date(startDate);
  nextDueDate.setMonth(nextDueDate.getMonth() + 1);

  const newTracker: LoanTracker = {
    trackerId: newTrackerRef.id,
    userId,
    name: payload.name,
    linkedAccountId: payload.linkedAccountId || null,
    totalAmount: payload.totalAmount,
    emiAmount: payload.emiAmount,
    interestRate: payload.interestRate,
    tenureMonths: payload.tenureMonths,
    startDate: Timestamp.fromDate(startDate),
    nextDueDate: Timestamp.fromDate(nextDueDate),
    paidInstallments: 0,
    remainingBalance: payload.totalAmount,
    isActive: true,
    createdAt: FieldValue.serverTimestamp() as Timestamp,
    updatedAt: FieldValue.serverTimestamp() as Timestamp,
  };

  await newTrackerRef.set(newTracker);
  const createdDoc = await newTrackerRef.get();
  return convertLoanTrackerToDTO(createdDoc.data() as LoanTracker);
}

// Get all loan trackers for a user
export async function getLoanTrackersByUserId(userId: string, isActive?: boolean): Promise<LoanTrackerDTO[]> {
  let query = getLoanTrackersCollection().where('userId', '==', userId);

  if (isActive !== undefined) {
    query = query.where('isActive', '==', isActive);
  }

  const snapshot = await query.orderBy('nextDueDate', 'asc').get();
  
  if (snapshot.empty) {
    return [];
  }

  return snapshot.docs.map(doc => convertLoanTrackerToDTO(doc.data()));
}

// Update a loan tracker
export async function updateLoanTracker(
  trackerId: string,
  userId: string,
  payload: UpdateLoanTrackerPayload
): Promise<LoanTrackerDTO | null> {
  const trackerRef = getLoanTrackersCollection().doc(trackerId);
  const trackerDoc = await trackerRef.get();

  if (!trackerDoc.exists) {
    return null;
  }

  const tracker = trackerDoc.data() as LoanTracker;
  
  if (tracker.userId !== userId) {
    throw new Error('Unauthorized access to loan tracker');
  }

  await trackerRef.update({
    ...payload,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const updatedDoc = await trackerRef.get();
  return convertLoanTrackerToDTO(updatedDoc.data() as LoanTracker);
}

// Record an EMI payment
export async function recordEMIPayment(
  trackerId: string,
  userId: string,
  payload: RecordEMIPaymentPayload
): Promise<LoanTrackerDTO> {
  const trackerRef = getLoanTrackersCollection().doc(trackerId);
  
  if (!firestore) {
    throw new Error("Firestore is not initialized");
  }

  return await firestore.runTransaction(async (transaction) => {
    const trackerDoc = await transaction.get(trackerRef);
    
    if (!trackerDoc.exists) {
      throw new Error('Loan tracker not found');
    }

    const tracker = trackerDoc.data() as LoanTracker;
    
    if (tracker.userId !== userId) {
      throw new Error('Unauthorized access to loan tracker');
    }

    // Calculate new values
    const newPaidInstallments = tracker.paidInstallments + 1;
    const newRemainingBalance = Math.max(0, tracker.remainingBalance - (payload.amount - (tracker.emiAmount * tracker.interestRate / 100 / 12)));
    
    // Calculate next due date
    const currentDueDate = (tracker.nextDueDate as Timestamp).toDate();
    const newDueDate = new Date(currentDueDate);
    newDueDate.setMonth(newDueDate.getMonth() + 1);

    // Update tracker
    transaction.update(trackerRef, {
      paidInstallments: newPaidInstallments,
      remainingBalance: newRemainingBalance,
      nextDueDate: Timestamp.fromDate(newDueDate),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Update linked account balance if exists
    if (tracker.linkedAccountId && payload.transactionId) {
      const accountRef = getAccountsCollection().doc(tracker.linkedAccountId);
      transaction.update(accountRef, {
        balance: FieldValue.increment(-payload.amount),
      });
    }

    return {
      ...tracker,
      paidInstallments: newPaidInstallments,
      remainingBalance: newRemainingBalance,
      nextDueDate: Timestamp.fromDate(newDueDate),
    } as LoanTracker;
  }).then(updatedTracker => convertLoanTrackerToDTO(updatedTracker));
}

// Create a savings tracker
export async function createSavingsTracker(userId: string, payload: CreateSavingsTrackerPayload): Promise<SavingsTrackerDTO> {
  const trackersCollection = getSavingsTrackersCollection();
  const newTrackerRef = trackersCollection.doc();

  // Verify the linked account exists and belongs to the user
  const accountDoc = await getAccountsCollection().doc(payload.linkedAccountId).get();
  if (!accountDoc.exists) {
    throw new Error('Linked account not found');
  }
  
  const account = accountDoc.data() as Account;
  if (account.userId !== userId) {
    throw new Error('Unauthorized access to account');
  }

  const newTracker: SavingsTracker = {
    trackerId: newTrackerRef.id,
    userId,
    name: payload.name,
    linkedAccountId: payload.linkedAccountId,
    linkedGoalId: payload.linkedGoalId || null,
    monthlyTarget: payload.monthlyTarget || null,
    isActive: true,
    createdAt: FieldValue.serverTimestamp() as Timestamp,
    updatedAt: FieldValue.serverTimestamp() as Timestamp,
  };

  await newTrackerRef.set(newTracker);
  const createdDoc = await newTrackerRef.get();
  return convertSavingsTrackerToDTO(createdDoc.data() as SavingsTracker);
}

// Get all savings trackers for a user
export async function getSavingsTrackersByUserId(userId: string, isActive?: boolean): Promise<SavingsTrackerDTO[]> {
  let query = getSavingsTrackersCollection().where('userId', '==', userId);

  if (isActive !== undefined) {
    query = query.where('isActive', '==', isActive);
  }

  const snapshot = await query.orderBy('createdAt', 'desc').get();
  
  if (snapshot.empty) {
    return [];
  }

  return Promise.all(
    snapshot.docs.map(doc => convertSavingsTrackerToDTO(doc.data()))
  );
}

// Update a savings tracker
export async function updateSavingsTracker(
  trackerId: string,
  userId: string,
  payload: UpdateSavingsTrackerPayload
): Promise<SavingsTrackerDTO | null> {
  const trackerRef = getSavingsTrackersCollection().doc(trackerId);
  const trackerDoc = await trackerRef.get();

  if (!trackerDoc.exists) {
    return null;
  }

  const tracker = trackerDoc.data() as SavingsTracker;
  
  if (tracker.userId !== userId) {
    throw new Error('Unauthorized access to savings tracker');
  }

  await trackerRef.update({
    ...payload,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const updatedDoc = await trackerRef.get();
  return convertSavingsTrackerToDTO(updatedDoc.data() as SavingsTracker);
}

// Delete a tracker (loan or savings)
export async function deleteLoanTracker(trackerId: string, userId: string): Promise<boolean> {
  const trackerRef = getLoanTrackersCollection().doc(trackerId);
  const trackerDoc = await trackerRef.get();

  if (!trackerDoc.exists) {
    return false;
  }

  const tracker = trackerDoc.data() as LoanTracker;
  
  if (tracker.userId !== userId) {
    throw new Error('Unauthorized access to loan tracker');
  }

  await trackerRef.delete();
  return true;
}

export async function deleteSavingsTracker(trackerId: string, userId: string): Promise<boolean> {
  const trackerRef = getSavingsTrackersCollection().doc(trackerId);
  const trackerDoc = await trackerRef.get();

  if (!trackerDoc.exists) {
    return false;
  }

  const tracker = trackerDoc.data() as SavingsTracker;
  
  if (tracker.userId !== userId) {
    throw new Error('Unauthorized access to savings tracker');
  }

  await trackerRef.delete();
  return true;
} 