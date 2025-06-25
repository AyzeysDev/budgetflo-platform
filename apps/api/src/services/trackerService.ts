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
  // RecordEMIPaymentPayload, // Deprecated
} from '../models/tracker.model';
import { Account } from '../models/account.model';
import { Timestamp, FieldValue, CollectionReference } from 'firebase-admin/firestore';

if (!firebaseInitialized) {
  throw new Error("TrackerService: Firebase is not initialized. Operations will fail.");
}

// Get typed collection references
function getLoanTrackersCollection(): CollectionReference<LoanTracker> {
  const firestoreInstance = firestore;
  if (!firestoreInstance) {
    throw new Error("Firestore is not initialized");
  }
  return firestoreInstance.collection('loan_trackers') as CollectionReference<LoanTracker>;
}

function getSavingsTrackersCollection(): CollectionReference<SavingsTracker> {
  const firestoreInstance = firestore;
  if (!firestoreInstance) {
    throw new Error("Firestore is not initialized");
  }
  return firestoreInstance.collection('savings_trackers') as CollectionReference<SavingsTracker>;
}

function getAccountsCollection(): CollectionReference<Account> {
  const firestoreInstance = firestore;
  if (!firestoreInstance) {
    throw new Error("Firestore is not initialized");
  }
  return firestoreInstance.collection('accounts') as CollectionReference<Account>;
}

/**
 * [INTERNAL] Updates the progress of a loan tracker within a Firestore transaction.
 * Should only be called by transactionService.
 * @param t - The Firestore transaction object.
 * @param trackerId - The ID of the loan tracker to update.
 * @param paymentAmount - The amount of the payment (positive for payment, negative for reversal).
 */
export async function _updateLoanProgress(t: FirebaseFirestore.Transaction, trackerId: string, paymentAmount: number): Promise<void> {
    const trackerRef = getLoanTrackersCollection().doc(trackerId);
    const trackerDoc = await t.get(trackerRef);

    if (!trackerDoc.exists) {
        console.warn(`Loan tracker with ID ${trackerId} not found during transaction. Skipping progress update.`);
        return;
    }

    const tracker = trackerDoc.data() as LoanTracker;
    const installmentsChange = paymentAmount > 0 ? 1 : -1;
    const newPaidInstallments = tracker.paidInstallments + installmentsChange;
    
    const updateData: { [key: string]: any } = {
        remainingBalance: FieldValue.increment(-paymentAmount),
        paidInstallments: Math.max(0, newPaidInstallments),
        updatedAt: FieldValue.serverTimestamp(),
    };
    
    // If we're making a payment, advance the due date. If we're reversing one, pull it back.
    if (tracker.nextDueDate) {
        const currentDueDate = (tracker.nextDueDate as Timestamp).toDate();
        const newDueDate = new Date(currentDueDate);
        newDueDate.setMonth(newDueDate.getMonth() + installmentsChange);
        updateData.nextDueDate = Timestamp.fromDate(newDueDate);
    }

    t.update(trackerRef, updateData);
}

/**
 * [INTERNAL] Updates the progress of a savings tracker within a Firestore transaction.
 * Currently, this only updates the timestamp as the balance is tied to the account.
 * @param t - The Firestore transaction object.
 * @param trackerId - The ID of the savings tracker to update.
 * @param contributionAmount - The amount of the contribution (positive or negative).
 */
export async function _updateSavingsProgress(t: FirebaseFirestore.Transaction, trackerId: string, contributionAmount: number): Promise<void> {
    const trackerRef = getSavingsTrackersCollection().doc(trackerId);
    // We get the doc simply to ensure it exists before attempting an update.
    const trackerDoc = await t.get(trackerRef);
    if (!trackerDoc.exists) {
        console.warn(`Savings tracker with ID ${trackerId} not found during transaction. Skipping progress update.`);
        return;
    }

    // The core logic of balance change is handled by the transaction on the linked account.
    // This function can be used for savings-specific logic, e.g., updating targets or statuses.
    // For now, we just update the timestamp.
    t.update(trackerRef, {
        updatedAt: FieldValue.serverTimestamp(),
        // Example for future use:
        // currentBalance: FieldValue.increment(contributionAmount) 
        // Note: This would denormalize the balance, which might be a valid choice later.
        // For now, we rely on the account's balance as the source of truth.
    });
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
  
  // Helper to safely convert a timestamp
  const toISOString = (ts: unknown) => {
    if (ts && typeof (ts as Timestamp).toDate === 'function') {
      return (ts as Timestamp).toDate().toISOString();
    }
    // If it's already a Date object or string, just return it.
    // Fallback for serverTimestamp pending writes.
    return new Date().toISOString();
  };

  return {
    ...tracker,
    startDate: toISOString(tracker.startDate),
    nextDueDate: toISOString(tracker.nextDueDate),
    createdAt: toISOString(tracker.createdAt),
    updatedAt: toISOString(tracker.updatedAt),
    ...metrics,
  };
}

