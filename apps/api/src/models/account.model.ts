// apps/api/src/models/account.model.ts
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Defines the specific types of financial accounts, categorized by assets and liabilities.
 */
export const ASSET_TYPES = ['checking', 'savings', 'cash', 'investment', 'property', 'other_asset'] as const;
export const LIABILITY_TYPES = ['credit_card', 'home_loan', 'personal_loan', 'car_loan', 'student_loan', 'line_of_credit', 'other_liability'] as const;

export type AssetType = typeof ASSET_TYPES[number];
export type LiabilityType = typeof LIABILITY_TYPES[number];
export type AccountType = AssetType | LiabilityType;

/**
 * Represents a financial account in the Firestore database.
 */
export interface Account {
  accountId: string; // Firestore document ID
  userId: string;    // ID of the user who owns this account
  name: string;      // e.g., "Main Checking", "Visa Gold Card"
  type: AccountType;
  balance: number;   // Current balance. For liabilities, this is the amount owed (a positive number).
  institution?: string | null; // Optional: "Bank of America", "Chase"
  accountNumber?: string | null; // Optional: Last 4 digits for identification
  currency: string;  // e.g., "AUD", "USD"
  isActive: boolean; // For soft deletes
  createdAt: Timestamp | Date | string;
  updatedAt: Timestamp | Date | string;
}

// --- Payloads for API requests ---

export interface CreateAccountPayload {
  name: string;
  type: AccountType;
  balance: number;
  institution?: string | null;
  accountNumber?: string | null;
  currency?: string;
}

export interface UpdateAccountPayload {
  name?: string;
  type?: AccountType;
  balance?: number;
  institution?: string | null;
  accountNumber?: string | null;
  currency?: string;
  isActive?: boolean;
}

// --- Data Transfer Object (DTO) for API responses ---

export interface AccountDTO {
  accountId: string;
  userId: string;
  name: string;
  type: AccountType;
  balance: number;
  institution: string | null;
  accountNumber: string | null;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
