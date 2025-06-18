import type { WebAppAccount } from './account';
import type { WebAppGoal } from './goal';

export interface WebAppLoanTracker {
  trackerId: string;
  userId: string;
  name: string;
  linkedAccountId: string | null;
  totalAmount: number;
  emiAmount: number;
  interestRate: number; // Percentage
  tenureMonths: number;
  startDate: string; // ISO date string
  nextDueDate: string; // ISO date string
  paidInstallments: number;
  remainingBalance: number;
  isActive: boolean;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  completionPercentage?: number;
  monthsRemaining?: number;
  totalInterest?: number;
  // Enriched data
  account?: WebAppAccount | null;
}

export interface WebAppSavingsTracker {
  trackerId: string;
  userId: string;
  name: string;
  linkedAccountId: string;
  linkedGoalId: string | null;
  monthlyTarget: number | null;
  overallTarget: number | null;
  isActive: boolean;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  currentBalance?: number;
  goalProgress?: number;
  // Enriched data
  account?: WebAppAccount | null;
  goal?: WebAppGoal | null;
}

export interface WebAppCreateLoanTrackerPayload {
  name: string;
  linkedAccountId?: string | null;
  totalAmount: number;
  emiAmount: number;
  interestRate: number;
  tenureMonths: number;
  startDate: string;
}

export interface WebAppUpdateLoanTrackerPayload {
  name?: string;
  linkedAccountId?: string | null;
  emiAmount?: number;
  isActive?: boolean;
}

export interface WebAppCreateSavingsTrackerPayload {
  name: string;
  linkedAccountId: string;
  linkedGoalId?: string | null;
  monthlyTarget?: number | null;
  overallTarget?: number | null;
}

export interface WebAppUpdateSavingsTrackerPayload {
  name?: string;
  linkedGoalId?: string | null;
  monthlyTarget?: number | null;
  overallTarget?: number | null;
  isActive?: boolean;
}

export interface WebAppRecordEMIPaymentPayload {
  amount: number;
  paymentDate: string;
  transactionId?: string | null;
} 