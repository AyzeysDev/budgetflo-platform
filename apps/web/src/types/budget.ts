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
  isSystemCategory: boolean; // Changed from optional to non-optional
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

// Corresponds to BudgetDTO from the backend
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
  isRecurring: boolean;
  isOverall: boolean; // True if this is an overall budget
  notes: string | null;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  category?: WebAppCategory; // Optional: populated on the client for display
  source?: 'explicit' | 'recurring'; // NEW: To know if the budget is from a template
}

// Payload for creating a new budget (overall or category-specific) via BFF
export interface WebAppCreateBudgetPayload {
  name: string;
  categoryId?: string | null;
  amount: number;
  period: 'monthly' | 'yearly' | 'custom';
  startDate: string; // ISO date string
  endDate: string;   // ISO date string
  isRecurring: boolean;
  isOverall?: boolean;
  notes?: string | null;
}

// Payload for updating an existing budget via BFF
export interface WebAppUpdateBudgetPayload {
  name?: string;
  categoryId?: string | null;
  amount?: number;
  period?: 'monthly' | 'yearly' | 'custom';
  startDate?: string;
  endDate?: string;
  isRecurring?: boolean;
  isOverall?: boolean;
  notes?: string | null;
}

// Payload for setting/updating the overall budget via BFF
export interface WebAppSetOverallBudgetPayload {
    amount: number;
    period: 'monthly' | 'yearly'; // Overall budgets are typically monthly or yearly
    year: number;
    month?: number; // 1-12, required if period is 'monthly'
    notes?: string | null;
    isRecurring: boolean; // NEW: Added to payload
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
