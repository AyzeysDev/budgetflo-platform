// apps/web/src/types/transaction.ts
import type { WebAppAccount } from './account';
import type { WebAppCategory } from './budget';

/**
 * Represents a financial transaction as received and used by the web application.
 * This mirrors the TransactionDTO from the backend.
 */
export interface WebAppTransaction {
  transactionId: string;
  userId: string;
  date: string; // ISO date string
  amount: number;
  type: 'income' | 'expense';
  accountId: string;
  categoryId?: string | null;
  notes?: string | null;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  
  // Enriched data for display purposes
  category?: WebAppCategory | null;
  account?: WebAppAccount | null;
}

/**
 * Payload for creating a new transaction via the BFF.
 */
export interface WebAppCreateTransactionPayload {
  date: string; // ISO date string
  amount: number;
  type: 'income' | 'expense';
  accountId: string;
  categoryId?: string | null;
  notes?: string | null;
}

/**
 * Payload for updating an existing transaction via the BFF.
 */
export interface WebAppUpdateTransactionPayload {
  date?: string;
  amount?: number;
  type?: 'income' | 'expense';
  accountId?: string;
  categoryId?: string | null;
  notes?: string | null;
}
