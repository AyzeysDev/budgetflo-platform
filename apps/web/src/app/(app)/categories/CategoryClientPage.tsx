"use client";

import React, { useState, useEffect } from 'react';
import { PlusCircle, Tags, Edit3, Trash2, AlertTriangleIcon, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { IconRenderer, getContrastingTextColor, AvailableIconName } from './categoryUtils';
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

  // Dummy handler for budget inclusion (no API call yet)
  const handleToggleBudgetInclusion = (categoryId: string, includeInBudget: boolean) => {
    // Update local state only for now
    setCategories(prev => 
      prev.map(cat => 
        cat.id === categoryId 
          ? { ...cat, includeInBudget } 
          : cat
      )
    );
    
    // Show feedback
    toast.success(`Category ${includeInBudget ? 'included in' : 'excluded from'} budget (demo)`);
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

  const filteredCategories = categories.filter(category => {
    const matchesFilter = filterType === 'all' || category.type === filterType;
    return matchesFilter;
  });

  const incomeCount = categories.filter(cat => cat.type === 'income').length;
  const expenseCount = categories.filter(cat => cat.type === 'expense').length;

  return (
    <>
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
            Manage Categories
          </h1>
          <p className="text-md text-muted-foreground mt-1">
            Organize your financial life with custom categories.
          </p>
          <div className="flex items-center gap-3 mt-3">
            <Badge variant="secondary" className="text-xs">
              <div className="w-2 h-2 rounded-full bg-green-500 mr-1" />
              {incomeCount} Income
            </Badge>
            <Badge variant="secondary" className="text-xs">
              <div className="w-2 h-2 rounded-full bg-red-500 mr-1" />
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

      {/* Controls */}
      <div className="flex justify-start items-center mb-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 px-3 text-xs">
              <Filter className="mr-1 h-3 w-3" />
              {filterType === 'all' ? 'All Types' : filterType === 'income' ? 'Income' : 'Expense'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-36">
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

      {/* Categories Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tags className="h-6 w-6 text-primary" />
            Your Categories
          </CardTitle>
          <CardDescription>
            {filteredCategories.length} {filteredCategories.length === 1 ? 'category' : 'categories'} found
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          {filteredCategories.length === 0 && (
            <div className="text-center py-12">
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-muted flex items-center justify-center">
                <Tags className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2 text-foreground">No categories found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {filterType !== 'all' ? 'Try adjusting your filter or ' : 'Get started by '} creating your first category.
              </p>
              <Button onClick={handleAddCategory}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            </div>
          )}

          {filteredCategories.length > 0 && (
            <div className="space-y-0">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-border bg-muted/50 rounded-t-lg">
                <div className="col-span-1 text-xs font-medium text-muted-foreground">
                  Icon
                </div>
                <div className="col-span-4 text-xs font-medium text-muted-foreground">
                  Name
                </div>
                <div className="col-span-2 text-xs font-medium text-muted-foreground">
                  Type
                </div>
                <div className="col-span-3 text-xs font-medium text-muted-foreground">
                  Include in Budget?
                </div>
                <div className="col-span-2 text-xs font-medium text-muted-foreground">
                  Actions
                </div>
              </div>
              
              {/* Table Rows */}
              {filteredCategories.map((category, index) => {
                const textColor = category.color ? getContrastingTextColor(category.color) : 'inherit';
                // Default to true if includeInBudget is undefined
                const isIncludedInBudget = category.includeInBudget !== false;
                
                return (
                  <div 
                    key={category.id}
                    className={cn(
                      "grid grid-cols-12 gap-3 px-4 py-3 border-b border-border/50 hover:bg-muted/30 transition-colors duration-150",
                      index === filteredCategories.length - 1 && "border-b-0 rounded-b-lg"
                    )}
                  >
                    {/* Icon */}
                    <div className="col-span-1 flex items-center">
                      <div 
                        className="w-7 h-7 rounded-md flex items-center justify-center shadow-sm"
                        style={{ backgroundColor: category.color || '#6B7280' }}
                      >
                        <IconRenderer 
                          name={category.icon as AvailableIconName | null} 
                          className="w-4 h-4" 
                          style={{ color: textColor }}
                        />
                      </div>
                    </div>
                    
                    {/* Name */}
                    <div className="col-span-4 flex items-center">
                      <div className="flex flex-col">
                        <span className="font-medium text-sm text-foreground">{category.name}</span>
                        {category.isSystemCategory && (
                          <Badge variant="outline" className="text-xs w-fit mt-1">
                            System Category
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Type */}
                    <div className="col-span-2 flex items-center">
                      <Badge 
                        variant={category.type === 'income' ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {category.type}
                      </Badge>
                    </div>
                    
                    {/* Include in Budget */}
                    <div className="col-span-3 flex items-center">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`budget-${category.id}`}
                          checked={isIncludedInBudget}
                          onCheckedChange={(checked) => 
                            handleToggleBudgetInclusion(category.id, checked as boolean)
                          }
                          disabled={category.isSystemCategory}
                          className="h-4 w-4"
                        />
                        <label 
                          htmlFor={`budget-${category.id}`}
                          className="text-xs text-muted-foreground cursor-pointer select-none"
                        >
                          {isIncludedInBudget ? 'Yes' : 'No'}
                        </label>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="col-span-2 flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEditCategory(category)} 
                        disabled={category.isSystemCategory}
                        className="h-8 w-8 p-0 hover:bg-primary/10"
                        title="Edit category"
                      >
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setCategoryToDelete(category)} 
                        disabled={category.isSystemCategory}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Delete category"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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