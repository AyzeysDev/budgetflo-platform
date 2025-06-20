// apps/web/src/types/budget.ts

// Corresponds to CategoryDTO from the backend
export interface WebAppCategory {
  id: string;
  userId: string;
  name: string;
  type: 'income' | 'expense';
  icon: string | null;
  color: string | null;
  includeInBudget: boolean;
  isSystemCategory: boolean;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

// Corresponds to BudgetDTO from the backend.
// 'isRecurring' and 'source' fields have been removed.
// The optional `category` property is removed from the base type
// to avoid conflicts with more specific extended types.
export interface WebAppBudget {
  id: string;
  userId: string;
  name: string;
  categoryId: string | null; // Null for overall budgets
  amount: number;
  spentAmount: number;
  period: 'monthly' | 'yearly' | 'custom';
  startDate: string; // ISO date string
  endDate: string;   // ISO date string
  isOverall: boolean; // True if this is an overall budget
  notes: string | null;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

// Payload for creating a new budget (overall or category-specific) via BFF
// 'isRecurring' has been removed.
export interface WebAppCreateBudgetPayload {
  name: string;
  categoryId?: string | null;
  amount: number;
  period: 'monthly' | 'yearly' | 'custom';
  startDate: string; // ISO date string
  endDate: string;   // ISO date string
  isOverall?: boolean;
  notes?: string | null;
}

// Payload for updating an existing budget via BFF
// 'isRecurring' has been removed.
export interface WebAppUpdateBudgetPayload {
  name?: string;
  categoryId?: string | null;
  amount?: number;
  period?: 'monthly' | 'yearly' | 'custom';
  startDate?: string;
  endDate?: string;
  isOverall?: boolean;
  notes?: string | null;
}

// Payload for setting/updating the overall budget via BFF
// 'isRecurring' has been removed.
export interface WebAppSetOverallBudgetPayload {
    amount: number;
    period: 'monthly' | 'yearly'; // Overall budgets are typically monthly or yearly
    year: number;
    month?: number; // 1-12, required if period is 'monthly'
    notes?: string | null;
}

// Represents a budget item for display, especially for category budgets
// May include category details and calculated progress.
export interface BudgetDisplayItem extends WebAppBudget {
  categoryName?: string;
  categoryIcon?: string | null;
  categoryColor?: string | null;
  progress?: number; // Percentage of budget spent
  remainingAmount?: number;
}
