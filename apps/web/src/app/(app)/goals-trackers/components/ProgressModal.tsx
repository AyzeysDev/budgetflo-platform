'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Target, TrendingUp, DollarSign, Clock, Percent } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import type { WebAppGoal } from '@/types/goal';
import type { WebAppLoanTracker, WebAppSavingsTracker } from '@/types/tracker';

type ProgressItem = WebAppGoal | WebAppLoanTracker | WebAppSavingsTracker;

interface ProgressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ProgressItem | null;
  type: 'goal' | 'loan' | 'savings';
}

export default function ProgressModal({
  open,
  onOpenChange,
  item,
  type,
}: ProgressModalProps) {
  if (!item) return null;

  const renderGoalProgress = (goal: WebAppGoal) => {
    const progress = (goal.currentAmount / goal.targetAmount) * 100;
    const daysRemaining = differenceInDays(new Date(goal.targetDate), new Date());
    const isOverdue = daysRemaining < 0;
    
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4" />
                Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Current: ${goal.currentAmount.toLocaleString()}</span>
                  <span>Target: ${goal.targetAmount.toLocaleString()}</span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">
                  {progress.toFixed(1)}% Complete
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm">
                  Target Date: {format(new Date(goal.targetDate), 'MMM dd, yyyy')}
                </p>
                <Badge variant={isOverdue ? 'destructive' : daysRemaining < 30 ? 'secondary' : 'default'}>
                  {isOverdue ? `${Math.abs(daysRemaining)} days overdue` : `${daysRemaining} days remaining`}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Financial Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  ${goal.currentAmount.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Current Amount</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  ${(goal.targetAmount - goal.currentAmount).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Remaining</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  ${goal.targetAmount.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Target Amount</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {goal.description && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{goal.description}</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderLoanProgress = (loan: WebAppLoanTracker) => {
    const progress = (loan.paidInstallments / (loan.tenureMonths || 1)) * 100;
    const remainingMonths = (loan.tenureMonths || 0) - loan.paidInstallments;
    
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Repayment Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Paid: {loan.paidInstallments}</span>
                  <span>Total: {loan.tenureMonths}</span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">
                  {progress.toFixed(1)}% Complete
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm">
                  Next Due: {format(new Date(loan.nextDueDate), 'MMM dd, yyyy')}
                </p>
                <Badge variant={remainingMonths <= 6 ? 'secondary' : 'default'}>
                  {remainingMonths} months remaining
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Loan Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-red-600">
                  ${loan.remainingBalance.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Remaining Balance</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  ${loan.emiAmount.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Monthly EMI</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {loan.interestRate}%
                </p>
                <p className="text-xs text-muted-foreground">Interest Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Original Loan</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">${loan.totalAmount.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">
                Started: {format(new Date(loan.startDate), 'MMM dd, yyyy')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total Interest</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">
                ${((loan.emiAmount * loan.tenureMonths) - loan.totalAmount).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Over loan term</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const renderSavingsProgress = (savings: WebAppSavingsTracker) => {
    const currentBalance = savings.currentBalance || 0;
    const monthlyTarget = savings.monthlyTarget || 0;
    const goalProgress = savings.goalProgress || 0;
    
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Current Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">
                ${currentBalance.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Available in account</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4" />
                Monthly Target
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                ${monthlyTarget.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Target savings per month</p>
            </CardContent>
          </Card>
        </div>

        {savings.goal && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Linked Goal Progress
              </CardTitle>
              <CardDescription>
                Progress towards &quot;{savings.goal.name}&quot;
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Current: ${savings.goal.currentAmount.toLocaleString()}</span>
                  <span>Target: ${savings.goal.targetAmount.toLocaleString()}</span>
                </div>
                <Progress value={goalProgress} className="h-2" />
                <p className="text-xs text-muted-foreground text-center">
                  {goalProgress.toFixed(1)}% Complete
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Account Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {savings.account && (
                <p className="text-sm">
                  <span className="font-medium">Account:</span> {savings.account.name}
                </p>
              )}
              <p className="text-sm">
                <span className="font-medium">Created:</span> {format(new Date(savings.createdAt), 'MMM dd, yyyy')}
              </p>
              <Badge variant={savings.isActive ? 'default' : 'secondary'}>
                {savings.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const getTitle = () => {
    switch (type) {
      case 'goal':
        return `Goal Progress: ${item.name}`;
      case 'loan':
        return `Loan Progress: ${item.name}`;
      case 'savings':
        return `Savings Progress: ${item.name}`;
      default:
        return 'Progress Details';
    }
  };

  const renderContent = () => {
    switch (type) {
      case 'goal':
        return renderGoalProgress(item as WebAppGoal);
      case 'loan':
        return renderLoanProgress(item as WebAppLoanTracker);
      case 'savings':
        return renderSavingsProgress(item as WebAppSavingsTracker);
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>
        
        {renderContent()}

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 