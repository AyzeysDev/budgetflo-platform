// apps/web/src/app/(app)/categories/CategoryClientPage.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { PlusCircle, Tags, AlertTriangleIcon, Filter } from 'lucide-react';
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
import { toast } from "sonner";
import type { CategoryDTO } from '@/../../api/src/models/budget.model';
import CategoryForm from './CategoryForm';
import { DataTable } from './data-table';
import { columns } from './columns';

interface CategoryClientPageProps {
  initialCategories: CategoryDTO[];
}

export default function CategoryClientPage({ initialCategories }: CategoryClientPageProps) {
  const [categories, setCategories] = useState<CategoryDTO[]>(initialCategories);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryDTO | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryDTO | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

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

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;
    
    const toastId = `delete-${categoryToDelete.id}`;
    toast.loading(`Deleting category: ${categoryToDelete.name}...`, { id: toastId });
    try {
      const response = await fetch(`/api/categories/${categoryToDelete.id}`, { method: 'DELETE' }); 
      if (!response.ok) {
        if (response.status !== 204) {
            const errorData = await response.json().catch(() => ({ error: "Failed to delete category" }));
            throw new Error(errorData.error || "Operation failed");
        }
      }
      toast.success(`Category "${categoryToDelete.name}" deleted.`, { id: toastId });
      setCategories(prev => prev.filter(cat => cat.id !== categoryToDelete.id));
    } catch (error) {
      toast.error((error as Error).message, { id: toastId });
    } finally {
      setCategoryToDelete(null);
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

  const tableColumns = useMemo(() => columns(handleEditCategory, setCategoryToDelete), []);

  const incomeCount = useMemo(() => categories.filter(cat => cat.type === 'income').length, [categories]);
  const expenseCount = useMemo(() => categories.filter(cat => cat.type === 'expense').length, [categories]);

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
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-destructive/10 flex items-center justify-center">
                <AlertTriangleIcon className="h-6 w-6 text-destructive"/>
              </div>
              <DialogTitle className="text-lg font-semibold text-center">Delete Category</DialogTitle>
              <DialogDescription className="text-center">
                Are you sure you want to delete <span className="font-medium">&quot;{categoryToDelete.name}&quot;</span>? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-3">
              <Button 
                variant="outline" 
                onClick={() => setCategoryToDelete(null)}
                className="h-9 px-4 text-sm"
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteCategory}
                className="h-9 px-4 text-sm"
              >
                Delete Category
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
