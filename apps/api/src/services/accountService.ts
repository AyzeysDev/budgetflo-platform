// apps/api/src/services/accountService.ts
import { firestore, firebaseInitialized } from '../config/firebase';
import {
  Account,
  AccountDTO,
  CreateAccountPayload,
  UpdateAccountPayload
} from '../models/account.model';
import { Timestamp, FieldValue, CollectionReference } from 'firebase-admin/firestore';

if (!firebaseInitialized) {
  console.error("AccountService: Firebase is not initialized. Account operations will fail.");
}

const getAccountsCollection = (): CollectionReference<Account> => {
  if (!firestore) throw new Error("Firestore is not initialized.");
  return firestore.collection('accounts') as CollectionReference<Account>;
};

function convertAccountToDTO(accountData: Account): AccountDTO {
  return {
    ...accountData,
    institution: accountData.institution || null,
    accountNumber: accountData.accountNumber || null,
    createdAt: (accountData.createdAt as Timestamp).toDate().toISOString(),
    updatedAt: (accountData.updatedAt as Timestamp).toDate().toISOString(),
  };
}

export async function createAccount(userId: string, payload: CreateAccountPayload): Promise<AccountDTO> {
  const accountsCollection = getAccountsCollection();
  const newAccountRef = accountsCollection.doc();
  const now = FieldValue.serverTimestamp() as Timestamp;

  const accountData: Account = {
    accountId: newAccountRef.id,
    userId,
    name: payload.name,
    type: payload.type,
    balance: payload.balance,
    institution: payload.institution || null,
    accountNumber: payload.accountNumber || null,
    currency: payload.currency || 'AUD',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  await newAccountRef.set(accountData);
  const docSnapshot = await newAccountRef.get();
  const createdData = docSnapshot.data() as Account;
  return convertAccountToDTO(createdData);
}

export async function getAccountsByUserId(userId: string): Promise<AccountDTO[]> {
  const accountsCollection = getAccountsCollection();
  const snapshot = await accountsCollection.where('userId', '==', userId).where('isActive', '==', true).get();

  if (snapshot.empty) {
    return [];
  }

  const accounts = snapshot.docs.map(doc => convertAccountToDTO(doc.data() as Account));
  // Default sorting can be by type then name, or let client handle it
  accounts.sort((a, b) => a.name.localeCompare(b.name));
  return accounts;
}

export async function updateAccount(accountId: string, userId: string, payload: UpdateAccountPayload): Promise<AccountDTO | null> {
  const accountRef = getAccountsCollection().doc(accountId);
  const doc = await accountRef.get();

  if (!doc.exists || (doc.data() as Account).userId !== userId) {
    throw new Error("Account not found or user is not authorized.");
  }

  const dataToUpdate: Partial<UpdateAccountPayload> & { updatedAt: Timestamp } = {
    ...payload,
    updatedAt: FieldValue.serverTimestamp() as Timestamp,
  };

  await accountRef.update(dataToUpdate);
  const updatedDoc = await accountRef.get();
  return convertAccountToDTO(updatedDoc.data() as Account);
}

export async function softDeleteAccount(accountId: string, userId: string): Promise<boolean> {
  const accountRef = getAccountsCollection().doc(accountId);
  const doc = await accountRef.get();

  if (!doc.exists || (doc.data() as Account).userId !== userId) {
    throw new Error("Account not found or user is not authorized.");
  }

  await accountRef.update({
    isActive: false,
    updatedAt: FieldValue.serverTimestamp(),
  });
  return true;
}
