"use client";

import React, { useState, useEffect } from 'react';
// Removed Search from imports
import { PlusCircle, Tags, Edit3, Trash2, AlertTriangleIcon, Filter, Grid3X3, List, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// Removed Input import as it was only used for search
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
  // Removed searchTerm state
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
    // Removed search logic: const matchesSearch = category.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || category.type === filterType;
    return matchesFilter; // Only filter by type now
  });

  const incomeCount = categories.filter(cat => cat.type === 'income').length;
  const expenseCount = categories.filter(cat => cat.type === 'expense').length;

  return (
    <>
      {/* Ultra Modern Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 border border-border/30 mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-60" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-accent/20 to-transparent rounded-full -translate-y-48 translate-x-48" />
        <div className="relative p-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-xl">
                <Tags className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent leading-tight">
                  Manage Categories
                </h1>
                <p className="text-lg text-muted-foreground/80 mt-2 max-w-2xl">
                  Organize your financial life with beautiful, customizable categories
                </p>
                <div className="flex items-center gap-4 mt-4">
                  <Badge variant="secondary" className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    {incomeCount} Income
                  </Badge>
                  <Badge variant="secondary" className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    {expenseCount} Expense
                  </Badge>
                </div>
              </div>
            </div>
            <Button 
              onClick={handleAddCategory} 
              size="lg"
              className="h-14 px-8 rounded-2xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-xl hover:shadow-2xl transition-all duration-300 text-base font-semibold"
            >
              <PlusCircle className="mr-3 h-6 w-6" />
              Add New Category
            </Button>
          </div>
        </div>
      </div>

      {/* Modern Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        {/* Search Input Removed */}
        <div className="flex-1"> {/* This div can be removed or repurposed if no other element takes its place */}
        </div>
        <div className="flex gap-3 ml-auto"> {/* Added ml-auto to push filters to the right */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-12 px-6 rounded-2xl border-2">
                <Filter className="mr-2 h-5 w-5" />
                {filterType === 'all' ? 'All Types' : filterType === 'income' ? 'Income' : 'Expense'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl">
              <DropdownMenuLabel>Filter by Type</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setFilterType('all')}>
                All Categories
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType('income')}>
                Income Only
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilterType('expense')}>
                Expense Only
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="h-12 w-12 rounded-2xl border-2"
          >
            {viewMode === 'grid' ? <List className="h-5 w-5" /> : <Grid3X3 className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Categories Display */}
      <Card className="border-2 border-border/30 rounded-3xl overflow-hidden bg-gradient-to-br from-background to-muted/20">
        <CardHeader className="border-b border-border/30 bg-gradient-to-r from-muted/30 to-muted/10">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-primary" />
                Your Categories
              </CardTitle>
              <CardDescription className="text-base mt-2">
                {filteredCategories.length} {filteredCategories.length === 1 ? 'category' : 'categories'} found
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          {filteredCategories.length === 0 && (
            <div className="text-center py-16">
              <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-muted/50 to-muted/30 flex items-center justify-center">
                <Tags className="w-12 h-12 text-muted-foreground/50" />
              </div>
              <h3 className="text-2xl font-bold mb-2">No categories found</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {/* Updated empty state message */}
                {filterType !== 'all' ? 'Try adjusting your filter or ' : 'Get started by '} creating your first category.
              </p>
              <Button onClick={handleAddCategory} size="lg" className="rounded-2xl">
                <PlusCircle className="mr-2 h-5 w-5" />
                Add Your First Category
              </Button>
            </div>
          )}

          {filteredCategories.length > 0 && (
            <>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredCategories.map((category) => {
                    const textColor = category.color ? getContrastingTextColor(category.color) : 'inherit';
                    return (
                      <div 
                        key={category.id} 
                        className={cn(
                          "group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 hover:scale-105 hover:shadow-xl hover:-translate-y-1",
                          category.isSystemCategory 
                            ? "border-muted bg-gradient-to-br from-muted/30 to-muted/10" 
                            : "border-border/30 bg-gradient-to-br from-background to-muted/20 hover:border-primary/30"
                        )}
                      >
                        {/* Background Pattern */}
                        <div 
                          className="absolute inset-0 opacity-10"
                          style={{
                            backgroundColor: category.color || 'transparent',
                            backgroundImage: category.color ? `linear-gradient(135deg, ${category.color}20 0%, transparent 50%)` : undefined
                          }}
                        />
                        
                        <div className="relative p-6">
                          {/* Category Icon */}
                          <div 
                            className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg mb-4 mx-auto transition-transform duration-300 group-hover:scale-110"
                            style={{ backgroundColor: category.color || '#6B7280' }}
                          >
                            <IconRenderer 
                              name={category.icon as AvailableIconName | null} 
                              className="w-8 h-8" 
                              style={{ color: textColor }}
                            />
                          </div>

                          {/* Category Info */}
                          <div className="text-center mb-4">
                            <h3 className="font-bold text-lg mb-2 truncate" title={category.name}>
                              {category.name}
                            </h3>
                            <div className="flex justify-center gap-2">
                              <Badge 
                                variant={category.type === 'income' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {category.type}
                              </Badge>
                              {category.isSystemCategory && (
                                <Badge variant="outline" className="text-xs">
                                  System
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <Button 
                              variant="secondary" 
                              size="sm"
                              onClick={() => handleEditCategory(category)} 
                              disabled={category.isSystemCategory}
                              className="rounded-xl h-9 px-4"
                            >
                              <Edit3 className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setCategoryToDelete(category)} 
                              disabled={category.isSystemCategory}
                              className="rounded-xl h-9 px-4 border-destructive/20 text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          </div>
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
                        className={cn(
                          "group flex items-center justify-between p-6 rounded-2xl border-2 transition-all duration-200 hover:shadow-lg",
                          category.isSystemCategory 
                            ? "border-muted bg-gradient-to-r from-muted/30 to-muted/10" 
                            : "border-border/30 bg-gradient-to-r from-background to-muted/20 hover:border-primary/30"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div 
                            className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
                            style={{ backgroundColor: category.color || '#6B7280' }}
                          >
                            <IconRenderer 
                              name={category.icon as AvailableIconName | null} 
                              className="w-6 h-6" 
                              style={{ color: textColor }}
                            />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg">{category.name}</h3>
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
                        
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEditCategory(category)} 
                            disabled={category.isSystemCategory}
                            className="rounded-xl"
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setCategoryToDelete(category)} 
                            disabled={category.isSystemCategory}
                            className="rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
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
      {isFormModalOpen && (
        <CategoryForm
          isOpen={isFormModalOpen}
          onOpenChange={setIsFormModalOpen}
          categoryToEdit={editingCategory}
          onSaveSuccess={onFormSaveSuccess}
        />
      )}

      {/* Delete Confirmation Modal */}
      {categoryToDelete && (
        <Dialog open={!!categoryToDelete} onOpenChange={() => setCategoryToDelete(null)}>
          <DialogContent className="sm:max-w-md rounded-3xl border-2">
            <DialogHeader className="text-center pb-4">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-destructive/20 to-destructive/10 flex items-center justify-center">
                <AlertTriangleIcon className="h-8 w-8 text-destructive"/>
              </div>
              <DialogTitle className="text-2xl font-bold">Delete Category</DialogTitle>
              <DialogDescription className="text-base mt-2">
                Are you sure you want to delete the category <span className="font-semibold">&quot;{categoryToDelete.name}&quot;</span>? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-3 sm:gap-0 pt-6">
              <Button 
                variant="outline" 
                onClick={() => setCategoryToDelete(null)}
                className="h-12 px-8 rounded-xl border-2"
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteCategory}
                className="h-12 px-8 rounded-xl bg-gradient-to-r from-destructive to-destructive/90 hover:from-destructive/90 hover:to-destructive/80"
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