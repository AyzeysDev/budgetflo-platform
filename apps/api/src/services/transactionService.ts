// apps/api/src/services/transactionService.ts
import { firestore } from '../config/firebase';
import {
  Transaction,
  CreateTransactionPayload,
  UpdateTransactionPayload,
  TransactionDTO,
  CreateTransferPayload,
} from '../models/transaction.model';
import { Account, LIABILITY_TYPES } from '../models/account.model';
import { Budget } from '../models/budget.model';
import { Goal } from '../models/goal.model';
import { LoanTracker, SavingsTracker } from '../models/tracker.model';
import { Timestamp, FieldValue, CollectionReference, DocumentReference } from 'firebase-admin/firestore';
import { _applyGoalUpdate } from './goalService';
import { _applyLoanUpdate, _applySavingsUpdate } from './trackerService';

const getCollection = <T extends FirebaseFirestore.DocumentData>(collectionName: string): CollectionReference<T> => {
  const firestoreInstance = firestore;
  if (!firestoreInstance) throw new Error("Firestore is not initialized.");
  return firestoreInstance.collection(collectionName) as CollectionReference<T>;
};

const transactionsCollection = getCollection<Transaction>('transactions');
const accountsCollection = getCollection<Account>('accounts');
const budgetsCollection = getCollection<Budget>('budgets');
const goalsCollection = getCollection<Goal>('goals');
const loanTrackersCollection = getCollection<LoanTracker>('loan_trackers');
const savingsTrackersCollection = getCollection<SavingsTracker>('savings_trackers');

function convertTransactionToDTO(transactionData: Transaction): TransactionDTO {
  return {
    ...transactionData,
    date: (transactionData.date as Timestamp).toDate().toISOString(),
    createdAt: (transactionData.createdAt as Timestamp).toDate().toISOString(),
    updatedAt: (transactionData.updatedAt as Timestamp).toDate().toISOString(),
  };
}

async function getAffectedBudgets(
  t: FirebaseFirestore.Transaction,
  userId: string,
  categoryId: string,
  date: Date
): Promise<FirebaseFirestore.QueryDocumentSnapshot<Budget>[]> {
  const transactionTimestamp = Timestamp.fromDate(date);
  const budgetQuery = budgetsCollection
    .where('userId', '==', userId)
    .where('categoryId', '==', categoryId)
    .where('startDate', '<=', transactionTimestamp)
    .orderBy('startDate', 'desc');
  const snapshot = await t.get(budgetQuery);
  return snapshot.docs.filter(doc => (doc.data().endDate as Timestamp) >= transactionTimestamp);
}

export async function createTransaction(userId: string, payload: CreateTransactionPayload): Promise<TransactionDTO> {
  if (payload.type === 'expense' && !payload.categoryId) throw new Error('Category is required.');
  if (payload.amount <= 0) throw new Error('Amount must be positive.');

  const newTransactionRef = transactionsCollection.doc();
  const transactionDate = new Date(payload.date);
  
  const firestoreInstance = firestore;
  if (!firestoreInstance) throw new Error("Firestore not initialized.");

  await firestoreInstance.runTransaction(async (t) => {
    // --- PHASE 1: READS ---
    const docsToGet: DocumentReference[] = [accountsCollection.doc(payload.accountId)];
    if(payload.linkedGoalId) docsToGet.push(goalsCollection.doc(payload.linkedGoalId));
    if(payload.linkedLoanTrackerId) docsToGet.push(loanTrackersCollection.doc(payload.linkedLoanTrackerId));
    if(payload.linkedSavingsTrackerId) docsToGet.push(savingsTrackersCollection.doc(payload.linkedSavingsTrackerId));
    
    const docs = await t.getAll(...docsToGet);
    const accountDoc = docs[0];
    if (!accountDoc.exists) throw new Error(`Account ${payload.accountId} not found.`);

    let budgetDocs: FirebaseFirestore.QueryDocumentSnapshot<Budget>[] = [];
    if (payload.type === 'expense' && payload.categoryId) {
        budgetDocs = await getAffectedBudgets(t, userId, payload.categoryId, transactionDate);
    }
    
    // --- PHASE 2: WRITES ---
    const newTransactionData: Transaction = {
      ...payload,
      transactionId: newTransactionRef.id, 
      userId,
      date: Timestamp.fromDate(transactionDate), 
      source: payload.source || 'user_manual',
      createdAt: FieldValue.serverTimestamp() as Timestamp, 
      updatedAt: FieldValue.serverTimestamp() as Timestamp,
    };
    t.set(newTransactionRef, newTransactionData);

    const balanceChange = payload.type === 'income' ? payload.amount : -payload.amount;
    t.update(accountDoc.ref, { balance: FieldValue.increment(balanceChange) });
    budgetDocs.forEach(doc => t.update(doc.ref, { spentAmount: FieldValue.increment(payload.amount) }));
    
    let docIndex = 1;
    if(payload.linkedGoalId) _applyGoalUpdate(t, docs[docIndex++], payload.amount);
    if(payload.linkedLoanTrackerId) _applyLoanUpdate(t, docs[docIndex++], payload.amount);
    if(payload.linkedSavingsTrackerId) _applySavingsUpdate(t, docs[docIndex++]);
  });

  const createdDoc = await newTransactionRef.get();
  return convertTransactionToDTO(createdDoc.data() as Transaction);
}

