import { Timestamp } from 'firebase-admin/firestore';

// Base Goal interface for Firestore
export interface Goal {
  goalId: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: Timestamp;
  description: string | null;
  categoryId: string | null;
  linkedAccountId: string | null;
  isSyncedWithAccount: boolean;
  status: 'in_progress' | 'completed';
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Goal Contribution interface
export interface GoalContribution {
  contributionId: string;
  goalId: string;
  userId: string;
  amount: number;
  date: Timestamp;
  source: 'manual' | 'transaction';
  transactionId: string | null;
  notes: string | null;
  createdAt: Timestamp;
}

// DTOs for API responses
export interface GoalDTO extends Omit<Goal, 'targetDate' | 'createdAt' | 'updatedAt'> {
  targetDate: string;
  createdAt: string;
  updatedAt: string;
  progressPercentage?: number;
  daysRemaining?: number;
}

export interface GoalContributionDTO extends Omit<GoalContribution, 'date' | 'createdAt'> {
  date: string;
  createdAt: string;
}

// Payloads for API requests
export interface CreateGoalPayload {
  name: string;
  targetAmount: number;
  targetDate: string;
  description?: string | null;
  categoryId?: string | null;
  linkedAccountId?: string | null;
  isSyncedWithAccount?: boolean;
}

export interface UpdateGoalPayload {
  name?: string;
  targetAmount?: number;
  currentAmount?: number;
  targetDate?: string;
  description?: string | null;
  categoryId?: string | null;
  linkedAccountId?: string | null;
  isSyncedWithAccount?: boolean;
  isActive?: boolean;
}

export interface CreateGoalContributionPayload {
  amount: number;
  date?: string;
  notes?: string | null;
  transactionId?: string | null;
} 