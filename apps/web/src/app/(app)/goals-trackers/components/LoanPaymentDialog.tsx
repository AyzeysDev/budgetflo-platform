'use client';

import React from 'react';
import type { WebAppLoanTracker } from '@/types/tracker';
import type { WebAppAccount } from '@/types/account';
import type { WebAppCategory } from '@/types/budget';
import TransactionForm from '../../transactions/TransactionForm';
import { WebAppCreateTransactionPayload } from '@/types/transaction';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

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

  // Check if the tracker is linked to an account (auto-synced)
  const isAccountSynced = !!tracker.linkedAccountId;

  // If account is synced, show a message instead of the payment form
  if (isAccountSynced) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Payment Recording Not Available
            </DialogTitle>
            <DialogDescription>
              This loan tracker is linked to an account and automatically syncs with your account balance. 
              Manual payment recording is not available for synced trackers.
            </DialogDescription>
            <div className="pt-2">
              <div className="p-3 bg-muted/50 rounded-lg border border-border">
                <div className="text-sm font-medium mb-1">
                  How to record payments:
                </div>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Go to Transactions and create a payment transaction</li>
                  <li>• Select the linked account as the source</li>
                  <li>• The loan progress will update automatically</li>
                </ul>
              </div>
            </div>
          </DialogHeader>
          <div className="flex justify-end pt-4">
            <Button onClick={onClose}>
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // If not synced, show the transaction form for manual payment recording
  const defaultCategory = categories.find(c => c.name.toLowerCase().includes('loan') || c.name.toLowerCase().includes('debt'));
  
  const prefillData: Partial<WebAppCreateTransactionPayload> = {
    type: 'expense', // A loan payment is an expense
    amount: tracker.emiAmount,
    notes: `Payment for loan: "${tracker.name}"`,
    linkedLoanTrackerId: tracker.trackerId,
    // A default category is helpful for user experience
    categoryId: defaultCategory?.id,
    // Don't default to linked account since it's not synced
    accountId: undefined,
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