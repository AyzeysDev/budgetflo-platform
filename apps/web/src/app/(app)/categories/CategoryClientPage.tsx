"use client";

import React, { useState, useEffect } from 'react';
import { PlusCircle, Tags, Edit3, Trash2, AlertTriangleIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { CategoryDTO } from '@/../../api/src/models/budget.model';
import CategoryForm from './CategoryForm'; 
import { IconRenderer, getContrastingTextColor, AvailableIconName } from './categoryUtils'; // Added AvailableIconName import
import { cn } from '@/lib/utils';

interface CategoryClientPageProps {
  initialCategories: CategoryDTO[];
}

export default function CategoryClientPage({ initialCategories }: CategoryClientPageProps) {
  const [categories, setCategories] = useState<CategoryDTO[]>(initialCategories);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryDTO | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryDTO | null>(null);

  useEffect(() => {
    // Sort categories alphabetically by name for consistent display
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
        if (response.status !== 204) { // 204 No Content is a success for DELETE
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
            .sort((a, b) => a.name.localeCompare(b.name)) // Re-sort after update
      );
    } else { 
      setCategories(prev => [...prev, savedCategory].sort((a, b) => a.name.localeCompare(b.name)));
    }
    setIsFormModalOpen(false);
    setEditingCategory(null);
  };
  
  const displayedCategories = categories;

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight flex items-center">
            <Tags className="mr-3 h-8 w-8 text-primary" /> Manage Categories
          </h1>
          <p className="text-md text-muted-foreground mt-1">
            Organize your income and expenses with custom categories.
          </p>
        </div>
        <Button onClick={handleAddCategory} size="lg">
          <PlusCircle className="mr-2 h-5 w-5" /> Add New Category
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Categories</CardTitle>
          <CardDescription>
            {`You have ${displayedCategories.length} categor${displayedCategories.length === 1 ? 'y' : 'ies'}.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {displayedCategories.length === 0 && (
            <div className="text-center py-8">
              <Tags className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No categories yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Get started by adding your first category.
              </p>
              <Button onClick={handleAddCategory} className="mt-4">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Category
              </Button>
            </div>
          )}
          {displayedCategories.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {displayedCategories.map((category) => {
                const textColor = category.color ? getContrastingTextColor(category.color) : 'inherit';
                return (
                <div 
                    key={category.id} 
                    className={cn(
                        "flex flex-col items-center justify-center p-4 rounded-lg border text-center aspect-square transition-all hover:shadow-md",
                        category.isSystemCategory ? "bg-muted/30" : "bg-card"
                    )}
                    style={category.color && !category.isSystemCategory ? { backgroundColor: category.color } : {}}
                >
                  <IconRenderer 
                    name={category.icon as AvailableIconName | null} 
                    className="h-8 w-8 mb-2" 
                    style={{ color: textColor }}
                  />
                  <p 
                    className="font-semibold text-sm truncate w-full" 
                    style={{ color: textColor }}
                    title={category.name}
                  >
                    {category.name}
                  </p>
                  <span 
                    className={cn(
                        "text-xs px-1.5 py-0.5 rounded-full mt-1",
                        category.type === 'income' 
                            ? (category.color && !category.isSystemCategory ? 'bg-white/20' : 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300')
                            : (category.color && !category.isSystemCategory ? 'bg-black/10' : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300')
                    )}
                    style={category.color && !category.isSystemCategory ? { color: textColor, borderColor: textColor } : {}}
                  >
                    {category.type}
                  </span>
                  {category.isSystemCategory && (
                    <span className="text-xs mt-1 px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                        System
                    </span>
                  )}
                  <div className="mt-auto pt-2 space-x-1">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className={cn("h-7 w-7", category.color && !category.isSystemCategory ? "hover:bg-white/20" : "hover:bg-accent")}
                        style={{color: textColor}}
                        onClick={() => handleEditCategory(category)} 
                        title="Edit category" 
                        disabled={category.isSystemCategory}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className={cn("h-7 w-7", category.color && !category.isSystemCategory ? "hover:bg-white/20 text-red-500 dark:text-red-400" : "hover:bg-accent text-destructive")}
                        style={category.color && !category.isSystemCategory ? {color: getContrastingTextColor(category.color) === '#FFFFFF' ? '#FFCDD2' : '#EF5350' } : {}}
                        onClick={() => setCategoryToDelete(category)} 
                        title="Delete category" 
                        disabled={category.isSystemCategory}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )})}
            </div>
          )}
        </CardContent>
      </Card>

      {isFormModalOpen && (
        <CategoryForm
          isOpen={isFormModalOpen}
          onOpenChange={setIsFormModalOpen}
          categoryToEdit={editingCategory}
          onSaveSuccess={onFormSaveSuccess}
        />
      )}

      {categoryToDelete && (
        <Dialog open={!!categoryToDelete} onOpenChange={() => setCategoryToDelete(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <AlertTriangleIcon className="h-5 w-5 mr-2 text-destructive"/> Confirm Deletion
              </DialogTitle>
              <DialogDescription>
                {/* FIXED: Proper template literal syntax */}
                Are you sure you want to delete the category &quot;{categoryToDelete.name}&quot;? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setCategoryToDelete(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteCategory}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}