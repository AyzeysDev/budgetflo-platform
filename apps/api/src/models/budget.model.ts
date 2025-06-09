// apps/api/src/models/budget.model.ts
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Represents a financial category that users can assign to budgets and transactions.
 * Categories are user-specific.
 */
export interface Category {
  id: string; // Firestore document ID
  userId: string; // ID of the user who owns this category
  name: string; // e.g., "Groceries", "Salary", "Entertainment"
  type: 'income' | 'expense'; // Type of category
  icon?: string | null; // Optional: Name or identifier for an icon (e.g., from Lucide icons)
  color?: string | null; // Optional: Hex color code for UI representation
  includeInBudget?: boolean; // Optional: Whether this category should be included in budget calculations (defaults to true if not set by service layer)
  createdAt: Timestamp | Date | string;
  updatedAt: Timestamp | Date | string;
  isSystemCategory?: boolean; // Flag for predefined categories (e.g., "Uncategorized")
}

/**
 * Represents a user-defined budget for a specific category or an overall budget over a period.
 * The 'isRecurring' field has been removed. Budgets are now always explicit for their period.
 */
export interface Budget {
  id: string; // Firestore document ID
  userId: string; // ID of the user who owns this budget
  name: string; // e.g., "Monthly Groceries", "Overall Monthly Budget"
  categoryId?: string | null; // Foreign key linking to Category.id, null if it's an overall budget not tied to a specific category
  amount: number; // The budgeted amount (positive number)
  spentAmount: number; // Amount spent against this budget so far (calculated)
  period: 'monthly' | 'yearly' | 'custom'; // Budgeting period
  startDate: Timestamp | Date | string; // Start date of the budget period
  endDate: Timestamp | Date | string; // End date of the budget period
  isOverall?: boolean; // True if this is an overall budget for the period, false/undefined for category-specific.
  notes?: string | null;
  createdAt: Timestamp | Date | string;
  updatedAt: Timestamp | Date | string;
}

// --- Payloads for API requests ---

export interface CreateCategoryPayload {
  name: string;
  type: 'income' | 'expense';
  icon?: string | null;
  color?: string | null;
  includeInBudget?: boolean;
}

export interface UpdateCategoryPayload {
  name?: string;
  type?: 'income' | 'expense';
  icon?: string | null;
  color?: string | null;
  includeInBudget?: boolean;
}

export interface CreateBudgetPayload {
  name: string;
  categoryId?: string | null;
  amount: number;
  period: 'monthly' | 'yearly' | 'custom';
  startDate: string; // Expect ISO date string from client
  endDate: string;   // Expect ISO date string
  isOverall?: boolean;
  notes?: string | null;
}

export interface UpdateBudgetPayload {
  name?: string;
  categoryId?: string | null;
  amount?: number;
  period?: 'monthly' | 'yearly' | 'custom';
  startDate?: string;
  endDate?: string;
  isOverall?: boolean;
  notes?: string | null;
}

// --- Data Transfer Objects (DTOs) for API responses ---

export interface CategoryDTO {
  id: string;
  userId: string;
  name: string;
  type: 'income' | 'expense';
  icon: string | null;
  color: string | null;
  includeInBudget: boolean;
  isSystemCategory: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetDTO extends Omit<Budget, 'createdAt' | 'updatedAt' | 'startDate' | 'endDate'> {
  createdAt: string;
  updatedAt: string;
  startDate: string;
  endDate: string;
  isOverall: boolean;
  categoryId: string | null;
}