// Convert SavingsTracker to DTO
async function convertSavingsTrackerToDTO(tracker: SavingsTracker): Promise<SavingsTrackerDTO> {
  let currentBalance = 0;

  // Get current balance from linked account
  if (tracker.linkedAccountId) {
    const accountDoc = await getAccountsCollection().doc(tracker.linkedAccountId).get();
    if (accountDoc.exists) {
      const account = accountDoc.data() as Account;
      currentBalance = account.balance;
    }
  }

  // Helper to safely convert a timestamp
  const toISOString = (ts: unknown) => {
    if (ts && typeof (ts as Timestamp).toDate === 'function') {
      return (ts as Timestamp).toDate().toISOString();
    }
    return new Date().toISOString();
  };

  return {
    ...tracker,
    createdAt: toISOString(tracker.createdAt),
    updatedAt: toISOString(tracker.updatedAt),
    currentBalance,
  };
}

// Create a loan tracker
export async function createLoanTracker(userId: string, payload: CreateLoanTrackerPayload): Promise<LoanTrackerDTO> {
  console.log('Creating loan tracker with payload:', { userId, payload });
  
  const trackersCollection = getLoanTrackersCollection();
  const newTrackerRef = trackersCollection.doc();
  
  const startDate = new Date(payload.startDate);
  const nextDueDate = new Date(startDate);
  nextDueDate.setMonth(nextDueDate.getMonth() + 1);

  let remainingBalance = payload.totalAmount;
  let paidInstallments = 0;

  // Sync with account balance (linkedAccountId is now required)
  console.log('Attempting to sync with account:', payload.linkedAccountId);
  try {
    const accountDoc = await getAccountsCollection().doc(payload.linkedAccountId).get();
    console.log('Account doc exists:', accountDoc.exists);
    
    if (accountDoc.exists) {
      const account = accountDoc.data() as Account;
      console.log('Account data:', account);
      
      if (account && typeof account.balance === 'number') {
        // For liability accounts, balance represents remaining amount owed
        remainingBalance = account.balance;
        
        // Calculate paid installments based on how much has been paid off
        const amountPaid = payload.totalAmount - remainingBalance;
        if (amountPaid > 0 && payload.emiAmount > 0) {
          paidInstallments = Math.floor(amountPaid / payload.emiAmount);
        }
        
        console.log('Successfully synced loan tracker with account balance:', remainingBalance);
        console.log('Calculated paid installments:', paidInstallments);
      } else {
        console.warn('Account balance is not a valid number:', account?.balance);
      }
    } else {
      console.warn('Account document not found for ID:', payload.linkedAccountId);
    }
  } catch (error) {
    console.error('Failed to sync with account during loan tracker creation:', error);
    // Continue with manual loan tracker creation
  }

  const newTracker: LoanTracker = {
    trackerId: newTrackerRef.id,
    userId,
    name: payload.name,
    linkedAccountId: payload.linkedAccountId,
    totalAmount: payload.totalAmount,
    emiAmount: payload.emiAmount,
    interestRate: payload.interestRate,
    tenureMonths: payload.tenureMonths,
    startDate: Timestamp.fromDate(startDate),
    nextDueDate: Timestamp.fromDate(nextDueDate),
    paidInstallments,
    remainingBalance,
    isActive: true,
    createdAt: FieldValue.serverTimestamp() as Timestamp,
    updatedAt: FieldValue.serverTimestamp() as Timestamp,
  };

  console.log('Saving new loan tracker:', newTracker);
  await newTrackerRef.set(newTracker);
  const createdDoc = await newTrackerRef.get();
  const createdData = createdDoc.data();
  if (!createdData) {
    throw new Error("Failed to create loan tracker: document data is empty.");
  }
  const result = convertLoanTrackerToDTO(createdData);
  console.log('Loan tracker created successfully:', result);
  
  return result;
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

  const updateData: { [key: string]: any } = {
    ...payload,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (payload.startDate) {
    updateData.startDate = Timestamp.fromDate(new Date(payload.startDate));
  }
  if (payload.nextDueDate) {
    updateData.nextDueDate = Timestamp.fromDate(new Date(payload.nextDueDate));
  }

  await trackerRef.update(updateData);

  const updatedDoc = await trackerRef.get();
  const updatedData = updatedDoc.data();
  if (!updatedData) {
    throw new Error("Failed to update loan tracker: document data is empty.");
  }
  return convertLoanTrackerToDTO(updatedData);
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
    currentBalance: account.balance,
    monthlyTarget: payload.monthlyTarget || null,
    overallTarget: payload.overallTarget || null,
    isActive: true,
    createdAt: FieldValue.serverTimestamp() as Timestamp,
    updatedAt: FieldValue.serverTimestamp() as Timestamp,
  };

  await newTrackerRef.set(newTracker);
  const createdDoc = await newTrackerRef.get();
  const createdData = createdDoc.data();
  if (!createdData) {
    throw new Error("Failed to create savings tracker: document data is empty.");
  }
  return await convertSavingsTrackerToDTO(createdData);
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
  const updatedData = updatedDoc.data();
  if (!updatedData) {
    return null;
  }
  return await convertSavingsTrackerToDTO(updatedData);
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

/**
 * [INTERNAL] Calculates and applies a progress update to a loan tracker within a Firestore transaction.
 * This function ONLY performs writes and should be given pre-fetched data.
 */
export function _applyLoanUpdate(t: FirebaseFirestore.Transaction, loanDoc: FirebaseFirestore.DocumentSnapshot, paymentAmount: number): void {
    if (!loanDoc.exists) {
        console.warn(`Loan tracker with ID ${loanDoc.id} not found during transaction write phase. Skipping update.`);
        return;
    }

    const loan = loanDoc.data() as LoanTracker;
    const newRemainingBalance = loan.remainingBalance - paymentAmount;
    const newStatus = newRemainingBalance <= 0 ? 'completed' : 'in_progress';
    const newPaidInstallments = loan.paidInstallments + 1; // Assuming one payment is one installment

    t.update(loanDoc.ref, {
        remainingBalance: Math.max(0, newRemainingBalance),
        paidInstallments: newPaidInstallments,
        status: newStatus,
        updatedAt: FieldValue.serverTimestamp(),
    });
}

/**
 * [INTERNAL] Calculates and applies a progress update to a savings tracker within a Firestore transaction.
 * This function ONLY performs writes and should be given pre-fetched data.
 */
export function _applySavingsUpdate(t: FirebaseFirestore.Transaction, savingsDoc: FirebaseFirestore.DocumentSnapshot): void {
  // For savings trackers, a new linked transaction is all that's needed to update progress.
  // We just update the timestamp.
  if (!savingsDoc.exists) {
    console.warn(`Savings tracker with ID ${savingsDoc.id} not found during transaction write phase. Skipping update.`);
    return;
  }
  t.update(savingsDoc.ref, {
    updatedAt: FieldValue.serverTimestamp(),
  });
}

// Add function to sync loan tracker with current account balance
export async function syncLoanTrackerWithAccount(trackerId: string, userId: string): Promise<LoanTrackerDTO | null> {
  const trackerRef = getLoanTrackersCollection().doc(trackerId);
  const trackerDoc = await trackerRef.get();

  if (!trackerDoc.exists) {
    return null;
  }

  const tracker = trackerDoc.data() as LoanTracker;
  
  if (tracker.userId !== userId) {
    throw new Error('Unauthorized access to loan tracker');
  }

  if (!tracker.linkedAccountId) {
    throw new Error('Loan tracker is not linked to an account');
  }

  // Get current account balance
  const accountDoc = await getAccountsCollection().doc(tracker.linkedAccountId).get();
  if (!accountDoc.exists) {
    throw new Error('Linked account not found');
  }

  const account = accountDoc.data() as Account;
  
  // Calculate paid installments based on how much has been paid off
  const amountPaid = tracker.totalAmount - account.balance;
  let paidInstallments = 0;
  if (amountPaid > 0 && tracker.emiAmount > 0) {
    paidInstallments = Math.floor(amountPaid / tracker.emiAmount);
  }

  const updateData = {
    remainingBalance: account.balance,
    paidInstallments: Math.max(0, paidInstallments),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await trackerRef.update(updateData);
  const updatedDoc = await trackerRef.get();
  const updatedData = updatedDoc.data();
  if (!updatedData) {
    return null;
  }
  return convertLoanTrackerToDTO(updatedData);
} 