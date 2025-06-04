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
  includeInBudget?: boolean; // Optional: Whether this category should be included in budget calculations (defaults to true)
  createdAt: Timestamp | Date | string;
  updatedAt: Timestamp | Date | string;
  isSystemCategory?: boolean; // Flag for predefined categories (e.g., "Uncategorized")
}

/**
 * Represents a user-defined budget for a specific category over a period.
 */
export interface Budget {
  id: string; // Firestore document ID
  userId: string; // ID of the user who owns this budget
  name: string; // e.g., "Monthly Groceries", "Fun Money Q3"
  categoryId: string; // Foreign key linking to Category.id
  amount: number; // The budgeted amount (positive number)
  spentAmount: number; // Amount spent against this budget so far (calculated)
  period: 'monthly' | 'quarterly' | 'yearly' | 'custom'; // Budgeting period
  startDate: Timestamp | Date | string; // Start date of the budget period
  endDate: Timestamp | Date | string; // End date of the budget period
  isRecurring: boolean; // Does this budget automatically renew?
  // If recurring, additional fields might be needed like recurrenceRule (e.g., "every 1st of month")
  // For MVP, simple non-auto-renewing or simple monthly renewal might be sufficient.
  notes?: string | null;
  createdAt: Timestamp | Date | string;
  updatedAt: Timestamp | Date | string;
}

// --- Payloads for API requests ---

export interface CreateCategoryPayload {
  userId: string; // Should be derived from authenticated user on the backend
  name: string;
  type: 'income' | 'expense';
  icon?: string | null;
  color?: string | null;
  includeInBudget?: boolean; // Optional: Whether to include in budget calculations
}

export interface UpdateCategoryPayload {
  name?: string;
  type?: 'income' | 'expense';
  icon?: string | null;
  color?: string | null;
  includeInBudget?: boolean; // Optional: Whether to include in budget calculations
}

export interface CreateBudgetPayload {
  userId: string; // Should be derived from authenticated user
  name: string;
  categoryId: string;
  amount: number;
  period: 'monthly' | 'quarterly' | 'yearly' | 'custom';
  startDate: string; // Expect ISO date string from client
  endDate: string;   // Expect ISO date string from client
  isRecurring: boolean;
  notes?: string | null;
}

export interface UpdateBudgetPayload {
  name?: string;
  categoryId?: string;
  amount?: number;
  period?: 'monthly' | 'quarterly' | 'yearly' | 'custom';
  startDate?: string; // Expect ISO date string
  endDate?: string;   // Expect ISO date string
  isRecurring?: boolean;
  notes?: string | null;
  // spentAmount should not be directly updatable by user, it's calculated
}

// --- Data Transfer Objects (DTOs) for API responses (if different from models) ---
// For now, we can assume API responses will use the Category and Budget interfaces directly,
// with Timestamps converted to ISO strings by a helper function before sending.

// Example of a DTO if conversion is needed before sending to client
export interface CategoryDTO extends Omit<Category, 'createdAt' | 'updatedAt'> {
  createdAt: string;
  updatedAt: string;
  includeInBudget?: boolean; // Explicitly include this in the DTO for clarity
}

export interface BudgetDTO extends Omit<Budget, 'createdAt' | 'updatedAt' | 'startDate' | 'endDate'> {
  createdAt: string;
  updatedAt: string;
  startDate: string;
  endDate: string;
}