export async function updateTransaction(userId: string, transactionId: string, payload: UpdateTransactionPayload): Promise<TransactionDTO> {
    const transactionRef = transactionsCollection.doc(transactionId);

    const firestoreInstance = firestore;
    if (!firestoreInstance) throw new Error("Firestore not initialized.");

    await firestoreInstance.runTransaction(async (t) => {
        // --- PHASE 1: READS ---
        const oldTransactionDoc = await t.get(transactionRef);
        if (!oldTransactionDoc.exists) throw new Error("Transaction not found.");
        const oldData = oldTransactionDoc.data() as Transaction;
        if (oldData.userId !== userId) throw new Error("Unauthorized");

        const newData = { ...oldData, ...payload };
        const oldDate = (oldData.date as Timestamp).toDate();
        const newDate = payload.date ? new Date(payload.date) : oldDate;

        const refsToGet: DocumentReference[] = [accountsCollection.doc(oldData.accountId)];
        if (payload.accountId && payload.accountId !== oldData.accountId) refsToGet.push(accountsCollection.doc(payload.accountId));
        if (oldData.linkedGoalId) refsToGet.push(goalsCollection.doc(oldData.linkedGoalId));
        if (newData.linkedGoalId && newData.linkedGoalId !== oldData.linkedGoalId) refsToGet.push(goalsCollection.doc(newData.linkedGoalId));
        if (oldData.linkedLoanTrackerId) refsToGet.push(loanTrackersCollection.doc(oldData.linkedLoanTrackerId));
        if (newData.linkedLoanTrackerId && newData.linkedLoanTrackerId !== oldData.linkedLoanTrackerId) refsToGet.push(loanTrackersCollection.doc(newData.linkedLoanTrackerId));
        if (oldData.linkedSavingsTrackerId) refsToGet.push(savingsTrackersCollection.doc(oldData.linkedSavingsTrackerId));
        if (newData.linkedSavingsTrackerId && newData.linkedSavingsTrackerId !== oldData.linkedSavingsTrackerId) refsToGet.push(savingsTrackersCollection.doc(newData.linkedSavingsTrackerId));
        
        const otherDocs = await t.getAll(...refsToGet);
        const oldAccountDoc = otherDocs.shift();
        if(!oldAccountDoc) throw new Error("Old account not found during transaction update.");
        
        const oldBudgets = oldData.categoryId ? await getAffectedBudgets(t, userId, oldData.categoryId, oldDate) : [];
        const newBudgets = newData.categoryId ? await getAffectedBudgets(t, userId, newData.categoryId, newDate) : [];
        
        // --- PHASE 2: WRITES ---
        // 1. Revert old state
        t.update(oldAccountDoc.ref, { balance: FieldValue.increment(oldData.type === 'income' ? -oldData.amount : oldData.amount) });
        oldBudgets.forEach(doc => t.update(doc.ref, { spentAmount: FieldValue.increment(-oldData.amount) }));

        let docIndex = 0;
        const processRevert = (docRefId: string | null | undefined, updateFunc: (t: FirebaseFirestore.Transaction, doc: FirebaseFirestore.DocumentSnapshot, amount: number) => void) => {
            if (docRefId) updateFunc(t, otherDocs[docIndex++], -oldData.amount);
        };
        processRevert(oldData.linkedGoalId, _applyGoalUpdate);
        processRevert(oldData.linkedLoanTrackerId, _applyLoanUpdate);
        if (oldData.linkedSavingsTrackerId) _applySavingsUpdate(t, otherDocs[docIndex++]);


        // 2. Apply new state
        const newAccountRef = payload.accountId ? accountsCollection.doc(payload.accountId) : oldAccountDoc.ref;
        t.update(newAccountRef, { balance: FieldValue.increment(newData.type === 'income' ? newData.amount : -newData.amount) });
        newBudgets.forEach(doc => t.update(doc.ref, { spentAmount: FieldValue.increment(newData.amount) }));

        const processApply = (docRefId: string | null | undefined, updateFunc: (t: FirebaseFirestore.Transaction, doc: FirebaseFirestore.DocumentSnapshot, amount: number) => void) => {
            if (docRefId) updateFunc(t, otherDocs[docIndex++], newData.amount);
        };
        processApply(newData.linkedGoalId, _applyGoalUpdate);
        processApply(newData.linkedLoanTrackerId, _applyLoanUpdate);
        if (newData.linkedSavingsTrackerId) _applySavingsUpdate(t, otherDocs[docIndex++]);
        

        // 3. Update transaction doc
        const updatePayload = { ...payload, updatedAt: FieldValue.serverTimestamp() };
        if (updatePayload.date) {
            (updatePayload as any).date = Timestamp.fromDate(newDate);
        }
        t.update(transactionRef, updatePayload);
    });

    const updatedDoc = await transactionRef.get();
    return convertTransactionToDTO(updatedDoc.data() as Transaction);
}

