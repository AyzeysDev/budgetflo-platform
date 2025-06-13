// apps/api/src/services/transactionService.ts
import { firestore, firebaseInitialized } from '../config/firebase';
import {
  Transaction,
  CreateTransactionPayload,
  UpdateTransactionPayload,
  TransactionDTO,
} from '../models/transaction.model';
import { Account } from '../models/account.model';
import { Budget } from '../models/budget.model';
import { Timestamp, FieldValue, CollectionReference, DocumentReference, Filter } from 'firebase-admin/firestore';
import { getCategoryById } from './categoryService';

if (!firebaseInitialized) {
  throw new Error("TransactionService: Firebase is not initialized. Operations will fail.");
}

const getCollection = <T extends FirebaseFirestore.DocumentData>(collectionName: string): CollectionReference<T> => {
  const firestoreInstance = firestore;
  if (!firestoreInstance) {
    throw new Error("Firestore is not initialized. Cannot get collection.");
  }
  return firestoreInstance.collection(collectionName) as CollectionReference<T>;
};

const transactionsCollection = getCollection<Transaction>('transactions');
const accountsCollection = getCollection<Account>('accounts');
const budgetsCollection = getCollection<Budget>('budgets');

function convertTransactionToDTO(transactionData: Transaction): TransactionDTO {
  return {
    ...transactionData,
    date: (transactionData.date as Timestamp).toDate().toISOString(),
    createdAt: (transactionData.createdAt as Timestamp).toDate().toISOString(),
    updatedAt: (transactionData.updatedAt as Timestamp).toDate().toISOString(),
  };
}

/**
 * Gathers all budget documents that could be affected by a transaction.
 * It separately queries for the overall budget and the specific category budget.
 * This avoids a complex OR query that requires multiple composite indexes.
 */
async function getAffectedBudgets(
  t: FirebaseFirestore.Transaction,
  userId: string,
  categoryId: string,
  date: Date
): Promise<FirebaseFirestore.QueryDocumentSnapshot<Budget>[]> {
  const transactionTimestamp = Timestamp.fromDate(date);

  // Query 1: Find the most recent overall budget that started on or before the transaction date
  const overallBudgetQuery = budgetsCollection
    .where('userId', '==', userId)
    .where('isOverall', '==', true)
    .where('startDate', '<=', transactionTimestamp)
    .orderBy('startDate', 'desc')
    .limit(1);

  // Query 2: Find the most recent category budget that started on or before the transaction date
  const categoryBudgetQuery = budgetsCollection
    .where('userId', '==', userId)
    .where('categoryId', '==', categoryId)
    .where('startDate', '<=', transactionTimestamp)
    .orderBy('startDate', 'desc')
    .limit(1);

  const [overallSnapshot, categorySnapshot] = await Promise.all([
    t.get(overallBudgetQuery),
    t.get(categoryBudgetQuery)
  ]);

  const allDocs = new Map<string, FirebaseFirestore.QueryDocumentSnapshot<Budget>>();
  
  // Filter in-code to ensure the transaction is within the budget's endDate
  overallSnapshot.docs.forEach(doc => {
    const budget = doc.data() as Budget;
    if ((budget.endDate as Timestamp) >= transactionTimestamp) {
        allDocs.set(doc.id, doc as FirebaseFirestore.QueryDocumentSnapshot<Budget>);
    }
  });
  categorySnapshot.docs.forEach(doc => {
      const budget = doc.data() as Budget;
      if ((budget.endDate as Timestamp) >= transactionTimestamp) {
          allDocs.set(doc.id, doc as FirebaseFirestore.QueryDocumentSnapshot<Budget>);
      }
  });

  return Array.from(allDocs.values());
}


/**
 * Creates a new transaction and atomically updates related account and budget documents.
 */
export async function createTransaction(userId: string, payload: CreateTransactionPayload): Promise<TransactionDTO> {
  if (payload.type === 'expense' && !payload.categoryId) {
    throw new Error('Category is required for an expense.');
  }
  if (payload.amount <= 0) {
    throw new Error('Transaction amount must be positive.');
  }

  const newTransactionRef = transactionsCollection.doc();
  const transactionDate = new Date(payload.date);
  
  const firestoreInstance = firestore;
  if (!firestoreInstance) {
      throw new Error("Firestore is not initialized for transaction.");
  }

  await firestoreInstance.runTransaction(async (t) => {
    // --- READ PHASE ---
    const accountRef = accountsCollection.doc(payload.accountId);
    const accountDoc = await t.get(accountRef);
    if (!accountDoc.exists) throw new Error(`Account with ID ${payload.accountId} not found.`);

    let budgetDocsToUpdate: FirebaseFirestore.QueryDocumentSnapshot<Budget>[] = [];
    if (payload.type === 'expense' && payload.categoryId) {
        budgetDocsToUpdate = await getAffectedBudgets(t, userId, payload.categoryId, transactionDate);
    }

    // --- WRITE PHASE ---
    const newTransactionData: Transaction = {
      transactionId: newTransactionRef.id,
      userId,
      date: Timestamp.fromDate(transactionDate),
      amount: payload.amount,
      type: payload.type,
      accountId: payload.accountId,
      categoryId: payload.categoryId || null,
      notes: payload.notes || null,
      createdAt: FieldValue.serverTimestamp() as Timestamp,
      updatedAt: FieldValue.serverTimestamp() as Timestamp,
    };
    t.set(newTransactionRef, newTransactionData);

    const accountBalanceChange = payload.type === 'income' ? payload.amount : -payload.amount;
    t.update(accountRef, { balance: FieldValue.increment(accountBalanceChange) });

    budgetDocsToUpdate.forEach(doc => {
        t.update(doc.ref, { spentAmount: FieldValue.increment(payload.amount) });
    });
  });

  const createdDoc = await newTransactionRef.get();
  return convertTransactionToDTO(createdDoc.data() as Transaction);
}


