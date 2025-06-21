'use client';

import React, { useState } from 'react';
import type { WebAppGoal } from '@/types/goal';
import type { WebAppAccount } from '@/types/account';
import type { WebAppCategory } from '@/types/budget';
import TransactionForm from '../../transactions/TransactionForm';
import { WebAppCreateTransactionPayload } from '@/types/transaction';

interface GoalContributionDialogProps {
  goal: WebAppGoal | null;
  accounts: WebAppAccount[];
  categories: WebAppCategory[];
  isOpen: boolean;
  onClose: () => void;
  onContributionSaved: () => void;
}

export default function GoalContributionDialog({
  goal,
  accounts,
  categories,
  isOpen,
  onClose,
  onContributionSaved,
}: GoalContributionDialogProps) {
  
  if (!isOpen || !goal) {
    return null;
  }

  // Find a suitable default category, e.g., "Savings" or "Goals"
  // This is a placeholder; a more robust solution might involve a dedicated setting
  const defaultCategory = categories.find(c => c.name.toLowerCase().includes('saving') || c.name.toLowerCase().includes('goal'));
  
  const prefillData: Partial<WebAppCreateTransactionPayload> = {
    type: 'expense', // A contribution is an expense from a funding account
    notes: `Contribution to goal: "${goal.name}"`,
    linkedGoalId: goal.goalId,
    // A default category is helpful for user experience
    categoryId: defaultCategory?.id,
  };

  const handleFormSubmitSuccess = () => {
    // The comprehensive re-validation is now handled inside TransactionForm
    onContributionSaved();
  };

  return (
    <TransactionForm
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      accounts={accounts}
      categories={categories}
      onFormSubmitSuccess={handleFormSubmitSuccess}
      prefillData={prefillData}
      // Pass the goal-specific transaction if you ever need to edit contributions directly
      // transactionToEdit={null} 
    />
  );
} 