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
  isRecurring: boolean; // Does this budget automatically renew?
  isOverall?: boolean; // True if this is an overall budget for the period, false/undefined for category-specific.
  notes?: string | null;
  createdAt: Timestamp | Date | string;
  updatedAt: Timestamp | Date | string;
}

// --- Payloads for API requests ---

export interface CreateCategoryPayload {
  // userId is derived from authenticated user on the backend, not part of client payload directly to service
  name: string;
  type: 'income' | 'expense';
  icon?: string | null;
  color?: string | null;
  includeInBudget?: boolean; // Optional in payload
}

export interface UpdateCategoryPayload {
  name?: string;
  type?: 'income' | 'expense';
  icon?: string | null;
  color?: string | null;
  includeInBudget?: boolean; // Optional in payload
}

export interface CreateBudgetPayload {
  // userId is derived from authenticated user
  name: string;
  categoryId?: string | null; // Optional for overall budget
  amount: number;
  period: 'monthly' | 'yearly' | 'custom';
  startDate: string; // Expect ISO date string from client
  endDate: string;   // Expect ISO date string from client
  isRecurring: boolean;
  isOverall?: boolean;
  notes?: string | null;
}

export interface UpdateBudgetPayload {
  name?: string;
  categoryId?: string | null; // Optional for overall budget
  amount?: number;
  period?: 'monthly' | 'yearly' | 'custom';
  startDate?: string; // Expect ISO date string
  endDate?: string;   // Expect ISO date string
  isRecurring?: boolean;
  isOverall?: boolean; // Allow updating this if necessary, though typically set on creation
  notes?: string | null;
  // spentAmount should not be directly updatable by user, it's calculated
}

// --- Data Transfer Objects (DTOs) for API responses ---

/**
 * Data Transfer Object for a Category.
 * Timestamps are converted to ISO strings.
 * Optional fields from Category (icon, color, isSystemCategory) are defined with their expected DTO types.
 * includeInBudget is non-optional in DTO, defaulted by service layer if undefined in model.
 */
export interface CategoryDTO {
  id: string;
  userId: string; // Explicitly included for clarity
  name: string;
  type: 'income' | 'expense';
  icon: string | null;
  color: string | null;
  includeInBudget: boolean; // Non-optional in DTO, service defaults if Category.includeInBudget is undefined
  isSystemCategory: boolean; // Non-optional in DTO (defaults to false if undefined in source)
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

export interface BudgetDTO extends Omit<Budget, 'createdAt' | 'updatedAt' | 'startDate' | 'endDate'> {
  createdAt: string;
  updatedAt: string;
  startDate: string;
  endDate: string;
  isOverall: boolean; // Ensure this is always present in DTO, defaulting to false
  categoryId: string | null; // Ensure categoryId can be null in DTO
}
