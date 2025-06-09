// apps/web/src/types/account.ts

/**
 * Defines the specific types of financial accounts, categorized by assets and liabilities.
 * This should mirror the types from the backend API models.
 */
export const ASSET_TYPES = ['checking', 'savings', 'cash', 'investment', 'property', 'other_asset'] as const;
export const LIABILITY_TYPES = ['credit_card', 'home_loan', 'personal_loan', 'car_loan', 'student_loan', 'line_of_credit', 'other_liability'] as const;

export type WebAppAssetType = typeof ASSET_TYPES[number];
export type WebAppLiabilityType = typeof LIABILITY_TYPES[number];
export type WebAppAccountType = WebAppAssetType | WebAppLiabilityType;

/**
 * Represents a user's financial account as received by the web application from the BFF.
 */
export interface WebAppAccount {
  accountId: string;
  userId: string;
  name: string;
  type: WebAppAccountType;
  balance: number;
  institution: string | null;
  accountNumber: string | null;
  currency: string;
  isActive: boolean;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

/**
 * Payload for creating a new account via the web application's BFF.
 */
export interface WebAppCreateAccountPayload {
  name: string;
  type: WebAppAccountType;
  balance: number;
  institution?: string | null;
  accountNumber?: string | null;
  currency?: string;
}

/**
 * Payload for updating an existing account via the web application's BFF.
 */
export interface WebAppUpdateAccountPayload {
  name?: string;
  type?: WebAppAccountType;
  balance?: number;
  institution?: string | null;
  accountNumber?: string | null;
  currency?: string;
}