export async function deleteTransaction(userId: string, transactionId: string): Promise<boolean> {
    const transactionRef = transactionsCollection.doc(transactionId);
    
    const firestoreInstance = firestore;
    if (!firestoreInstance) throw new Error("Firestore not initialized.");

    await firestoreInstance.runTransaction(async (t) => {
        // --- PHASE 1: ALL READS ---
        const mainTransactionDoc = await t.get(transactionRef);
        if (!mainTransactionDoc.exists) throw new Error("Transaction not found.");
        const mainTransaction = mainTransactionDoc.data() as Transaction;
        if (mainTransaction.userId !== userId) throw new Error("Unauthorized");

        const mainAccountDoc = await t.get(accountsCollection.doc(mainTransaction.accountId));
        if (!mainAccountDoc.exists) throw new Error("Account for transaction not found.");

        let linkedTransactionDoc: FirebaseFirestore.DocumentSnapshot | null = null;
        let linkedAccountDoc: FirebaseFirestore.DocumentSnapshot | null = null;
        let budgetDocs: FirebaseFirestore.QueryDocumentSnapshot<Budget>[] = [];
        let goalAndTrackerDocs: FirebaseFirestore.DocumentSnapshot[] = [];

        if (mainTransaction.source === 'account_transfer' && mainTransaction.linkedTransactionId) {
            const linkedTxRef = transactionsCollection.doc(mainTransaction.linkedTransactionId);
            linkedTransactionDoc = await t.get(linkedTxRef);
            if (linkedTransactionDoc.exists) {
                const linkedTxData = linkedTransactionDoc.data() as Transaction;
                linkedAccountDoc = await t.get(accountsCollection.doc(linkedTxData.accountId));
            }
        } else if (mainTransaction.type === 'expense' && mainTransaction.categoryId) {
            budgetDocs = await getAffectedBudgets(t, userId, mainTransaction.categoryId, (mainTransaction.date as Timestamp).toDate());
        }
        
        const goalAndTrackerRefs: (DocumentReference | null)[] = [
            mainTransaction.linkedGoalId ? goalsCollection.doc(mainTransaction.linkedGoalId) : null,
            mainTransaction.linkedLoanTrackerId ? loanTrackersCollection.doc(mainTransaction.linkedLoanTrackerId) : null,
            mainTransaction.linkedSavingsTrackerId ? savingsTrackersCollection.doc(mainTransaction.linkedSavingsTrackerId) : null,
        ];
        
        const validRefs = goalAndTrackerRefs.filter((ref): ref is DocumentReference => ref !== null);

        if (validRefs.length > 0) {
            goalAndTrackerDocs = await t.getAll(...validRefs);
        }

        // --- END OF READS ---

        // --- PHASE 2: ALL WRITES ---
        const mainAccountData = mainAccountDoc.data() as Account;
        const mainIsLiability = (LIABILITY_TYPES as readonly string[]).includes(mainAccountData.type);
        let mainBalanceChange = 0;
        if (mainTransaction.type === 'expense') {
            mainBalanceChange = mainIsLiability ? -mainTransaction.amount : mainTransaction.amount;
        } else {
            mainBalanceChange = mainIsLiability ? mainTransaction.amount : -mainTransaction.amount;
        }
        t.update(mainAccountDoc.ref, { balance: FieldValue.increment(mainBalanceChange) });

        if (linkedTransactionDoc?.exists && linkedAccountDoc?.exists) {
            const linkedTx = linkedTransactionDoc.data() as Transaction;
            const linkedAccountData = linkedAccountDoc.data() as Account;
            const linkedIsLiability = (LIABILITY_TYPES as readonly string[]).includes(linkedAccountData.type);
            const linkedBalanceChange = linkedIsLiability ? linkedTx.amount : -linkedTx.amount;
            t.update(linkedAccountDoc.ref, { balance: FieldValue.increment(linkedBalanceChange) });
            t.delete(linkedTransactionDoc.ref);
        }
        
        budgetDocs.forEach(doc => t.update(doc.ref, { spentAmount: FieldValue.increment(-mainTransaction.amount) }));

        let docIndex = 0;
        if(mainTransaction.linkedGoalId) _applyGoalUpdate(t, goalAndTrackerDocs[docIndex++], -mainTransaction.amount);
        if(mainTransaction.linkedLoanTrackerId) _applyLoanUpdate(t, goalAndTrackerDocs[docIndex++], -mainTransaction.amount);
        if(mainTransaction.linkedSavingsTrackerId) _applySavingsUpdate(t, goalAndTrackerDocs[docIndex++]);
        
        t.delete(transactionRef);
    });

    return true;
}

