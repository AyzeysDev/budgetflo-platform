import { Timestamp } from 'firebase-admin/firestore';

// Loan Tracker interface for Firestore
export interface LoanTracker {
  trackerId: string;
  userId: string;
  name: string;
  linkedAccountId: string | null;
  totalAmount: number;
  emiAmount: number;
  interestRate: number; // Percentage
  tenureMonths: number;
  startDate: Timestamp;
  nextDueDate: Timestamp;
  paidInstallments: number;
  remainingBalance: number;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Savings Tracker interface for Firestore
export interface SavingsTracker {
  trackerId: string;
  userId: string;
  name: string;
  linkedAccountId: string;
  currentBalance: number;
  monthlyTarget: number | null;
  overallTarget: number | null;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// DTOs for API responses
export interface LoanTrackerDTO extends Omit<LoanTracker, 'startDate' | 'nextDueDate' | 'createdAt' | 'updatedAt'> {
  startDate: string;
  nextDueDate: string;
  createdAt: string;
  updatedAt: string;
  completionPercentage?: number;
  monthsRemaining?: number;
  totalInterest?: number;
}

export interface SavingsTrackerDTO extends Omit<SavingsTracker, 'createdAt' | 'updatedAt'> {
  currentBalance: number;
  createdAt: string;
  updatedAt: string;
}

// Payloads for API requests
export interface CreateLoanTrackerPayload {
  name: string;
  linkedAccountId: string;
  totalAmount: number;
  emiAmount: number;
  interestRate: number;
  tenureMonths: number;
  startDate: string;
}

export interface UpdateLoanTrackerPayload {
  name?: string;
  linkedAccountId?: string | null;
  emiAmount?: number;
  isActive?: boolean;
  startDate?: string;
  nextDueDate?: string;
}

export interface CreateSavingsTrackerPayload {
  name: string;
  linkedAccountId: string;
  monthlyTarget?: number | null;
  overallTarget?: number | null;
}

export interface UpdateSavingsTrackerPayload {
  name?: string;
  linkedAccountId?: string;
  monthlyTarget?: number | null;
  overallTarget?: number | null;
  isActive?: boolean;
}

export interface RecordEMIPaymentPayload {
  amount: number;
  paymentDate: string;
  transactionId?: string | null;
} 