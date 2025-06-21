// apps/api/src/services/transactionService.ts
import { firestore } from '../config/firebase';
import {
  Transaction,
  CreateTransactionPayload,
  UpdateTransactionPayload,
  TransactionDTO,
} from '../models/transaction.model';
import { Account } from '../models/account.model';
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
        // --- PHASE 1: READS ---
        const transactionDoc = await t.get(transactionRef);
        if (!transactionDoc.exists) throw new Error("Transaction not found.");
        const data = transactionDoc.data() as Transaction;
        if (data.userId !== userId) throw new Error("Unauthorized");

        const docsToGet: DocumentReference[] = [accountsCollection.doc(data.accountId)];
        if(data.linkedGoalId) docsToGet.push(goalsCollection.doc(data.linkedGoalId));
        if(data.linkedLoanTrackerId) docsToGet.push(loanTrackersCollection.doc(data.linkedLoanTrackerId));
        if(data.linkedSavingsTrackerId) docsToGet.push(savingsTrackersCollection.doc(data.linkedSavingsTrackerId));

        const otherDocs = await t.getAll(...docsToGet);
        const accountDoc = otherDocs.shift();
        if (!accountDoc) throw new Error("Account not found during transaction deletion.");


        const budgetDocs = data.categoryId ? await getAffectedBudgets(t, userId, data.categoryId, (data.date as Timestamp).toDate()) : [];
        
        // --- PHASE 2: WRITES ---
        t.update(accountDoc.ref, { balance: FieldValue.increment(data.type === 'income' ? -data.amount : data.amount) });
        budgetDocs.forEach(doc => t.update(doc.ref, { spentAmount: FieldValue.increment(-data.amount) }));
        
        let docIndex = 0;
        if(data.linkedGoalId) _applyGoalUpdate(t, otherDocs[docIndex++], -data.amount);
        if(data.linkedLoanTrackerId) _applyLoanUpdate(t, otherDocs[docIndex++], -data.amount);
        if(data.linkedSavingsTrackerId) _applySavingsUpdate(t, otherDocs[docIndex++]);
        
        t.delete(transactionRef);
    });

    return true;
}

// NOTE: The getTransactionsByUserId function remains unchanged for now.
export async function getTransactionsByUserId(userId: string, filters: { year?: string, month?: string, categoryId?: string, accountId?: string } = {}): Promise<TransactionDTO[]> {
    let query: FirebaseFirestore.Query<Transaction> = transactionsCollection.where('userId', '==', userId);

    if (filters.year && filters.month) {
        const year = parseInt(filters.year, 10);
        const month = parseInt(filters.month, 10) -1;
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
        query = query.where('date', '>=', startDate).where('date', '<=', endDate);
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
