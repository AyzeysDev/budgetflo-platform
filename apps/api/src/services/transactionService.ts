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
 * Creates a new transaction and atomically updates related account and budget documents.
 * This function follows the "reads-before-writes" rule for Firestore transactions.
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
  const transactionTimestamp = Timestamp.fromDate(transactionDate);

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
        const budgetQuery = budgetsCollection.where(
            Filter.and(
                Filter.where('userId', '==', userId),
                Filter.where('startDate', '<=', transactionTimestamp),
                Filter.where('endDate', '>=', transactionTimestamp),
                Filter.or(
                    Filter.where('isOverall', '==', true),
                    Filter.where('categoryId', '==', payload.categoryId)
                )
            )
        );
      const budgetSnapshot = await t.get(budgetQuery);
      budgetDocsToUpdate = budgetSnapshot.docs as FirebaseFirestore.QueryDocumentSnapshot<Budget>[];
    }

    // --- WRITE PHASE ---
    const newTransactionData: Transaction = {
      transactionId: newTransactionRef.id,
      userId,
      date: transactionTimestamp,
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


export async function getTransactionsByUserId(userId: string, filters: { startDate?: string, endDate?: string, categoryId?: string, accountId?: string } = {}): Promise<TransactionDTO[]> {
    let query: FirebaseFirestore.Query<Transaction> = transactionsCollection.where('userId', '==', userId);

    if (filters.startDate) {
        query = query.where('date', '>=', new Date(filters.startDate));
    }
    if (filters.endDate) {
        query = query.where('date', '<=', new Date(filters.endDate));
    }
    if (filters.categoryId) {
        query = query.where('categoryId', '==', filters.categoryId);
    }
    if (filters.accountId) {
        query = query.where('accountId', '==', filters.accountId);
    }

    if (!filters.startDate && !filters.endDate) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        query = query.where('date', '>=', thirtyDaysAgo);
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

        const newData: Partial<Transaction> = {
            ...payload,
            date: payload.date ? Timestamp.fromDate(new Date(payload.date)) : oldData.date
        };

        const oldAccountRef = accountsCollection.doc(oldData.accountId);
        const oldAccountDoc = await t.get(oldAccountRef);
        if (!oldAccountDoc.exists) throw new Error(`Original account with ID ${oldData.accountId} not found.`);

        const newAccountId = newData.accountId || oldData.accountId;
        const newAccountRef = accountsCollection.doc(newAccountId);
        const newAccountDoc = oldData.accountId === newAccountId ? oldAccountDoc : await t.get(newAccountRef);
        if (!newAccountDoc.exists) throw new Error(`New account with ID ${newAccountId} not found.`);

        let oldBudgetSnapshot: FirebaseFirestore.QuerySnapshot<Budget> | null = null;
        if (oldData.type === 'expense' && oldData.categoryId) {
            const oldBudgetsQuery = budgetsCollection.where(
                Filter.and(
                    Filter.where('userId', '==', userId),
                    Filter.where('startDate', '<=', oldData.date),
                    Filter.where('endDate', '>=', oldData.date),
                    Filter.or(
                        Filter.where('isOverall', '==', true),
                        Filter.where('categoryId', '==', oldData.categoryId)
                    )
                )
            );
            oldBudgetSnapshot = await t.get(oldBudgetsQuery);
        }

        const finalData = { ...oldData, ...newData };
        let newBudgetSnapshot: FirebaseFirestore.QuerySnapshot<Budget> | null = null;
        if (finalData.type === 'expense' && finalData.categoryId) {
            const newBudgetsQuery = budgetsCollection.where(
                Filter.and(
                    Filter.where('userId', '==', userId),
                    Filter.where('startDate', '<=', finalData.date),
                    Filter.where('endDate', '>=', finalData.date),
                    Filter.or(
                        Filter.where('isOverall', '==', true),
                        Filter.where('categoryId', '==', finalData.categoryId)
                    )
                )
            );
            newBudgetSnapshot = await t.get(newBudgetsQuery);
        }

        // --- WRITE PHASE ---
        const oldAccountBalanceChange = oldData.type === 'income' ? -oldData.amount : oldData.amount;
        t.update(oldAccountRef, { balance: FieldValue.increment(oldAccountBalanceChange) });
        if (oldBudgetSnapshot) {
            oldBudgetSnapshot.docs.forEach(doc => {
                 t.update(doc.ref, { spentAmount: FieldValue.increment(-oldData.amount) });
            });
        }

        const newAccountBalanceChange = finalData.type === 'income' ? finalData.amount : -finalData.amount;
        t.update(newAccountRef, { balance: FieldValue.increment(newAccountBalanceChange) });
        if (newBudgetSnapshot) {
            newBudgetSnapshot.docs.forEach(doc => {
                t.update(doc.ref, { spentAmount: FieldValue.increment(finalData.amount) });
            });
        }

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
             const budgetQuery = budgetsCollection.where(
                Filter.and(
                    Filter.where('userId', '==', userId),
                    Filter.where('startDate', '<=', data.date),
                    Filter.where('endDate', '>=', data.date),
                    Filter.or(
                        Filter.where('isOverall', '==', true),
                        Filter.where('categoryId', '==', data.categoryId)
                    )
                )
            );
            const budgetSnapshot = await t.get(budgetQuery);
            budgetDocsToUpdate = budgetSnapshot.docs as FirebaseFirestore.QueryDocumentSnapshot<Budget>[];
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
