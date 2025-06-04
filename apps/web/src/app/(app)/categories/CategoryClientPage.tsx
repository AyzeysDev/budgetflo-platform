"use client";

import React, { useState, useEffect } from 'react';
import { PlusCircle, Tags, Edit3, Trash2, AlertTriangleIcon, Filter, Grid3X3, List } from 'lucide-react';
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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

  const filteredCategories = categories.filter(category => {
    const matchesFilter = filterType === 'all' || category.type === filterType;
    return matchesFilter;
  });

  const incomeCount = categories.filter(cat => cat.type === 'income').length;
  const expenseCount = categories.filter(cat => cat.type === 'expense').length;

  return (
    <>
      {/* Header Section - Exact same structure as dashboard */}
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
          <Button variant="outline" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
            {viewMode === 'grid' ? <List className="mr-2 h-4 w-4" /> : <Grid3X3 className="mr-2 h-4 w-4" />}
            {viewMode === 'grid' ? 'List View' : 'Grid View'}
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

      {/* Categories Display - Using Settings Page Card Style */}
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
        <CardContent className="space-y-3">
          {filteredCategories.length === 0 && (
            <div className="text-center py-8">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-muted flex items-center justify-center">
                <Tags className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-medium mb-1 text-foreground">No categories found</h3>
              <p className="text-xs text-muted-foreground mb-3">
                {filterType !== 'all' ? 'Try adjusting your filter or ' : 'Get started by '} creating your first category.
              </p>
              <Button onClick={handleAddCategory} size="sm" className="text-xs h-8">
                <PlusCircle className="mr-1 h-3 w-3" />
                Add Category
              </Button>
            </div>
          )}

          {filteredCategories.length > 0 && (
            <>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                  {filteredCategories.map((category) => {
                    const textColor = category.color ? getContrastingTextColor(category.color) : 'inherit';
                    return (
                      <div 
                        key={category.id} 
                        className={cn(
                          "group relative p-3 bg-muted/30 rounded-lg border transition-all duration-200 hover:shadow-md",
                          category.isSystemCategory 
                            ? "opacity-75" 
                            : "hover:border-primary/50"
                        )}
                      >
                        <div className="text-center">
                          <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2"
                            style={{ backgroundColor: category.color || '#6B7280' }}
                          >
                            <IconRenderer 
                              name={category.icon as AvailableIconName | null} 
                              className="w-5 h-5" 
                              style={{ color: textColor }}
                            />
                          </div>
                          <h3 className="font-medium text-xs mb-1 truncate text-foreground" title={category.name}>
                            {category.name}
                          </h3>
                          <div className="flex justify-center gap-1">
                            <Badge 
                              variant={category.type === 'income' ? 'default' : 'secondary'}
                              className="text-xs px-1 py-0"
                            >
                              {category.type}
                            </Badge>
                            {category.isSystemCategory && (
                              <Badge variant="outline" className="text-xs px-1 py-0">
                                System
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEditCategory(category)} 
                            disabled={category.isSystemCategory}
                            className="h-6 w-6 p-0 hover:bg-primary/10"
                          >
                            <Edit3 className="w-3 h-3" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setCategoryToDelete(category)} 
                            disabled={category.isSystemCategory}
                            className="h-6 w-6 p-0 hover:bg-destructive/10 text-destructive"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredCategories.map((category) => {
                    const textColor = category.color ? getContrastingTextColor(category.color) : 'inherit';
                    return (
                      <div 
                        key={category.id}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border text-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: category.color || '#6B7280' }}
                          >
                            <IconRenderer 
                              name={category.icon as AvailableIconName | null} 
                              className="w-4 h-4" 
                              style={{ color: textColor }}
                            />
                          </div>
                          <div>
                            <h3 className="font-medium text-foreground">{category.name}</h3>
                            <div className="flex gap-2 mt-1">
                              <Badge 
                                variant={category.type === 'income' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {category.type}
                              </Badge>
                              {category.isSystemCategory && (
                                <Badge variant="outline" className="text-xs">System</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEditCategory(category)} 
                            disabled={category.isSystemCategory}
                            className="h-8 w-8 p-0 hover:bg-primary/10"
                          >
                            <Edit3 className="w-4 h-4 text-muted-foreground" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setCategoryToDelete(category)} 
                            disabled={category.isSystemCategory}
                            className="h-8 w-8 p-0 hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
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