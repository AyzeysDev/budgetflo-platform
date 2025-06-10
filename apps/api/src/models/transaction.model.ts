// apps/api/src/models/transaction.model.ts
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Represents a single financial transaction in the Firestore database.
 * This is the source of truth for all financial movements.
 */
export interface Transaction {
  transactionId: string; // Firestore document ID
  userId: string;        // ID of the user who owns this transaction
  date: Timestamp;       // The date and time the transaction occurred
  amount: number;        // The value of the transaction (always a positive number)
  type: 'income' | 'expense'; // The nature of the transaction
  accountId: string;     // The account this transaction belongs to
  categoryId?: string | null; // The category of the transaction (required for expenses)
  notes?: string | null;      // Optional user notes
  createdAt: Timestamp;
  updatedAt: Timestamp;
  budgetId?: string | null; // Legacy or for specific direct linking if ever needed
}

// --- Payloads for API Requests ---

/**
 * Defines the shape of the data required to create a new transaction.
 */
export interface CreateTransactionPayload {
  date: string; // Expect ISO date string from client
  amount: number;
  type: 'income' | 'expense';
  accountId: string;
  categoryId?: string | null;
  notes?: string | null;
}

/**
 * Defines the shape of the data for updating an existing transaction.
 * All fields are optional.
 */
export interface UpdateTransactionPayload {
  date?: string; // Expect ISO date string
  amount?: number;
  type?: 'income' | 'expense';
  accountId?: string;
  categoryId?: string | null;
  notes?: string | null;
}

// --- Data Transfer Object (DTO) for API Responses ---
import type { CategoryDTO } from './budget.model';
import type { AccountDTO } from './account.model';


/**
 * Represents a transaction as it is sent to the client.
 * Timestamps are converted to ISO strings for easy consumption.
 * May be enriched with related data like category or account details.
 */
export interface TransactionDTO extends Omit<Transaction, 'createdAt' | 'updatedAt' | 'date'> {
  date: string;       // ISO string format
  createdAt: string;  // ISO string format
  updatedAt: string;  // ISO string format
  // Optional, enriched data for frontend display
  category?: CategoryDTO | null;
  account?: AccountDTO | null;
}
