// apps/web/src/app/(app)/categories/CategoryClientPage.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { PlusCircle, Tags, AlertTriangleIcon, Filter, Trash2, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { CategoryDTO } from '@/../../api/src/models/budget.model';
import CategoryForm from './CategoryForm';
import { DataTable } from './data-table';
import { columns } from './columns';
import { cn } from '@/lib/utils';

interface CategoryClientPageProps {
  initialCategories: CategoryDTO[];
}

export default function CategoryClientPage({ initialCategories }: CategoryClientPageProps) {
  const [categories, setCategories] = useState<CategoryDTO[]>(initialCategories);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryDTO | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryDTO | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [deleteAction, setDeleteAction] = useState<'delete' | 'transfer'>('delete');
  const [transferTargetId, setTransferTargetId] = useState<string | null>(null);

  useEffect(() => {
    setCategories([...initialCategories].sort((a, b) => a.name.localeCompare(b.name)));
  }, [initialCategories]);

  const handleAddCategory = () => {
    setEditingCategory(null);
    setIsFormModalOpen(true);
  };

  const handleEditCategory = (category: CategoryDTO) => {
    setEditingCategory(category);
    setIsFormModalOpen(true);
  };
  
  const handleOpenDeleteModal = (category: CategoryDTO) => {
    setDeleteAction('delete');
    setTransferTargetId(null);
    setCategoryToDelete(category);
  }

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;
    
    if (deleteAction === 'transfer' && !transferTargetId) {
      toast.error("Please select a category to transfer transactions to.");
      return;
    }
    
    const toastId = `delete-${categoryToDelete.id}`;
    toast.loading(`Deleting category: ${categoryToDelete.name}...`, { id: toastId });
    
    const payload = {
        action: deleteAction,
        targetCategoryId: deleteAction === 'transfer' ? transferTargetId : undefined,
    };

    try {
      const response = await fetch(`/api/categories/${categoryToDelete.id}`, { 
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }); 

      if (!response.ok) {
        if (response.status !== 204) {
            const errorData = await response.json().catch(() => ({ error: "Failed to delete category" }));
            throw new Error(errorData.error || "Operation failed");
        }
      }

      toast.success(`Category "${categoryToDelete.name}" handled successfully.`, { id: toastId });
      setCategories(prev => prev.filter(cat => cat.id !== categoryToDelete.id));
    } catch (error) {
      toast.error((error as Error).message, { id: toastId });
    } finally {
      setCategoryToDelete(null);
      setTransferTargetId(null);
    }
  };

  const onFormSaveSuccess = (savedCategory: CategoryDTO) => {
    if (editingCategory) { 
      setCategories(prev => 
        prev.map(cat => cat.id === savedCategory.id ? savedCategory : cat)
            .sort((a, b) => a.name.localeCompare(b.name))
      );
    } else { 
      setCategories(prev => [...prev, savedCategory].sort((a, b) => a.name.localeCompare(b.name)));
    }
    setIsFormModalOpen(false);
    setEditingCategory(null);
  };

  const filteredCategories = useMemo(() => {
    if (filterType === 'all') return categories;
    return categories.filter(category => category.type === filterType);
  }, [categories, filterType]);

  const tableColumns = useMemo(() => columns(handleEditCategory, handleOpenDeleteModal), []);

  const incomeCount = useMemo(() => categories.filter(cat => cat.type === 'income').length, [categories]);
  const expenseCount = useMemo(() => categories.filter(cat => cat.type === 'expense').length, [categories]);

  const transferCandidateCategories = useMemo(() => {
    if (!categoryToDelete) return [];
    return categories.filter(c => c.type === categoryToDelete.type && c.id !== categoryToDelete.id);
  }, [categoryToDelete, categories]);


  return (
    <>
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight flex items-center">
             <Tags className="mr-3 h-8 w-8 text-primary" />
            Manage Categories
          </h1>
          <p className="text-md text-muted-foreground mt-1">
            Organize your financial life with custom categories.
          </p>
          <div className="flex items-center gap-3 mt-3">
            <Badge variant="secondary" className="text-xs">
              <div className="w-2 h-2 rounded-full bg-green-500 mr-1.5" />
              {incomeCount} Income
            </Badge>
            <Badge variant="secondary" className="text-xs">
              <div className="w-2 h-2 rounded-full bg-red-500 mr-1.5" />
              {expenseCount} Expense
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleAddCategory}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Category
          </Button>
        </div>
      </div>
      
      {/* Controls & Table Card */}
      <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
                <CardTitle>Your Categories</CardTitle>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 px-3 text-xs">
                        <Filter className="mr-1 h-3 w-3" />
                        {filterType === 'all' ? 'All Types' : filterType === 'income' ? 'Income' : 'Expense'}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuLabel className="text-xs">Filter by Type</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setFilterType('all')} className="text-xs">
                        All Categories
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setFilterType('income')} className="text-xs">
                        Income Only
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setFilterType('expense')} className="text-xs">
                        Expense Only
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <CardDescription>
              A list of your income and expense categories for budget tracking.
            </CardDescription>
          </CardHeader>
          <CardContent>
             <DataTable columns={tableColumns} data={filteredCategories} />
          </CardContent>
      </Card>
      
      {/* Category Form Modal */}
      <CategoryForm
        isOpen={isFormModalOpen}
        onOpenChange={setIsFormModalOpen}
        categoryToEdit={editingCategory}
        onSaveSuccess={onFormSaveSuccess}
      />

      {/* Delete Confirmation Modal */}
      {categoryToDelete && (
        <Dialog open={!!categoryToDelete} onOpenChange={() => setCategoryToDelete(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
                <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
                    <AlertTriangleIcon className="h-7 w-7 text-destructive"/>
                </div>
                <DialogTitle className="text-xl font-bold text-center">Delete Category &quot;{categoryToDelete.name}&quot;</DialogTitle>
                <DialogDescription className="text-center pt-1">
                    This category has transactions linked to it. How should we handle them?
                </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-3">
                <button onClick={() => setDeleteAction('delete')} className={cn("w-full p-4 border rounded-lg text-left transition-all", deleteAction === 'delete' ? 'border-destructive bg-destructive/5' : 'border-border hover:bg-muted/50')}>
                    <div className="flex items-start gap-3">
                        <Trash2 className="h-5 w-5 mt-0.5 text-destructive" />
                        <div>
                            <p className="font-semibold">Delete all transactions</p>
                            <p className="text-sm text-muted-foreground">Permanently remove this category and all of its associated transactions from your records.</p>
                        </div>
                    </div>
                </button>
                <button 
                  onClick={() => setDeleteAction('transfer')} 
                  disabled={transferCandidateCategories.length === 0}
                  className={cn(
                    "w-full p-4 border rounded-lg text-left transition-all", 
                    deleteAction === 'transfer' ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50',
                    transferCandidateCategories.length === 0 && 'opacity-50 cursor-not-allowed'
                  )}
                >
                    <div className="flex items-start gap-3">
                        <ArrowRightLeft className="h-5 w-5 mt-0.5 text-primary" />
                        <div>
                            <p className="font-semibold">Transfer transactions</p>
                            <p className="text-sm text-muted-foreground">Move all associated transactions to another category.</p>
                        </div>
                    </div>
                </button>

                {deleteAction === 'transfer' && (
                  <div className="pl-12 pt-2">
                    {transferCandidateCategories.length > 0 ? (
                      <Select onValueChange={setTransferTargetId} value={transferTargetId || undefined}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a new category..." />
                        </SelectTrigger>
                        <SelectContent>
                          {transferCandidateCategories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-xs text-destructive-foreground bg-destructive/80 p-2 rounded-md">
                        No other '{categoryToDelete.type}' categories available to transfer to.
                      </p>
                    )}
                  </div>
                )}
            </div>
            
            <DialogFooter className="gap-2 sm:gap-3">
              <Button variant="outline" onClick={() => setCategoryToDelete(null)}>Cancel</Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteCategory}
                disabled={(deleteAction === 'transfer' && !transferTargetId)}
              >
                Confirm Action
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
