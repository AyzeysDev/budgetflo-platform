'use client';

import React, { useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import useSWR, { KeyedMutator } from 'swr';
import { Plus, Goal as GoalIcon, HandCoins, Landmark, PiggyBank } from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

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
import LoanPaymentDialog from './components/LoanPaymentDialog';
import ProgressModal from './components/ProgressModal';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function GoalsTrackersClientPage() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const { data: goals = [], mutate: mutateGoals } = useSWR<WebAppGoal[]>(userId ? `/api/goals` : null, fetcher);
  const { data: loanTrackers = [], mutate: mutateLoanTrackers } = useSWR<WebAppLoanTracker[]>(userId ? `/api/trackers/loans` : null, fetcher);
  const { data: savingsTrackers = [], mutate: mutateSavingsTrackers } = useSWR<WebAppSavingsTracker[]>(userId ? `/api/trackers/savings` : null, fetcher);
  const { data: categories = {} } = useSWR<Record<string, WebAppCategory[]>>(userId ? '/api/categories' : null, fetcher);
  const { data: accounts = {} } = useSWR<Record<string, WebAppAccount[]>>(userId ? '/api/accounts' : null, fetcher);

  const [isGoalFormOpen, setIsGoalFormOpen] = useState(false);
  const [isLoanFormOpen, setIsLoanFormOpen] = useState(false);
  const [isSavingsFormOpen, setIsSavingsFormOpen] = useState(false);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);

  const [editingGoal, setEditingGoal] = useState<WebAppGoal | null>(null);
  const [editingLoanTracker, setEditingLoanTracker] = useState<WebAppLoanTracker | null>(null);
  const [editingSavingsTracker, setEditingSavingsTracker] = useState<WebAppSavingsTracker | null>(null);
  const [progressTracker, setProgressTracker] = useState<WebAppLoanTracker | WebAppSavingsTracker | WebAppGoal | null>(null);
  
  const [goalToContribute, setGoalToContribute] = useState<WebAppGoal | null>(null);
  const [loanToRecordPayment, setLoanToRecordPayment] = useState<WebAppLoanTracker | null>(null);

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

  const handleGoalSaved = (goal: WebAppGoal) => {
    handleMutation(mutateGoals, goal, 'goalId');
    setIsGoalFormOpen(false);
  };

  const handleLoanTrackerSaved = (tracker: WebAppLoanTracker) => {
    handleMutation(mutateLoanTrackers, tracker, 'trackerId');
    setIsLoanFormOpen(false);
  };

  const handleLoanPaymentSaved = (tracker: WebAppLoanTracker) => {
    handleMutation(mutateLoanTrackers, tracker, 'trackerId');
    setLoanToRecordPayment(null);
  };

  const handleSavingsTrackerSaved = (tracker: WebAppSavingsTracker) => {
    handleMutation(mutateSavingsTrackers, tracker, 'trackerId');
    setIsSavingsFormOpen(false);
  };
  
  const handleEditGoal = (goal: WebAppGoal) => { setEditingGoal(goal); setIsGoalFormOpen(true); };
  const handleEditLoanTracker = (tracker: WebAppLoanTracker) => { setEditingLoanTracker(tracker); setIsLoanFormOpen(true); };
  const handleEditSavingsTracker = (tracker: WebAppSavingsTracker) => { setEditingSavingsTracker(tracker); setIsSavingsFormOpen(true); };

  const handleViewProgress = (tracker: WebAppLoanTracker | WebAppSavingsTracker | WebAppGoal) => { setProgressTracker(tracker); setIsProgressModalOpen(true); };

  const handleDeleteGoal = async () => { if (!goalToDelete) return; await fetch(`/api/goals/${goalToDelete}`, { method: 'DELETE' }); mutateGoals(current => current?.filter(g => g.goalId !== goalToDelete), false); setGoalToDelete(null); };
  const handleDeleteLoanTracker = async () => { if (!loanTrackerToDelete) return; await fetch(`/api/trackers/loans?id=${loanTrackerToDelete}`, { method: 'DELETE' }); mutateLoanTrackers(current => current?.filter(t => t.trackerId !== loanTrackerToDelete), false); setLoanTrackerToDelete(null); };
  const handleDeleteSavingsTracker = async () => { if (!savingsTrackerToDelete) return; await fetch(`/api/trackers/savings?id=${savingsTrackerToDelete}`, { method: 'DELETE' }); mutateSavingsTrackers(current => current?.filter(t => t.trackerId !== savingsTrackerToDelete), false); setSavingsTrackerToDelete(null); };
  
  const goalTableColumns = useMemo(() => getGoalColumns(handleEditGoal, (id) => setGoalToDelete(id), (goal) => setGoalToContribute(goal)), []);
  const loanTableColumns = useMemo(() => getLoanColumns(accountsMap, handleEditLoanTracker, (id) => setLoanTrackerToDelete(id), handleViewProgress, (tracker) => setLoanToRecordPayment(tracker)), [accountsMap]);
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
        <TabsContent value="goals"><Card><CardHeader className="flex flex-row items-center justify-between"><div><CardTitle>Financial Goals</CardTitle><CardDescription>Track your progress towards financial milestones.</CardDescription></div><Button onClick={() => { setEditingGoal(null); setIsGoalFormOpen(true); }}><Plus className="h-4 w-4 mr-2" /> New Goal</Button></CardHeader><CardContent><GoalsDataTable columns={goalTableColumns} data={goals} /></CardContent></Card></TabsContent>
        <TabsContent value="loans"><Card><CardHeader className="flex flex-row items-center justify-between"><div><CardTitle>Loan Repayment Trackers</CardTitle><CardDescription>Monitor your loan repayment progress.</CardDescription></div><Button onClick={() => { setEditingLoanTracker(null); setIsLoanFormOpen(true); }}><Plus className="h-4 w-4 mr-2" /> New Loan Tracker</Button></CardHeader><CardContent><LoansDataTable columns={loanTableColumns} data={loanTrackers} /></CardContent></Card></TabsContent>
        <TabsContent value="savings"><Card><CardHeader className="flex flex-row items-center justify-between"><div><CardTitle>Savings Trackers</CardTitle><CardDescription>Keep an eye on your savings growth.</CardDescription></div><Button onClick={() => { setEditingSavingsTracker(null); setIsSavingsFormOpen(true); }}><Plus className="h-4 w-4 mr-2" /> New Savings Tracker</Button></CardHeader><CardContent><SavingsDataTable columns={savingsTableColumns} data={savingsTrackers} /></CardContent></Card></TabsContent>
      </Tabs>
      <GoalForm isOpen={isGoalFormOpen} onOpenChange={(open) => { setIsGoalFormOpen(open); if (!open) setEditingGoal(null); }} onSave={handleGoalSaved} editingGoal={editingGoal} categories={getCategoriesArray()} accounts={getAccountsArray()} />
      <LoanTrackerForm isOpen={isLoanFormOpen} onOpenChange={(open) => { setIsLoanFormOpen(open); if (!open) setEditingLoanTracker(null); }} onSave={handleLoanTrackerSaved} editingTracker={editingLoanTracker} accounts={getAccountsArray()} />
      <SavingsTrackerForm isOpen={isSavingsFormOpen} onOpenChange={(open) => { setIsSavingsFormOpen(open); if (!open) setEditingSavingsTracker(null); }} onSave={handleSavingsTrackerSaved} editingTracker={editingSavingsTracker} accounts={getAccountsArray()} />
      {goalToContribute && (<GoalContributionDialog goal={goalToContribute} accounts={getAccountsArray()} onClose={() => setGoalToContribute(null)} onContributionSaved={(updatedGoal: WebAppGoal) => { handleMutation(mutateGoals, updatedGoal, 'goalId'); setGoalToContribute(null); }} /> )}
      {loanToRecordPayment && (<LoanPaymentDialog tracker={loanToRecordPayment} onClose={() => setLoanToRecordPayment(null)} onPaymentSaved={handleLoanPaymentSaved} />)}
      <ProgressModal open={isProgressModalOpen} onOpenChange={setIsProgressModalOpen} tracker={progressTracker} />
      <AlertDialog open={!!goalToDelete} onOpenChange={(open) => !open && setGoalToDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete your goal.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteGoal}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={!!loanTrackerToDelete} onOpenChange={(open) => !open && setLoanTrackerToDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete your loan tracker.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteLoanTracker}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <AlertDialog open={!!savingsTrackerToDelete} onOpenChange={(open) => !open && setSavingsTrackerToDelete(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete your savings tracker.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteSavingsTracker}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
} 