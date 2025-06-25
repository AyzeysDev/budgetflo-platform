import type { WebAppCategory } from './budget';
import type { WebAppAccount } from './account';

export interface WebAppGoal {
  goalId: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string; // ISO date string
  description: string | null;
  categoryId: string | null;
  linkedAccountId: string | null;
  isSyncedWithAccount: boolean;
  status: 'in_progress' | 'completed';
  isActive: boolean;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  progressPercentage?: number;
  daysRemaining?: number;
  // Enriched data
  category?: WebAppCategory | null;
  account?: WebAppAccount | null;
}

export interface WebAppGoalContribution {
  contributionId: string;
  goalId: string;
  userId: string;
  amount: number;
  date: string; // ISO date string
  source: 'manual' | 'transaction';
  transactionId: string | null;
  notes: string | null;
  createdAt: string; // ISO date string
}

export interface WebAppCreateGoalPayload {
  name: string;
  targetAmount: number;
  targetDate: string;
  description?: string | null;
  categoryId?: string | null;
  linkedAccountId?: string | null;
  isSyncedWithAccount?: boolean;
}

export interface WebAppUpdateGoalPayload {
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

export interface WebAppCreateGoalContributionPayload {
  amount: number;
  date?: string;
  notes?: string | null;
  transactionId?: string | null;
} 