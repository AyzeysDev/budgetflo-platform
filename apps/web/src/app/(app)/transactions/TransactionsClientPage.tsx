// apps/web/src/app/(app)/transactions/TransactionsClientPage.tsx
"use client";

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ListOrdered, AlertTriangle, Loader2, ChevronLeft, ChevronRight, Plus, Landmark, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { WebAppTransaction } from '@/types/transaction';
import { WebAppAccount } from '@/types/account';
import { WebAppCategory } from '@/types/budget';
import TransactionForm from './TransactionForm';
import { DataTable } from './data-table';
import { columns, TransactionWithDetails } from './columns';
import { MonthYearPicker } from '../budgets/MonthYearPicker';

interface TransactionsClientPageProps {
  initialTransactions: WebAppTransaction[];
  accounts: WebAppAccount[];
  categories: WebAppCategory[];
}

export default function TransactionsClientPage({ 
  initialTransactions, 
  accounts, 
  categories 
}: TransactionsClientPageProps) {
  const router = useRouter();
  const [transactions, setTransactions] = useState<WebAppTransaction[]>(initialTransactions);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<WebAppTransaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<WebAppTransaction | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [period, setPeriod] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 });
  const isInitialMount = useRef(true);
  const [prereqModal, setPrereqModal] = useState({
    open: false,
    title: '',
    description: '',
    ctaLabel: '',
    ctaHref: '',
    icon: <></>
  });

  // Re-fetch transactions
  const fetchTransactions = useCallback(async (year: number, month: number) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/transactions?year=${year}&month=${month}`);
      if (!response.ok) throw new Error('Failed to fetch transactions.');
      const data = await response.json();
      setTransactions(data.data || []);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
        isInitialMount.current = false;
        return;
    }
    fetchTransactions(period.year, period.month);
  }, [period, fetchTransactions]);

  const changeMonth = (direction: 'next' | 'prev') => {
    setPeriod(current => {
        let newMonth = direction === 'next' ? current.month + 1 : current.month - 1;
        let newYear = current.year;
        if (newMonth > 12) {
            newMonth = 1;
            newYear++;
        }
        if (newMonth < 1) {
            newMonth = 12;
            newYear--;
        }
        return { year: newYear, month: newMonth };
    });
  };

  const handleAddClick = () => {
    if (accounts.length === 0) {
      setPrereqModal({
        open: true,
        title: "Create an Account First",
        description: "You need at least one account before you can add a transaction. Accounts help you track where your money comes from and goes to.",
        ctaLabel: "Go to Accounts",
        ctaHref: "/accounts",
        icon: <Landmark className="h-7 w-7 text-primary" />,
      });
      return;
    }

    const hasExpenseCategory = categories.some(c => c.type === 'expense');
    const hasIncomeCategory = categories.some(c => c.type === 'income');

    if (!hasExpenseCategory || !hasIncomeCategory) {
      const missingType = !hasExpenseCategory ? 'expense' : 'income';
      setPrereqModal({
        open: true,
        title: `Create an ${missingType.charAt(0).toUpperCase() + missingType.slice(1)} Category`,
        description: `You need at least one ${missingType} category to add transactions. They help you organize your finances.`,
        ctaLabel: "Go to Categories",
        ctaHref: "/categories",
        icon: <Tag className="h-7 w-7 text-primary" />,
      });
      return;
    }

    setEditingTransaction(null);
    setIsFormOpen(true);
  };

  const handleEditClick = useCallback((transaction: WebAppTransaction) => {
    setEditingTransaction(transaction);
    setIsFormOpen(true);
  }, []);

  const handleDeleteConfirm = async () => {
    if (!transactionToDelete) return;

    const toastId = toast.loading("Deleting transaction...");
    try {
      const response = await fetch(`/api/transactions/${transactionToDelete.transactionId}`, { method: 'DELETE' });
      if (response.status !== 204) {
        const errorData = await response.json().catch(() => ({error: 'Failed to delete transaction.'}));
        throw new Error(errorData.error);
      }
      toast.success("Transaction deleted successfully.", { id: toastId });
      fetchTransactions(period.year, period.month); // Refetch to update list
    } catch (error) {
      toast.error((error as Error).message, { id: toastId });
    } finally {
      setTransactionToDelete(null);
    }
  };

  const onSaveSuccess = () => {
    fetchTransactions(period.year, period.month); // Refetch data after any save operation
    setIsFormOpen(false); // Close the form modal
  };
  
  const transactionsWithDetails = useMemo((): TransactionWithDetails[] => {
    const categoriesMap = new Map(categories.map(c => [c.id, c]));
    const accountsMap = new Map(accounts.map(a => [a.accountId, a]));
    
    // Filter out the 'income' side of transfers to avoid showing two lines for one action.
    // The 'expense' side's description already details the full transfer.
    const filteredTransactions = transactions.filter(t => {
      if (t.source === 'account_transfer' && t.type === 'income') {
        return false;
      }
      return true;
    });

    return filteredTransactions.map(t => ({
      ...t,
      category: t.categoryId ? categoriesMap.get(t.categoryId) : null,
      account: accountsMap.get(t.accountId) || null,
    }));
  }, [transactions, categories, accounts]);

  const tableColumns = useMemo(() => columns(handleEditClick, setTransactionToDelete), [handleEditClick]);

  const selectedPeriodDisplay = useMemo(() => {
    const date = new Date(period.year, period.month - 1, 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  }, [period]);

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <ListOrdered className="h-8 w-8 text-primary" />
              Transactions
            </h1>
            <p className="text-muted-foreground mt-1">
              Your financial history for <span className="font-semibold text-primary">{selectedPeriodDisplay}</span>.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => changeMonth('prev')} disabled={isLoading}><ChevronLeft className="h-4 w-4" /></Button>
            <MonthYearPicker
              currentPeriod={period}
              onPeriodChange={setPeriod}
              disabled={isLoading}
            />
            <Button variant="outline" size="icon" onClick={() => changeMonth('next')} disabled={isLoading}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>
              A detailed list of your financial activities for the selected month.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <DataTable columns={tableColumns} data={transactionsWithDetails} />
            )}
          </CardContent>
        </Card>
      </div>

      <TransactionForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        transactionToEdit={editingTransaction}
        accounts={accounts}
        categories={categories}
        onFormSubmitSuccess={onSaveSuccess}
      />

      {prereqModal.open && (
         <Dialog open={prereqModal.open} onOpenChange={(isOpen) => setPrereqModal(prev => ({ ...prev, open: isOpen }))}>
            <DialogContent>
              <DialogHeader>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  {prereqModal.icon}
                </div>
                <DialogTitle className="text-center text-xl font-bold">{prereqModal.title}</DialogTitle>
                <DialogDescription className="text-center">
                  {prereqModal.description}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-center sm:space-x-2 gap-2 sm:gap-0 pt-4">
                <Button variant="outline" onClick={() => setPrereqModal(prev => ({ ...prev, open: false }))}>Cancel</Button>
                <Button onClick={() => {
                  router.push(prereqModal.ctaHref);
                  setPrereqModal(prev => ({...prev, open: false}));
                }}>{prereqModal.ctaLabel}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
      )}

      {transactionToDelete && (
        <Dialog open={!!transactionToDelete} onOpenChange={() => setTransactionToDelete(null)}>
          <DialogContent>
            <DialogHeader>
               <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-destructive"/>
              </div>
              <DialogTitle>Delete Transaction</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this transaction? This action cannot be undone and will affect your account balances and budgets.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTransactionToDelete(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteConfirm}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Floating Action Button */}
      <Button
        onClick={handleAddClick}
        className="fixed bottom-6 right-6 z-50 h-14 rounded-full shadow-lg flex items-center justify-center gap-2 group md:w-14"
        aria-label="Add new transaction"
      >
        <Plus className="h-6 w-6 text-primary-foreground transition-transform group-hover:rotate-90" />
        <span className="md:hidden pr-2 font-semibold">Add</span>
      </Button>
    </>
  );
}
