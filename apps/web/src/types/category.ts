export interface WebAppCategory {
  id: string;
  name: string;
  type: 'income' | 'expense';
  userId: string;
  isDeleted?: boolean;
} 