'use client';

import React from 'react';
import type { WebAppGoal } from '@/types/goal';
import type { WebAppLoanTracker, WebAppSavingsTracker } from '@/types/tracker';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { HandCoins, Landmark, PiggyBank, Calendar, Percent, Target, Goal as GoalIcon } from 'lucide-react';

interface ProgressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tracker: WebAppLoanTracker | WebAppSavingsTracker | WebAppGoal | null;
}

const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || typeof value === 'undefined') return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const DetailRow = ({ icon, label, value }: { icon: React.ElementType, label: string, value: string | number }) => (
  <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-b-0">
    <div className="flex items-center gap-3">
      {React.createElement(icon, { className: "h-5 w-5 text-muted-foreground" })}
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
    </div>
    <span className="text-sm font-semibold">{value}</span>
  </div>
);

export default function ProgressModal({ open, onOpenChange, tracker }: ProgressModalProps) {
  if (!tracker) return null;

  const isLoan = (t: WebAppLoanTracker | WebAppSavingsTracker | WebAppGoal): t is WebAppLoanTracker => 'emiAmount' in t;
  const isSavings = (t: WebAppLoanTracker | WebAppSavingsTracker | WebAppGoal): t is WebAppSavingsTracker => 'currentBalance' in t && !('targetAmount' in t);
  const isGoal = (t: WebAppLoanTracker | WebAppSavingsTracker | WebAppGoal): t is WebAppGoal => 'targetAmount' in t;

  const renderContent = () => {
    if (isLoan(tracker)) {
      const completionPercentage = tracker.completionPercentage ?? 0;
      return (
        <div>
          <DialogTitle className="flex items-center gap-3 mb-2">
            <Landmark className="h-6 w-6 text-primary" /> {tracker.name}
          </DialogTitle>
          <DialogDescription className="mb-6">Detailed progress of your loan repayment.</DialogDescription>
          <div className="space-y-4">
            <Progress value={completionPercentage} className="h-3" />
            <div className="text-center font-bold text-lg text-primary">{completionPercentage.toFixed(2)}% Complete</div>
          </div>
          <div className="mt-6 space-y-2">
            <DetailRow icon={Target} label="Total Loan Amount" value={formatCurrency(tracker.totalAmount)} />
            <DetailRow icon={HandCoins} label="EMI Amount" value={formatCurrency(tracker.emiAmount)} />
            <DetailRow icon={Percent} label="Interest Rate" value={`${tracker.interestRate}%`} />
            <DetailRow icon={Calendar} label="Months Remaining" value={tracker.monthsRemaining ?? 0} />
            <DetailRow icon={Calendar} label="Next Due Date" value={formatDate(tracker.nextDueDate)} />
          </div>
        </div>
      );
    }
    
    if (isSavings(tracker)) {
      const progress = tracker.overallTarget ? ((tracker.currentBalance ?? 0) / tracker.overallTarget) * 100 : 0;
      return (
        <div>
          <DialogTitle className="flex items-center gap-3 mb-2">
            <PiggyBank className="h-6 w-6 text-primary" /> {tracker.name}
          </DialogTitle>
          <DialogDescription className="mb-6">Detailed progress of your savings tracker.</DialogDescription>
           <div className="space-y-4">
            <Progress value={progress} className="h-3" />
            <div className="text-center font-bold text-lg text-primary">{progress.toFixed(2)}% Complete</div>
          </div>
          <div className="mt-6 space-y-2">
            <DetailRow icon={Target} label="Savings Target" value={formatCurrency(tracker.overallTarget)} />
            <DetailRow icon={HandCoins} label="Currently Saved" value={formatCurrency(tracker.currentBalance)} />
          </div>
        </div>
      );
    }
    
    if (isGoal(tracker)) {
       const progress = tracker.targetAmount ? (tracker.currentAmount / tracker.targetAmount) * 100 : 0;
      return (
         <div>
          <DialogTitle className="flex items-center gap-3 mb-2">
            <GoalIcon className="h-6 w-6 text-primary" /> {tracker.name}
          </DialogTitle>
          <DialogDescription className="mb-6">Detailed progress of your financial goal.</DialogDescription>
           <div className="space-y-4">
            <Progress value={progress} className="h-3" />
            <div className="text-center font-bold text-lg text-primary">{progress.toFixed(2)}% Complete</div>
          </div>
          <div className="mt-6 space-y-2">
            <DetailRow icon={Target} label="Target Amount" value={formatCurrency(tracker.targetAmount)} />
            <DetailRow icon={HandCoins} label="Current Amount" value={formatCurrency(tracker.currentAmount)} />
             <DetailRow icon={Calendar} label="Target Date" value={formatDate(tracker.targetDate)} />
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          {renderContent()}
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
} 