// NOTE: The getTransactionsByUserId function remains unchanged for now.
export async function getTransactionsByUserId(userId: string, filters: { year?: string, month?: string, categoryId?: string, accountId?: string } = {}): Promise<TransactionDTO[]> {
    let query: FirebaseFirestore.Query<Transaction> = transactionsCollection.where('userId', '==', userId);

    if (filters.year && filters.month) {
        const year = parseInt(filters.year, 10);
        const month = parseInt(filters.month, 10);
        // Use UTC dates for consistent filtering
        const startDate = new Date(Date.UTC(year, month - 1, 1));
        const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
        // Convert to Firestore Timestamps
        const startTimestamp = Timestamp.fromDate(startDate);
        const endTimestamp = Timestamp.fromDate(endDate);
        query = query.where('date', '>=', startTimestamp).where('date', '<=', endTimestamp);
    }

    if (filters.categoryId) {
        query = query.where('categoryId', '==', filters.categoryId);
    }
if (filters.accountId) {
        query = query.where('accountId', '==', filters.accountId);
    }

    const snapshot = await query.orderBy('date', 'desc').get();
    if (snapshot.empty) {
        return [];
    }
    return snapshot.docs.map(doc => convertTransactionToDTO(doc.data()));
}

export async function createTransfer(userId: string, payload: CreateTransferPayload): Promise<{ from: TransactionDTO, to: TransactionDTO }> {
    const fromAccountRef = accountsCollection.doc(payload.fromAccountId);
    const toAccountRef = accountsCollection.doc(payload.toAccountId);
    const fromTransactionRef = transactionsCollection.doc();
    const toTransactionRef = transactionsCollection.doc();
    
    if (payload.fromAccountId === payload.toAccountId) {
        throw new Error("Source and destination accounts cannot be the same.");
    }
    if (payload.amount <= 0) {
        throw new Error("Transfer amount must be positive.");
    }

    const firestoreInstance = firestore;
    if (!firestoreInstance) throw new Error("Firestore not initialized.");

    await firestoreInstance.runTransaction(async (t) => {
        const [fromAccountDoc, toAccountDoc] = await t.getAll(fromAccountRef, toAccountRef);

        if (!fromAccountDoc.exists || !toAccountDoc.exists) {
            throw new Error("One or both accounts not found.");
        }

        const fromAccountData = fromAccountDoc.data() as Account;
        const toAccountData = toAccountDoc.data() as Account;
        if (fromAccountData.userId !== userId || toAccountData.userId !== userId) {
            throw new Error("Unauthorized access to one or both accounts.");
        }
        
        const transferDate = payload.date ? Timestamp.fromDate(new Date(payload.date)) : (FieldValue.serverTimestamp() as Timestamp);
        const commonData = {
            userId,
            amount: payload.amount,
            date: transferDate,
            notes: payload.notes || null,
            source: 'account_transfer' as const,
            createdAt: FieldValue.serverTimestamp() as Timestamp,
            updatedAt: FieldValue.serverTimestamp() as Timestamp,
        };

        const fromTransaction: Transaction = {
            ...commonData,
            transactionId: fromTransactionRef.id,
            accountId: payload.fromAccountId,
            type: 'expense',
            description: `Transfer to ${toAccountData.name}`,
            categoryId: null, // Transfers are not categorized
            linkedTransactionId: toTransactionRef.id,
        };

        const toTransaction: Transaction = {
            ...commonData,
            transactionId: toTransactionRef.id,
            accountId: payload.toAccountId,
            type: 'income',
            description: `Transfer from ${fromAccountData.name}`,
            categoryId: null,
            linkedTransactionId: fromTransactionRef.id,
        };

        t.set(fromTransactionRef, fromTransaction);
        t.set(toTransactionRef, toTransaction);
        
        t.update(fromAccountRef, { balance: FieldValue.increment(-payload.amount) });
        t.update(toAccountRef, { balance: FieldValue.increment(payload.amount) });
    });

    const fromDoc = await fromTransactionRef.get();
    const toDoc = await toTransactionRef.get();
    
    return {
        from: convertTransactionToDTO(fromDoc.data() as Transaction),
        to: convertTransactionToDTO(toDoc.data() as Transaction)
    };
}
