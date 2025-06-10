// apps/web/src/app/(app)/transactions/TransactionsClientPage.tsx
"use client";

import React, { useState, useMemo } from 'react';
import { PlusCircle, ListOrdered, AlertTriangle, Loader2 } from 'lucide-react';
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
  const [transactions, setTransactions] = useState<WebAppTransaction[]>(initialTransactions);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<WebAppTransaction | null>(null);
  const [transactionToDelete, setTransactionToDelete] = useState<WebAppTransaction | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Re-fetch transactions
  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/transactions');
      if (!response.ok) throw new Error('Failed to fetch transactions.');
      const data = await response.json();
      setTransactions(data.data || []);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddClick = () => {
    setEditingTransaction(null);
    setIsFormOpen(true);
  };

  const handleEditClick = (transaction: WebAppTransaction) => {
    setEditingTransaction(transaction);
    setIsFormOpen(true);
  };

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
      fetchTransactions(); // Refetch to update list
    } catch (error) {
      toast.error((error as Error).message, { id: toastId });
    } finally {
      setTransactionToDelete(null);
    }
  };

  const onSaveSuccess = () => {
    fetchTransactions(); // Refetch data after any save operation
  };
  
  const transactionsWithDetails = useMemo((): TransactionWithDetails[] => {
    const categoriesMap = new Map(categories.map(c => [c.id, c]));
    const accountsMap = new Map(accounts.map(a => [a.accountId, a]));
    
    return transactions.map(t => ({
      ...t,
      category: t.categoryId ? categoriesMap.get(t.categoryId) : null,
      account: accountsMap.get(t.accountId) || null,
    }));
  }, [transactions, categories, accounts]);

  const tableColumns = useMemo(() => columns(handleEditClick, setTransactionToDelete), []);

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
              Your complete history of income and expenses.
            </p>
          </div>
          <Button onClick={handleAddClick}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Transaction
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>
              A detailed list of your recent financial activities.
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
        onSaveSuccess={onSaveSuccess}
      />

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
    </>
  );
}
