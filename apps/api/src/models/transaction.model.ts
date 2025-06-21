// apps/api/src/models/transaction.model.ts
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Represents a single financial transaction in the Firestore database.
 * This is the source of truth for all financial movements.
 */
export interface Transaction {
  transactionId: string; // Firestore document ID
  userId: string;        // ID of the user who owns this transaction
  accountId: string;     // The account this transaction belongs to
  categoryId?: string | null; // The category of the transaction (required for expenses)
  type: 'income' | 'expense'; // The nature of the transaction
  amount: number;        // The value of the transaction (always a positive number)
  date: Timestamp;       // The date and time the transaction occurred
  description: string;
  notes?: string | null;      // Optional user notes
  
  /** The source of the transaction to differentiate user input from system-generated events */
  source?: 'user_manual' | 'goal_contribution' | 'loan_payment' | 'savings_contribution' | 'system_reconciliation';
  /** The goal this transaction contributes to */
  linkedGoalId?: string | null;
  /** The loan tracker this transaction is a payment for */
  linkedLoanTrackerId?: string | null;
  /** The savings tracker this transaction contributes to */
  linkedSavingsTrackerId?: string | null;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// --- Payloads for API Requests ---

/**
 * Defines the shape of the data required to create a new transaction.
 */
export interface CreateTransactionPayload {
  accountId: string;
  categoryId?: string | null;
  type: 'income' | 'expense';
  amount: number;
  date: string; // Expect ISO date string from client
  description: string;
  notes?: string | null;

  source?: 'user_manual' | 'goal_contribution' | 'loan_payment' | 'savings_contribution';
  linkedGoalId?: string;
  linkedLoanTrackerId?: string;
  linkedSavingsTrackerId?: string;
}

/**
 * Defines the shape of the data for updating an existing transaction.
 * All fields are optional.
 */
export interface UpdateTransactionPayload {
  accountId?: string;
  categoryId?: string | null;
  type?: 'income' | 'expense';
  amount?: number;
  date?: string; // Expect ISO date string
  description?: string;
  notes?: string | null;

  // These are less commonly updated but supported for flexibility
  source?: 'user_manual' | 'goal_contribution' | 'loan_payment' | 'savings_contribution';
  linkedGoalId?: string | null;
  linkedLoanTrackerId?: string | null;
  linkedSavingsTrackerId?: string | null;
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
