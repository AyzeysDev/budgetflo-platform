'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Target, Landmark, PiggyBank } from 'lucide-react';
import type { WebAppGoal } from '@/types/goal';
import type { WebAppLoanTracker, WebAppSavingsTracker } from '@/types/tracker';
import type { WebAppAccount } from '@/types/account';
import type { WebAppCategory } from '@/types/budget';
import GoalsList from './components/GoalsList';
import LoanTrackersList from './components/LoanTrackersList';
import SavingsTrackersList from './components/SavingsTrackersList';
import GoalForm from './components/GoalForm';
import LoanTrackerForm from './components/LoanTrackerForm';
import SavingsTrackerForm from './components/SavingsTrackerForm';

interface GoalsTrackersClientPageProps {
  initialGoals: WebAppGoal[];
  initialLoanTrackers: WebAppLoanTracker[];
  initialSavingsTrackers: WebAppSavingsTracker[];
  accounts: WebAppAccount[] | null;
  categories: WebAppCategory[] | null;
}

export default function GoalsTrackersClientPage({
  initialGoals,
  initialLoanTrackers,
  initialSavingsTrackers,
  accounts,
  categories,
}: GoalsTrackersClientPageProps) {
  const [goals, setGoals] = useState<WebAppGoal[]>(initialGoals);
  const [loanTrackers, setLoanTrackers] = useState<WebAppLoanTracker[]>(initialLoanTrackers);
  const [savingsTrackers, setSavingsTrackers] = useState<WebAppSavingsTracker[]>(initialSavingsTrackers);
  
  const [isGoalFormOpen, setIsGoalFormOpen] = useState(false);
  const [isLoanFormOpen, setIsLoanFormOpen] = useState(false);
  const [isSavingsFormOpen, setIsSavingsFormOpen] = useState(false);
  
  const [editingGoal, setEditingGoal] = useState<WebAppGoal | null>(null);
  const [editingLoanTracker, setEditingLoanTracker] = useState<WebAppLoanTracker | null>(null);
  const [editingSavingsTracker, setEditingSavingsTracker] = useState<WebAppSavingsTracker | null>(null);

  // Debug accounts data
  React.useEffect(() => {
    console.log('GoalsTrackersClientPage - Accounts received:', accounts);
    console.log('GoalsTrackersClientPage - Accounts length:', accounts?.length || 0);
    console.log('GoalsTrackersClientPage - Sample account:', accounts?.[0]);
  }, [accounts]);

  const getAccountsArray = (): WebAppAccount[] => {
    const result = accounts ? (Array.isArray(accounts) ? accounts : []) : [];
    console.log('GoalsTrackersClientPage - getAccountsArray result:', result);
    return result;
  };

  const getCategoriesArray = (): WebAppCategory[] => {
    return categories ? (Array.isArray(categories) ? categories : []) : [];
  };

  const handleGoalSaved = (goal: WebAppGoal) => {
    if (editingGoal) {
      setGoals(goals.map(g => g.goalId === goal.goalId ? goal : g));
    } else {
      setGoals([...goals, goal]);
    }
    setIsGoalFormOpen(false);
    setEditingGoal(null);
  };

  const handleGoalUpdated = (updatedGoal: WebAppGoal) => {
    setGoals(goals.map(g => g.goalId === updatedGoal.goalId ? updatedGoal : g));
  };

  const handleGoalDeleted = (goalId: string) => {
    setGoals(goals.filter(g => g.goalId !== goalId));
  };

  const handleLoanTrackerSaved = (tracker: WebAppLoanTracker) => {
    if (editingLoanTracker) {
      setLoanTrackers(loanTrackers.map(t => t.trackerId === tracker.trackerId ? tracker : t));
    } else {
      setLoanTrackers([...loanTrackers, tracker]);
    }
    setIsLoanFormOpen(false);
    setEditingLoanTracker(null);
  };

  const handleLoanTrackerDeleted = (trackerId: string) => {
    setLoanTrackers(loanTrackers.filter(t => t.trackerId !== trackerId));
  };

  const handleSavingsTrackerSaved = (tracker: WebAppSavingsTracker) => {
    if (editingSavingsTracker) {
      setSavingsTrackers(savingsTrackers.map(t => t.trackerId === tracker.trackerId ? tracker : t));
    } else {
      setSavingsTrackers([...savingsTrackers, tracker]);
    }
    setIsSavingsFormOpen(false);
    setEditingSavingsTracker(null);
  };

  const handleSavingsTrackerDeleted = (trackerId: string) => {
    setSavingsTrackers(savingsTrackers.filter(t => t.trackerId !== trackerId));
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Goals & Trackers</h1>
        <p className="text-muted-foreground">
          Set financial goals, track your progress, and manage loans and savings
        </p>
      </div>

      <Tabs defaultValue="goals" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="goals" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Goals
          </TabsTrigger>
          <TabsTrigger value="loans" className="flex items-center gap-2">
            <Landmark className="h-4 w-4" />
            Loans
          </TabsTrigger>
          <TabsTrigger value="savings" className="flex items-center gap-2">
            <PiggyBank className="h-4 w-4" />
            Savings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="goals" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Financial Goals</CardTitle>
                <CardDescription>
                  Track your progress towards financial milestones
                </CardDescription>
              </div>
              <Button onClick={() => {
                setEditingGoal(null);
                setIsGoalFormOpen(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                New Goal
              </Button>
            </CardHeader>
            <CardContent>
              <GoalsList
                goals={goals}
                onEdit={(goal) => {
                  setEditingGoal(goal);
                  setIsGoalFormOpen(true);
                }}
                onDelete={handleGoalDeleted}
                onUpdate={handleGoalUpdated}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loans" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Loan Trackers</CardTitle>
                <CardDescription>
                  Monitor your loan repayments and track EMIs
                </CardDescription>
              </div>
              <Button onClick={() => {
                setEditingLoanTracker(null);
                setIsLoanFormOpen(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                New Loan Tracker
              </Button>
            </CardHeader>
            <CardContent>
              <LoanTrackersList
                trackers={loanTrackers}
                accounts={getAccountsArray()}
                onEdit={(tracker) => {
                  setEditingLoanTracker(tracker);
                  setIsLoanFormOpen(true);
                }}
                onDelete={handleLoanTrackerDeleted}
                onUpdate={handleLoanTrackerSaved}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="savings" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Savings Trackers</CardTitle>
                <CardDescription>
                  Track your savings progress and link to goals
                </CardDescription>
              </div>
              <Button onClick={() => {
                setEditingSavingsTracker(null);
                setIsSavingsFormOpen(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                New Savings Tracker
              </Button>
            </CardHeader>
            <CardContent>
              <SavingsTrackersList
                trackers={savingsTrackers}
                accounts={getAccountsArray()}
                goals={goals}
                onEdit={(tracker) => {
                  setEditingSavingsTracker(tracker);
                  setIsSavingsFormOpen(true);
                }}
                onDelete={handleSavingsTrackerDeleted}
                onUpdate={handleSavingsTrackerSaved}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Forms */}
      <GoalForm
        open={isGoalFormOpen}
        onOpenChange={(open) => {
          setIsGoalFormOpen(open);
          if (!open) setEditingGoal(null);
        }}
        goal={editingGoal}
        categories={getCategoriesArray()}
        accounts={getAccountsArray()}
        onSave={handleGoalSaved}
      />

      <LoanTrackerForm
        open={isLoanFormOpen}
        onOpenChange={(open) => {
          setIsLoanFormOpen(open);
          if (!open) setEditingLoanTracker(null);
        }}
        tracker={editingLoanTracker}
        accounts={getAccountsArray()}
        onSave={handleLoanTrackerSaved}
      />

      <SavingsTrackerForm
        open={isSavingsFormOpen}
        onOpenChange={(open) => {
          setIsSavingsFormOpen(open);
          if (!open) setEditingSavingsTracker(null);
        }}
        tracker={editingSavingsTracker}
        accounts={getAccountsArray()}
        goals={goals.filter(g => g.status === 'in_progress')}
        onSave={handleSavingsTrackerSaved}
      />
    </div>
  );
} 