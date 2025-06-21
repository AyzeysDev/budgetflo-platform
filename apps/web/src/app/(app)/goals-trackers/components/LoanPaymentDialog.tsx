'use client';

import React from 'react';
import type { WebAppLoanTracker } from '@/types/tracker';
import type { WebAppAccount } from '@/types/account';
import type { WebAppCategory } from '@/types/budget';
import TransactionForm from '../../transactions/TransactionForm';
import { WebAppCreateTransactionPayload } from '@/types/transaction';

interface LoanPaymentDialogProps {
  tracker: WebAppLoanTracker | null;
  accounts: WebAppAccount[];
  categories: WebAppCategory[];
  isOpen: boolean;
  onClose: () => void;
  onPaymentSaved: () => void;
}

export default function LoanPaymentDialog({
  tracker,
  accounts,
  categories,
  isOpen,
  onClose,
  onPaymentSaved,
}: LoanPaymentDialogProps) {

  if (!isOpen || !tracker) {
    return null;
  }

  // Find a suitable default category, e.g., "Loans" or "Debt"
  const defaultCategory = categories.find(c => c.name.toLowerCase().includes('loan') || c.name.toLowerCase().includes('debt'));
  
  const prefillData: Partial<WebAppCreateTransactionPayload> = {
    type: 'expense', // A loan payment is an expense
    amount: tracker.emiAmount,
    notes: `Payment for loan: "${tracker.name}"`,
    linkedLoanTrackerId: tracker.trackerId,
    // A default category is helpful for user experience
    categoryId: defaultCategory?.id,
    // Default to the linked account if available
    accountId: tracker.linkedAccountId || undefined,
  };

  const handleFormSubmitSuccess = () => {
    // The comprehensive re-validation is now handled inside TransactionForm
    onPaymentSaved();
  };

  return (
    <TransactionForm
      isOpen={isOpen}
      onOpenChange={(open) => !open && onClose()}
      accounts={accounts}
      categories={categories}
      onFormSubmitSuccess={handleFormSubmitSuccess}
      prefillData={prefillData}
    />
  );
} 