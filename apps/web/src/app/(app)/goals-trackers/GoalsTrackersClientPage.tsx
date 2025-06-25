'use client';

import React, { useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import useSWR, { KeyedMutator } from 'swr';
import { Plus, Goal as GoalIcon, HandCoins, Landmark, PiggyBank, AlertTriangle } from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

import type { WebAppGoal } from '@/types/goal';
import type { WebAppLoanTracker, WebAppSavingsTracker } from '@/types/tracker';
import type { WebAppCategory } from '@/types/budget';
import type { WebAppAccount } from '@/types/account';

import { getGoalColumns } from './components/goals/columns';
import GoalsDataTable from './components/goals/data-table';
import { getLoanColumns } from './components/loans/columns';
import LoansDataTable from './components/loans/data-table';
import { getSavingsColumns } from './components/savings/columns';
import SavingsDataTable from './components/savings/data-table';

import GoalForm from './components/GoalForm';
import LoanTrackerForm from './components/LoanTrackerForm';
import SavingsTrackerForm from './components/SavingsTrackerForm';
import GoalContributionDialog from './components/GoalContributionDialog';
import ProgressModal from './components/ProgressModal';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function GoalsTrackersClientPage() {
  const { data: session, status: sessionStatus } = useSession();
  const userId = session?.user?.id;

  const { data: goals = [], mutate: mutateGoals, isLoading: goalsLoading } = useSWR<WebAppGoal[]>(userId ? `/api/goals` : null, fetcher);
  const { data: loanTrackers = [], mutate: mutateLoanTrackers, isLoading: loanTrackersLoading } = useSWR<WebAppLoanTracker[]>(userId ? `/api/trackers/loans` : null, fetcher);
  const { data: savingsTrackers = [], mutate: mutateSavingsTrackers, isLoading: savingsTrackersLoading } = useSWR<WebAppSavingsTracker[]>(userId ? `/api/trackers/savings` : null, fetcher);
  const { data: categories = {} } = useSWR<Record<string, WebAppCategory[]>>(userId ? '/api/categories' : null, fetcher);
  const { data: accounts = {} } = useSWR<Record<string, WebAppAccount[]>>(userId ? '/api/accounts' : null, fetcher);

  // Consider loading if session is loading OR if we have userId but data is loading
  const isGoalsLoading = sessionStatus === 'loading' || (!!userId && goalsLoading);
  const isLoanTrackersLoading = sessionStatus === 'loading' || (!!userId && loanTrackersLoading);
  const isSavingsTrackersLoading = sessionStatus === 'loading' || (!!userId && savingsTrackersLoading);

  const [isGoalFormOpen, setIsGoalFormOpen] = useState(false);
  const [isLoanFormOpen, setIsLoanFormOpen] = useState(false);
  const [isSavingsFormOpen, setIsSavingsFormOpen] = useState(false);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);

  const [editingGoal, setEditingGoal] = useState<WebAppGoal | null>(null);
  const [editingLoanTracker, setEditingLoanTracker] = useState<WebAppLoanTracker | null>(null);
  const [editingSavingsTracker, setEditingSavingsTracker] = useState<WebAppSavingsTracker | null>(null);
  const [progressTracker, setProgressTracker] = useState<WebAppLoanTracker | WebAppSavingsTracker | WebAppGoal | null>(null);
  
  const [goalToContribute, setGoalToContribute] = useState<WebAppGoal | null>(null);

  const [goalToDelete, setGoalToDelete] = useState<string | null>(null);
  const [loanTrackerToDelete, setLoanTrackerToDelete] = useState<string | null>(null);
  const [savingsTrackerToDelete, setSavingsTrackerToDelete] = useState<string | null>(null);

  const getCategoriesArray = () => Object.values(categories).flat();
  const getAccountsArray = () => Object.values(accounts).flat();

  const accountsMap = useMemo(() => {
    const map = new Map<string, WebAppAccount>();
    getAccountsArray().forEach(acc => map.set(acc.accountId, acc));
    return map;
  }, [accounts]);
  
  const handleMutation = <T extends { goalId?: string; trackerId?: string }>(
    mutate: KeyedMutator<T[]>,
    item: T,
    idField: 'goalId' | 'trackerId'
  ) => {
    mutate((currentItems: T[] = []) => {
      const isEditing = currentItems.some(i => i[idField] === item[idField]);
      if (isEditing) {
        return currentItems.map(i => (i[idField] === item[idField] ? item : i));
      }
      return [...currentItems, item];
    }, false);
  };

  const handleGoalSaved = async (goal: WebAppGoal) => {
    handleMutation(mutateGoals, goal, 'goalId');
    setIsGoalFormOpen(false);
    
    // Force a complete refresh to get the latest data from the server
    await mutateGoals();
    
    // If the goal is synced with an account, do an additional sync call
    if (goal.isSyncedWithAccount && goal.linkedAccountId) {
      try {
        await fetch(`/api/goals/${goal.goalId}/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        // Refresh again after sync
        await mutateGoals();
      } catch (error) {
        console.warn(`Failed to sync goal ${goal.name} after creation:`, error);
      }
    }
  };

  const syncGoalsWithAccounts = async () => {
    const syncedGoals = goals.filter(goal => goal.isSyncedWithAccount && goal.linkedAccountId);
    
    for (const goal of syncedGoals) {
      try {
        await fetch(`/api/goals/${goal.goalId}/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (error) {
        console.warn(`Failed to sync goal ${goal.name}:`, error);
      }
    }
    
    mutateGoals();
  };

  const syncLoanTrackersWithAccounts = async () => {
    const syncedLoanTrackers = loanTrackers.filter(tracker => tracker.linkedAccountId);
    
    for (const tracker of syncedLoanTrackers) {
      try {
        await fetch(`/api/trackers/loans/${tracker.trackerId}/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (error) {
        console.warn(`Failed to sync loan tracker ${tracker.name}:`, error);
      }
    }
    
    mutateLoanTrackers();
  };

  React.useEffect(() => {
    if (goals.length > 0 && Object.keys(accounts).length > 0) {
      syncGoalsWithAccounts();
    }
  }, [accounts]);

  React.useEffect(() => {
    if (loanTrackers.length > 0 && Object.keys(accounts).length > 0) {
      syncLoanTrackersWithAccounts();
    }
  }, [accounts, loanTrackers.length]);

  const handleLoanTrackerSaved = async (tracker: WebAppLoanTracker) => {
    handleMutation(mutateLoanTrackers, tracker, 'trackerId');
    setIsLoanFormOpen(false);
    
    // Force a complete refresh to get the latest data from the server
    await mutateLoanTrackers();
    
    // If the tracker is linked to an account, do an additional sync call
    if (tracker.linkedAccountId) {
      try {
        await fetch(`/api/trackers/loans/${tracker.trackerId}/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        // Refresh again after sync
        await mutateLoanTrackers();
      } catch (error) {
        console.warn(`Failed to sync loan tracker ${tracker.name} after creation:`, error);
      }
    }
  };



  const handleSavingsTrackerSaved = async (tracker: WebAppSavingsTracker) => {
    handleMutation(mutateSavingsTrackers, tracker, 'trackerId');
    setIsSavingsFormOpen(false);
    
    // Force a complete refresh to get the latest data from the server
    await mutateSavingsTrackers();
  };
  
  const handleEditGoal = (goal: WebAppGoal) => { setEditingGoal(goal); setIsGoalFormOpen(true); };
  const handleEditLoanTracker = (tracker: WebAppLoanTracker) => { setEditingLoanTracker(tracker); setIsLoanFormOpen(true); };
  const handleEditSavingsTracker = (tracker: WebAppSavingsTracker) => { setEditingSavingsTracker(tracker); setIsSavingsFormOpen(true); };

  const handleViewProgress = (tracker: WebAppLoanTracker | WebAppSavingsTracker | WebAppGoal) => { setProgressTracker(tracker); setIsProgressModalOpen(true); };

  const handleDeleteGoal = async () => { if (!goalToDelete) return; await fetch(`/api/goals/${goalToDelete}`, { method: 'DELETE' }); mutateGoals(current => current?.filter(g => g.goalId !== goalToDelete), false); setGoalToDelete(null); };
  const handleDeleteLoanTracker = async () => { 
    if (!loanTrackerToDelete) return; 
    
    const loanTrackerName = loanTrackers.find(t => t.trackerId === loanTrackerToDelete)?.name || 'tracker';
    
    try {
      const response = await fetch(`/api/trackers/loans`, { 
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackerId: loanTrackerToDelete })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to delete loan tracker');
      }
      
      // Optimistically update the UI
      mutateLoanTrackers(current => current?.filter(t => t.trackerId !== loanTrackerToDelete), false);
      
      toast.success(`Loan tracker "${loanTrackerName}" deleted successfully`);
    } catch (error) {
      console.error('Error deleting loan tracker:', error);
      toast.error(`Failed to delete loan tracker: ${(error as Error).message}`);
      // Refresh data to ensure UI is in sync with server
      mutateLoanTrackers();
    }
    
    setLoanTrackerToDelete(null); 
  };
  const handleDeleteSavingsTracker = async () => { 
    if (!savingsTrackerToDelete) return; 
    
    const savingsTrackerName = savingsTrackers.find(t => t.trackerId === savingsTrackerToDelete)?.name || 'tracker';
    
    try {
      const response = await fetch(`/api/trackers/savings?id=${savingsTrackerToDelete}`, { 
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to delete savings tracker');
      }
      
      // Optimistically update the UI
      mutateSavingsTrackers(current => current?.filter(t => t.trackerId !== savingsTrackerToDelete), false);
      
      toast.success(`Savings tracker "${savingsTrackerName}" deleted successfully`);
    } catch (error) {
      console.error('Error deleting savings tracker:', error);
      toast.error(`Failed to delete savings tracker: ${(error as Error).message}`);
      // Refresh data to ensure UI is in sync with server
      mutateSavingsTrackers();
    }
    
    setSavingsTrackerToDelete(null); 
  };
  
  const goalTableColumns = useMemo(() => getGoalColumns(handleEditGoal, (id) => setGoalToDelete(id), (goal) => setGoalToContribute(goal)), []);
  const loanTableColumns = useMemo(() => getLoanColumns(accountsMap, handleEditLoanTracker, (id) => setLoanTrackerToDelete(id), handleViewProgress), [accountsMap]);
  const savingsTableColumns = useMemo(() => getSavingsColumns(accountsMap, handleEditSavingsTracker, (id) => setSavingsTrackerToDelete(id), handleViewProgress), [accountsMap]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <HandCoins className="h-8 w-8 text-primary" /> Goals & Trackers
          </h1>
          <p className="text-muted-foreground mt-1">Manage your financial goals and track your progress.</p>
        </div>
      </div>
      <Tabs defaultValue="goals" className="space-y-6">
        <TabsList>
          <TabsTrigger value="goals"><GoalIcon className="h-4 w-4 mr-2"/>Goals</TabsTrigger>
          <TabsTrigger value="loans"><Landmark className="h-4 w-4 mr-2"/>Loan Trackers</TabsTrigger>
          <TabsTrigger value="savings"><PiggyBank className="h-4 w-4 mr-2"/>Savings Trackers</TabsTrigger>
        </TabsList>
        <TabsContent value="goals">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Financial Goals</CardTitle>
                <CardDescription>Track your progress towards financial milestones.</CardDescription>
              </div>
              <Button onClick={() => { setEditingGoal(null); setIsGoalFormOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" /> New Goal
              </Button>
            </CardHeader>
            <CardContent>
              <GoalsDataTable columns={goalTableColumns} data={goals} isLoading={isGoalsLoading} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="loans">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Loan Repayment Trackers</CardTitle>
                <CardDescription>Monitor your loan repayment progress.</CardDescription>
              </div>
              <Button onClick={() => { setEditingLoanTracker(null); setIsLoanFormOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" /> New Loan Tracker
              </Button>
            </CardHeader>
            <CardContent>
              <LoansDataTable columns={loanTableColumns} data={loanTrackers} isLoading={isLoanTrackersLoading} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="savings">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Savings Trackers</CardTitle>
                <CardDescription>Keep an eye on your savings growth.</CardDescription>
              </div>
              <Button onClick={() => { setEditingSavingsTracker(null); setIsSavingsFormOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" /> New Savings Tracker
              </Button>
            </CardHeader>
            <CardContent>
              <SavingsDataTable columns={savingsTableColumns} data={savingsTrackers} isLoading={isSavingsTrackersLoading} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <GoalForm isOpen={isGoalFormOpen} onOpenChange={(open) => { setIsGoalFormOpen(open); if (!open) setEditingGoal(null); }} onSave={handleGoalSaved} editingGoal={editingGoal} accounts={getAccountsArray()} />
      <LoanTrackerForm isOpen={isLoanFormOpen} onOpenChange={(open) => { setIsLoanFormOpen(open); if (!open) setEditingLoanTracker(null); }} onSave={handleLoanTrackerSaved} editingTracker={editingLoanTracker} accounts={getAccountsArray()} />
      <SavingsTrackerForm isOpen={isSavingsFormOpen} onOpenChange={(open) => { setIsSavingsFormOpen(open); if (!open) setEditingSavingsTracker(null); }} onSave={handleSavingsTrackerSaved} editingTracker={editingSavingsTracker} accounts={getAccountsArray()} />
      <GoalContributionDialog 
        isOpen={!!goalToContribute}
        goal={goalToContribute} 
        accounts={getAccountsArray()} 
        categories={getCategoriesArray()}
        onClose={() => setGoalToContribute(null)} 
        onContributionSaved={() => {
          mutateGoals();
          setGoalToContribute(null);
        }} 
      />

      <ProgressModal open={isProgressModalOpen} onOpenChange={setIsProgressModalOpen} tracker={progressTracker} />
      <AlertDialog open={!!goalToDelete} onOpenChange={(open) => !open && setGoalToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-destructive"/>
            </div>
            <AlertDialogTitle>Delete Goal</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. This will permanently delete your goal.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGoal}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!loanTrackerToDelete} onOpenChange={(open) => !open && setLoanTrackerToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-destructive"/>
            </div>
            <AlertDialogTitle>Delete Loan Tracker</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. This will permanently delete your loan tracker.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLoanTracker}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!savingsTrackerToDelete} onOpenChange={(open) => !open && setSavingsTrackerToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-destructive"/>
            </div>
            <AlertDialogTitle>Delete Savings Tracker</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. This will permanently delete your savings tracker.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSavingsTracker}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 