export async function getTransactionsByUserId(userId: string, filters: { year?: string, month?: string, categoryId?: string, accountId?: string } = {}): Promise<TransactionDTO[]> {
    let query: FirebaseFirestore.Query<Transaction> = transactionsCollection.where('userId', '==', userId);

    if (filters.year && filters.month) {
        const year = parseInt(filters.year, 10);
        const month = parseInt(filters.month, 10) -1; // JS months are 0-indexed
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


export async function updateTransaction(userId: string, transactionId: string, payload: UpdateTransactionPayload): Promise<TransactionDTO | null> {
    const transactionRef = transactionsCollection.doc(transactionId);

    const firestoreInstance = firestore;
    if (!firestoreInstance) {
      throw new Error("Firestore is not initialized for transaction.");
    }

    await firestoreInstance.runTransaction(async (t) => {
        // --- READ PHASE ---
        const transactionDoc = await t.get(transactionRef);
        if (!transactionDoc.exists) throw new Error("Transaction not found.");
        const oldData = transactionDoc.data() as Transaction;
        if (oldData.userId !== userId) throw new Error("Unauthorized to edit this transaction.");
        
        const finalData = { ...oldData, ...payload, date: payload.date ? Timestamp.fromDate(new Date(payload.date)) : oldData.date };

        const oldAccountRef = accountsCollection.doc(oldData.accountId);
        const newAccountRef = accountsCollection.doc(finalData.accountId);
        
        const [oldAccountDoc, newAccountDoc] = await Promise.all([
            t.get(oldAccountRef),
            oldData.accountId === finalData.accountId ? Promise.resolve(null) : t.get(newAccountRef)
        ]);
        
        if (!oldAccountDoc.exists) throw new Error(`Original account with ID ${oldData.accountId} not found.`);
        if (newAccountDoc && !newAccountDoc.exists) throw new Error(`New account with ID ${finalData.accountId} not found.`);

        let oldBudgetDocs: FirebaseFirestore.QueryDocumentSnapshot<Budget>[] = [];
        if (oldData.type === 'expense' && oldData.categoryId) {
            oldBudgetDocs = await getAffectedBudgets(t, userId, oldData.categoryId, (oldData.date as Timestamp).toDate());
        }

        let newBudgetDocs: FirebaseFirestore.QueryDocumentSnapshot<Budget>[] = [];
        if (finalData.type === 'expense' && finalData.categoryId) {
            newBudgetDocs = await getAffectedBudgets(t, userId, finalData.categoryId, (finalData.date as Timestamp).toDate());
        }

        // --- WRITE PHASE ---
        // 1. Reverse old transaction impacts
        const oldAccountBalanceChange = oldData.type === 'income' ? -oldData.amount : oldData.amount;
        t.update(oldAccountRef, { balance: FieldValue.increment(oldAccountBalanceChange) });
        oldBudgetDocs.forEach(doc => {
            t.update(doc.ref, { spentAmount: FieldValue.increment(-oldData.amount) });
        });

        // 2. Apply new transaction impacts
        const newAccountBalanceChange = finalData.type === 'income' ? finalData.amount : -finalData.amount;
        t.update(newAccountRef, { balance: FieldValue.increment(newAccountBalanceChange) });
        newBudgetDocs.forEach(doc => {
            t.update(doc.ref, { spentAmount: FieldValue.increment(finalData.amount) });
        });
        
        // 3. Update the transaction itself
        t.update(transactionRef, { ...finalData, updatedAt: FieldValue.serverTimestamp() });
    });

    const updatedDoc = await transactionRef.get();
    return convertTransactionToDTO(updatedDoc.data() as Transaction);
}


export async function deleteTransaction(userId: string, transactionId: string): Promise<boolean> {
    const transactionRef = transactionsCollection.doc(transactionId);
    
    const firestoreInstance = firestore;
    if (!firestoreInstance) {
      throw new Error("Firestore is not initialized for transaction.");
    }

    await firestoreInstance.runTransaction(async (t) => {
        // --- READ PHASE ---
        const transactionDoc = await t.get(transactionRef);
        if (!transactionDoc.exists) throw new Error("Transaction not found.");
        const data = transactionDoc.data() as Transaction;
        if (data.userId !== userId) throw new Error("Unauthorized to delete this transaction.");
        
        const accountRef = accountsCollection.doc(data.accountId);
        const accountDoc = await t.get(accountRef);
        if (!accountDoc.exists) throw new Error(`Associated account with ID ${data.accountId} not found.`);

        let budgetDocsToUpdate: FirebaseFirestore.QueryDocumentSnapshot<Budget>[] = [];
        if (data.type === 'expense' && data.categoryId) {
            budgetDocsToUpdate = await getAffectedBudgets(t, userId, data.categoryId, (data.date as Timestamp).toDate());
        }

        // --- WRITE PHASE ---
        const accountBalanceChange = data.type === 'income' ? -data.amount : data.amount;
        t.update(accountRef, { balance: FieldValue.increment(accountBalanceChange) });
        
        budgetDocsToUpdate.forEach(doc => {
            t.update(doc.ref, { spentAmount: FieldValue.increment(-data.amount) });
        });
        
        t.delete(transactionRef);
    });

    return true;
}
